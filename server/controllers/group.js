module.exports = {
  find: function findAll(req, res) {
    var membersJoinRequired = false;

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
    .then(function (records) {

      res.locals.data = records;

      res.locals.Model.count(res.locals.query)
      .then(function (count) {
        res.locals.metadata.count = count;

        res.ok();
      }).catch(res.queryError);
    }).catch(res.queryError);
  },

  findNewGroupsToUser: function findNewGroupsToUser(req, res, next) {
    if (!req.params.userId) return next();

    res.locals.query.include.push({
      model: req.we.db.models.user , as: 'members', required: true,
      where: {
        id: { $ne: req.params.userId }
      }
    });

    res.locals.Model.findAll(res.locals.query)
    .then(function(record) {
      res.locals.Model.count(res.locals.query).then(function (count){
        res.locals.metadata.count = count;
        res.locals.data = record;
        return res.ok();
      }).catch(function(err){
        return res.serverError(err);
      })
    }).catch(res.queryError);
  },

  join: function join(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    var group = res.locals.group;

    res.locals.group.userJoin(req.user.id, function (err, membership) {
      if (err) return res.serverError(err);
      // delete invites for user in group
      req.we.db.models.membershipinvite
      .spentInvite(group.id, req.user.email, req.user.id)
      .then(function(){

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


        req.we.db.models.follow.follow('group', res.locals.group.id, req.user.id, function (err, follow) {
          if (err) return res.serverError(err);
          if (!follow) return res.forbidden();

          if (res.locals.redirectTo) {
            res.goTo( res.locals.redirectTo );
          } else {
            res.status(200).send({
              membership: membership,
              follow: follow
            });
          }
        });

      }).catch(res.queryError);

    });
  },

  leave: function leave(req, res) {
    if (!req.isAuthenticated) return res.forbidden();

    res.locals.group.userLeave(req.user.id, function (err) {
      if (err) return res.serverError(err);

      if (res.locals.redirectTo) {
        res.goTo( res.locals.redirectTo );
      } else {
        res.status(204).send();
      }
    });
  },

  inviteMember: function inviteMember(req, res) {
    if (!req.isAuthenticated) return res.forbidden();

    var we = req.we;
    var userId = null;
    var membership = null;

    req.we.utils.async.series([
      function checkIfUserAreInRegistered(done) {
        we.db.models.user.find({
          where: {
            email: req.body.email
          }
        }).then(function(u) {
          if (u) userId = u.id;
          done();
        }).catch(done);
      },
      function checkIfUserIsMember(done) {
        if (!userId) return done();
        res.locals.group.findOneMember(userId, function(err, m) {
          if (err) return done(err);
          membership = m;
          done();
        });
      }
    ], function(err) {
      if (err) return res.serverError(err);

      if (membership) {
        return res.status(200).send({
          membership: membership
        });
      }

      res.locals.group.inviteMember(req.user.id, userId,
        req.body.name, req.body.text, req.body.email,
         function (err, membership) {
        if (err) return res.serverError(err);

        we.db.models.follow.follow('group', res.locals.group.id, req.user.id, function (err, follow) {
          if (err) return res.serverError(err);
          if (!follow) return res.forbidden();

          var templateVariables = {
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

  acceptInvite: function acceptInvite(req, res) {
    if (!req.isAuthenticated) return res.forbidden();
    var we = req.getWe();

    we.db.models.membershipinvite.find({
      where: {
        userId: req.user.id,
        groupId: req.params.groupId
      }
    }).then(function (membershiprequest) {
      if (!membershiprequest) return res.notFound();

      res.locals.group.addMember(req.user.id, 'member', function(err, membership) {
        if(err) return res.serverError(err);

        we.db.models.follow.follow('group', res.locals.group.id, req.user.id, function (err, follow) {
          if (err) return res.serverError(err);
          if (!follow) return res.forbidden();

          res.status(200).send({
            membership: membership,
            follow: follow
          });
        });
      });
    })
    .catch(res.serverError);
  },

  findMembers: function findMembers(req, res, next) {
    var we = req.we;

    res.locals.query.where.groupId = res.locals.group.id;

    if (req.query.roleNames && req.we.utils._.isArray(req.query.roleNames)) {
      var roles = [];
      req.query.roleNames.forEach(function(r) {
        if (typeof r != 'string') return;
        if (we.config.groupRoles.indexOf(r) > -1) roles.push(r);
      });

      var or = [];
      roles.forEach(function (r) {
        or.push({ $like: '%'+r+'%' })
      });

      if ( !req.we.utils._.isEmpty(or) ) res.locals.query.where.roles = { $or: or };
    }

    // load associated user record
    res.locals.query.include =[{ model: we.db.models.user, as: 'user'} ];

    we.db.models.membership.findAndCountAll(res.locals.query)
    .then(function (result) {
      res.locals.data = result.rows;
      res.locals.metadata.count = result.count;
      res.ok();
    }).catch(function(err) {
      next(err);
    });
  },

  findUserGroups: function(req, res, next) {
    var we = req.we;

    res.locals.query.where.userId = res.locals.user.id;
    res.locals.query.where.status = 'active';

    we.db.models.membership.findAndCountAll(res.locals.query)
    .then(function (result) {
      res.locals.data = result.rows;
      res.locals.metadata.count = result.count;
      res.ok();
    }).catch(function (err){
      next(err);
    });
  },

  findRoles: function(req, res) {
    return res.send({
      role: req.we.config.groupRoles
    });
  }
}