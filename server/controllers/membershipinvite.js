
module.exports = {
  create: function create(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    if (!res.locals.template) res.locals.template = res.locals.model + '/' + 'create';

    res.locals.data = null;
    res.locals.cantInviteMessage = null;
    var user;

    if (req.method === 'POST') {

      req.we.utils.async.series([
        function checkIfUserCanBeInvited(done) {
          // check if user exists
          req.we.db.models.user.findOne({
            where: { id: req.body.userId }
          }).then(function (u) {
            if (!u) {
              res.locals.cantInviteMessage = 'membershipinvite.invite.error.userNotFound';
              return done();
            }

            user = u;

            // check if user is member or already are invited
            res.locals.group.hasMember(user)
            .then(function (isMember){
              if (!isMember) {
                res.locals.cantInviteMessage = 'membershipinvite.invite.error.alreadyInvited';
              }

              done();
            }).catch(done);
          }).catch(done);
        },
        function createInvite(done) {
          if (res.locals.cantInviteMessage) return done();

          req.body.inviterId = req.user.id;
          req.body.name = user.displayName;
          req.body.email = user.email;
          req.body.groupId = res.locals.group.id;

          return res.locals.Model.create(req.body)
          .then(function (record) {
            res.locals.data = record;
            done();
          }).catch(done);
        },
        function sendEmail(done) {
          if (!res.locals.record || !user) return done();
          // send email
          res.locals.record.sendEmail(req, res, {
            user: user,
            inviter: req.user,
            group: res.locals.group
          },function (err) {
            if (err) req.we.log.error('membershipinvite:sendEmail:', err);
            done();
          });
        }
      ], function (err) {
        if (err) return res.queryError(err);

        if (res.locals.cantInviteMessage) {
          res.addMessage('warn', {
            text: res.locals.cantInviteMessage
          });
        }

        res.goTo(req.body.redirectTo || '/group/'+res.locals.group.id+'/member/invite');
      });
    } else {
      // GET request
      res.locals.data = req.query;
      res.ok();
    }
  },

  find: function findAll(req, res, next) {
    if (!req.isAuthenticated()) return res.forbidden();

    res.locals.query.groupId = req.params.groupId;

    var functions = [];

    if (res.locals.currentUserInvites) {
      res.locals.query.where.email = req.user.email;
      res.locals.showInvites = true;
    }

    functions.push(function findUserToInvite (done) {
      if (!req.body.email || res.locals.currentUserInvites) return done();

      req.we.db.models.user.findOne({
        where: { email: req.body.email }
      }).then(function (user) {
        res.locals.userToInvite = user;
        done();
      }).catch(done);
    });

    functions.push(function checkIfisCurerntUser (done) {
      if (!res.locals.userToInvite) return done();

      if (req.isAuthenticated() && res.locals.userToInvite.id == req.user.id) {
        res.addMessage('warn', {
          text: 'group.invite.error.same.as.authenticated.user'
        });
        delete res.locals.userToInvite;
      }

      res.locals.group.hasMember(res.locals.userToInvite);

      done();
    });


    functions.push(function checkIfIsMember (done) {
      if (!res.locals.userToInvite) return done();

      res.locals.group.hasMember(res.locals.userToInvite)
      .then(function (result) {
        if (result) {
          res.addMessage('warn', {
            text: 'group.invite.error.is.member'
          });
          delete res.locals.userToInvite;
        }

        done();
      }).catch(done);
    });

    req.we.utils.async.series(functions, function(err){
      if (err) return next(err);

      res.locals.Model.findAndCountAll(res.locals.query)
      .then(function(record) {
        if (!record) return next();
        res.locals.metadata.count = record.count;
        res.locals.data = record.rows;
        return res.ok();
      }).catch(res.queryError);
    });
  }
};