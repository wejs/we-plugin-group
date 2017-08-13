module.exports = {
  find(req, res) {
    let membersJoinRequired = false;

    if (req.isAuthenticated()) {

      if (req.query.my === true || req.query.my == 'true') {
        // find user groups
        membersJoinRequired = true;
        res.locals.showUserGroups = true;
      } else if(req.query.my === false || req.query.my == 'false') {
        // find new groups to user
        res.locals.query.where.$and = [
          [' members.id IS NULL ', []],
          { privacity: 'public' }
        ];

        res.locals.showNewGroups = true;
      } else {
        // find user groups and new groups
        res.locals.query.where.$or = [
          [' members.id IS NOT NULL ', []],
          { privacity: 'public' }
        ];

        res.locals.showAllGroups = true;
      }

      res.locals.query.include.push({
        model: req.we.db.models.user, as: 'members',
        required: membersJoinRequired,
        where: {
          id: req.user.id
        }
      });
    } else {
      res.locals.query.where.privacity = 'public';
    }

    res.locals.Model.findAll(res.locals.query)
    .then( (records)=> {

      res.locals.data = records;

      res.locals.Model.count(res.locals.query)
      .then( (count)=> {
        res.locals.metadata.count = count;

        res.ok();
        return null;
      })
      .catch(res.queryError);

      return null;
    })
    .catch(res.queryError);
  },

  findNewGroupsToUser(req, res, next) {
    if (!req.params.userId) return next();

    res.locals.query.include.push({
      model: req.we.db.models.user , as: 'members', required: true,
      where: {
        id: { $ne: req.params.userId }
      }
    });

    res.locals.Model.findAll(res.locals.query)
    .then( (record)=> {
      res.locals.Model.count(res.locals.query).then( (count)=> {
        res.locals.metadata.count = count;
        res.locals.data = record;
        res.ok();
        return null;
      })
      .catch( (err)=> {
        res.serverError(err);
        return null;
      });
      return null;
    })
    .catch(res.queryError);
  },

  join(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    if (res.locals.membership) {
      // already are member
      res.addMessage('warning', {
        text: 'group.join.already.member',
        vars :{
          group: group
        }
      });

      return res.goTo( res.locals.redirectTo || '/group/'+res.locals.group.id );
    }

    const group = res.locals.group;

    res.locals.group.userJoin(req.user.id, (err, membership)=> {
      if (err) return res.serverError(err);
      // delete invites for user in group
      req.we.db.models.membershipinvite
      .spentInvite(group.id, req.user.email, req.user.id)
      .then( ()=> {

        if (res.locals.group.privacity != 'public') {
          if (res.locals.redirectTo) {
            return res.goTo( res.locals.redirectTo );
          } else {
            return res.status(200).send({
              membershiprequest: membership
            });
          }
        }
        // add message
        res.addMessage('success', {
          text: 'group.join.success',
          vars :{
            group: group
          }
        });

        req.we.db.models.follow.follow('group', res.locals.group.id, req.user.id, (err, follow)=> {
          if (err) return res.serverError(err);

          if (res.locals.redirectTo) {
            res.goTo( res.locals.redirectTo );
          } else {
            res.status(200).send({
              membership: membership,
              follow: follow
            });
          }
        });
      })
      .catch(res.queryError);

    });
  },

  leave(req, res) {
    if (!req.isAuthenticated) return res.forbidden();


    res.locals.group.checkIfMemberIslastmanager(req.user.id, (err, isLastManager)=> {
      if (err) return res.serverError(err);

      if (isLastManager) {
        // add message
        res.addMessage('warning', {
          text: 'group.member.leave.last.member',
          vars :{
            group: res.locals.group,
            user: req.user
          }
        });

        if (res.locals.redirectTo) {
          return res.goTo( res.locals.redirectTo );
        } else {
          return res.ok();
        }
      }

      res.locals.group.userLeave(req.user.id, (err)=> {
        if (err) return res.serverError(err);

        if (res.locals.redirectTo) {
          res.goTo( res.locals.redirectTo );
        } else {
          res.status(204).send();
        }
      });
    });
  },

  inviteMember(req, res) {
    if (!req.isAuthenticated) return res.forbidden();

    const we = req.we;

    let userId = null,
      membership = null;

    req.we.utils.async.series([
      function checkIfUserAreInRegistered(done) {
        we.db.models.user.find({
          where: {
            email: req.body.email
          }
        })
        .then( (u)=> {
          if (u) userId = u.id;
          done();
          return null;
        })
        .catch(done);
      },
      function checkIfUserIsMember(done) {
        if (!userId) return done();
        res.locals.group.findOneMember(userId, (err, m)=> {
          if (err) return done(err);
          membership = m;
          done();

          return null;
        });
      }
    ], (err)=> {
      if (err) return res.serverError(err);

      if (membership) {
        return res.status(200).send({
          membership: membership
        });
      }

      res.locals.group.inviteMember(req.user.id, userId,
        req.body.name, req.body.text, req.body.email, (err, membership)=> {
        if (err) return res.serverError(err);

        we.db.models.follow.follow('group', res.locals.group.id, req.user.id, (err, follow)=> {
          if (err) return res.serverError(err);
          if (!follow) return res.forbidden();

          const templateVariables = {
            group: res.locals.group,
            inviter: req.user,
            invite: membership,
            we: we
          };

          return we.email.sendEmail('GroupInvite', {
              subject: req.__('we.email.groupInvite.subject', templateVariables),
              to: req.body.email
            },
            templateVariables,
          function (err) {
            if (err) {
              we.log.error('Action:group:invite:email:', err);
            }

            return res.status(200).send({
              membershipinvite: membership
            });
          });
        });
      })
    })
  },

  acceptInvite(req, res) {
    if (!req.isAuthenticated) return res.forbidden();
    const we = req.getWe();

    we.db.models.membershipinvite.find({
      where: {
        userId: req.user.id,
        groupId: req.params.groupId
      }
    })
    .then( (membershiprequest)=> {
      if (!membershiprequest) return res.notFound();

      res.locals.group.addMember(req.user.id, 'member', (err, membership)=> {
        if(err) return res.serverError(err);

        we.db.models.follow.follow('group', res.locals.group.id, req.user.id, (err, follow)=> {
          if (err) return res.serverError(err);
          if (!follow) return res.forbidden();

          res.status(200).send({
            membership: membership,
            follow: follow
          });
        });
      });

      return null;
    })
    .catch(res.serverError);
  },

  findMembers(req, res, next) {
    const we = req.we;

    res.locals.query.where.groupId = res.locals.group.id;

    if (req.query.roleNames && req.we.utils._.isArray(req.query.roleNames)) {

      const or = [];
      req.query.roleNames.forEach( (r)=> {
        or.push({ $like: '%'+r+'%' })
      });

      if ( !req.we.utils._.isEmpty(or) )
        res.locals.query.where.roles = { $or: or };
    }

    // load associated user record
    res.locals.query.include =[{
      model: we.db.models.user, as: 'user',
      include: [{
        required: false,
        model: we.db.models.follow, as: 'following',
        where: {
          model: 'group',
          modelId: res.locals.group.id
        }
      }]
    }];

    we.db.models.membership.findAll(res.locals.query)
    .then( (result)=> {
      res.locals.data = result;

      we.db.models.membership.count(res.locals.query)
      .then( (count)=> {
        res.locals.metadata.count = count;
        res.ok();
        return null;
      })
      .catch(res.queryError);

      return null;
    })
    .catch(next);
  },

  findUserGroups(req, res, next) {
    const we = req.we;

    res.locals.query.where.userId = res.locals.user.id;
    res.locals.query.where.status = 'active';

    we.db.models.membership.findAndCountAll(res.locals.query)
    .then( (result)=> {
      res.locals.data = result.rows;
      res.locals.metadata.count = result.count;
      res.ok();

      return null;
    })
    .catch( (err)=> {
      next(err);
      return null;
    });
  },

  addMemberRole(req, res) {
    const we = req.we,
      role = req.body.role;

    we.db.models.membership.findOne({
      where: {
        groupId: req.params.groupId,
        userId: req.params.memberId
      }
    })
    .then( (membership)=> {
      const roles = membership.roles;

      if (roles.indexOf(role) == -1) {
        roles.push(role);
        membership.roles = roles;
      }

      membership.save()
      .then( ()=> {
        if (res.locals.redirectTo) {
          res.goTo( res.locals.redirectTo );
        } else {
          res.ok(membership);
        }
        return null;
      })
      .catch(req.queryError);

      return null;
    })
    .catch(res.queryError);
  },

  removeMemberRole(req, res) {
    const we = req.we,
      role = req.body.role;

    we.db.models.membership.findOne({
      where: {
        groupId: req.params.groupId,
        userId: req.params.memberId
      }
    })
    .then( (membership)=> {
      if (!membership) return res.notFound();

      res.locals.group.checkIfMemberIslastmanager(membership.userId, (err, isLastManager)=> {
        if (err) return res.serverError(err);

        if (isLastManager && role == 'manager') {
          // add message
          res.addMessage('warning', {
            text: 'group.member.removeRole.last.member',
            vars :{
              group: res.locals.group
            }
          });

          if (res.locals.redirectTo) {
            return res.goTo( res.locals.redirectTo );
          } else {
            return res.ok(membership);
          }
        }

        const roles = membership.roles;

        let index = roles.indexOf(role);
        if (index > -1) {
          roles.splice(index, 1);
          membership.roles = roles;
        }

        membership.save()
        .then( ()=> {
          if (res.locals.redirectTo) {
            res.goTo( res.locals.redirectTo );
          } else {
            res.ok(membership);
          }
          return null;
        })
        .catch(req.queryError);
      });

      return null;
    })
    .catch(res.queryError);
  }
}