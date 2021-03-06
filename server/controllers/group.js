module.exports = {
  detail(req, res) {
    // const we = req.we,
    //   group = res.locals.group;

    res.ok();
  },

  find(req, res) {
    let membersJoinRequired = false;
    const Op = req.we.Op;
    const sequelize = req.we.db.defaultConnection;

    if (req.query.member && Number(req.query.member)) {
      res.locals.query.where.privacity = 'public';

      res.locals.query.include.push({
        model: req.we.db.models.user, as: 'members',
        required: true,
        where: {
          id: req.query.member
        }
      });
    } else if(req.isAuthenticated()) {

      if (req.query.my === true || req.query.my == 'true') {
        // find user groups
        membersJoinRequired = true;
        res.locals.showUserGroups = true;
      } else if(req.query.my === false || req.query.my == 'false') {
        // find new groups to user
        res.locals.query.where[Op.and] = [
          sequelize.literal('members.id IS NULL'),
          { privacity: 'public' }
        ];
        res.locals.showNewGroups = true;
      } else {
        // find user groups and new groups
        res.locals.query.where[Op.or] = [
          sequelize.literal('members.id IS NULL'),
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

    res.locals.Model
    .findAll(res.locals.query)
    .then( (records)=> {

      res.locals.data = records;

      return res.locals.Model
      .count(res.locals.query)
      .then( (count)=> {
        res.locals.metadata.count = count;
        res.ok();
      });
    })
    .catch(res.queryError);
  },

  /**
   * Get current user public groups
   */
  findUserGroup(req, res, next) {
    if (!res.locals.user || !res.locals.user.id) {
      return res.notFound();
    }

    req.query.member = res.locals.user.id;
    req.we.controllers.group.find(req, res, next);
  },

  findOne(req, res) {
    const we = req.we,
      group = res.locals.group;

    if (!group) return res.notFound();

    // redirect to posts list inside group
    // if (
    //   res.locals.controller == 'group' &&
    //   res.locals.action == 'findOne' &&
    //   req.accepts('html')
    // ) {
    //   return res.redirect(we.router.urlTo(
    //     'group.post.find', [record.id]
    //   ));
    // }
    let userId;

    if (req.isAuthenticated()) {
      userId = req.user.id;
    }

    group.userCanAccessGroup(userId, (err, can)=> {
      if (can) {
        if (we.plugins['we-plugin-view'] && req.accepts('html')) {
          return res.redirect(we.router.urlTo(
            'group.post.find', [group.id]
          ));
        } else {
          // default json send data:
          res.ok();
        }
      } else {
        return res.redirect(we.router.urlTo(
          'group.detail', [group.id]
        ));
      }
    });

    // grupo público

      // deslogado

      // logado

      // membro

    // restrito

      // deslogado

      // logado

      // membro

    // privado

      // deslogado

      // logado

      // membro

    // findOneMember
  },

  findNewGroupsToUser(req, res, next) {
    if (!req.params.userId) return next();

    const Op = req.we.Op;

    res.locals.query.include.push({
      model: req.we.db.models.user , as: 'members', required: true,
      where: {
        id: { [Op.ne]: req.params.userId }
      }
    });

    res.locals.Model
    .findAll(res.locals.query)
    .then( (record)=> {
      return res.locals.Model
      .count(res.locals.query)
      .then( (count)=> {
        res.locals.metadata.count = count;
        res.locals.data = record;
        return res.ok();
      });
    })
    .catch(res.queryError);
  },

  join(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    const group = res.locals.group;

    if (res.locals.membership) {
      // already are member
      res.addMessage('warning', {
        text: 'group.join.already.member',
        vars :{
          group: group
        }
      });

      if ( res.locals.redirectTo ) {
        return res.goTo( res.locals.redirectTo );
      } else if ( req.accepts('html') ) {
      return res.goTo( res.locals.redirectTo || '/group/'+res.locals.group.id );
      } else {
        return res.status(200).send({
          membership: res.locals.membership,
          follow: res.locals.group.metadata.isFollowing
        });
      }
    }

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
            res.status(200).send({
              membershiprequest: membership
            });
            return null;
          }
        }
        // add message
        res.addMessage('success', {
          text: 'group.join.success',
          vars :{
            group: group
          }
        });

        req.we.db.models.follow
        .follow('group', res.locals.group.id, req.user.id, (err, follow)=> {
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

        return null;
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
        we.db.models.user
        .findOne({
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

    we.db.models.membershipinvite.findOne({
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
    const Op = we.Op;

    res.locals.query.where.groupId = res.locals.group.id;

    if (req.query.roleNames && req.we.utils._.isArray(req.query.roleNames)) {

      const or = [];
      req.query.roleNames.forEach( (r)=> {
        or.push({ [Op.like]: '%'+r+'%' })
      });

      if ( !req.we.utils._.isEmpty(or) )
        res.locals.query.where.roles = { [Op.or]: or };
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

    we.db.models.membership
    .findAll(res.locals.query)
    .then( (result)=> {
      res.locals.data = result;

      return we.db.models.membership.count(res.locals.query)
      .then( (count)=> {
        res.locals.metadata.count = count;
        res.ok();
      });
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
    })
    .catch( (err)=> {
      next(err);
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

      return membership.save()
      .then( ()=> {
        if (res.locals.redirectTo) {
          res.goTo( res.locals.redirectTo );
        } else {
          res.ok(membership);
        }
      });
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
        })
        .catch(req.queryError);
      });

    })
    .catch(res.queryError);
  }
}