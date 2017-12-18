
module.exports = {
  create(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    if (!res.locals.template) res.locals.template = res.locals.model + '/' + 'create';

    const we = req.we;

    res.locals.data = null;
    res.locals.cantInviteMessage = null;
    let user;

    if (req.method === 'POST') {

      we.utils.async.series([
        function checkIfUserCanBeInvited(done) {
          // check if user exists
          we.db.models.user.findOne({
            where: { id: req.body.userId }
          })
          .then( (u)=> {
            if (!u) {
              res.locals.cantInviteMessage = 'membershipinvite.invite.error.userNotFound';
              done();
              return null;
            }

            user = u;

            // check if user is member or already are invited
            res.locals.group
            .hasMember(user)
            .then( (isMember)=> {
              if (isMember) {
                res.locals.cantInviteMessage = 'membershipinvite.invite.error.alreadyInvited';
              }

              done();
              return null;
            })
            .catch(done);

            return null;
          })
          .catch(done);
        },

        function checkIfAreInvited(done) {
          if (!user) return done();

          we.db.models.membershipinvite
          .findOne({
            where: {
              groupId: res.locals.group.id,
              $or: [
                { userId: user.id },
                { email: user.email }
              ]
            }
          })
          .then( (membershipinvite)=> {
            if (membershipinvite) {
              res.locals.cantInviteMessage = 'membershipinvite.invite.error.alreadyInvited';
            }

            done();
            return null;
          })
          .catch(done);
        },

        function createInvite(done) {
          if (res.locals.cantInviteMessage) return done();

          req.body.inviterId = req.user.id;
          req.body.name = user.displayName;
          req.body.email = user.email;
          req.body.groupId = res.locals.group.id;

          return res.locals.Model
          .create(req.body)
          .then( (record)=> {
            res.locals.data = record;
            done();
            return null;
          })
          .catch(done);
        },
        function sendEmail(done) {
          if (!res.locals.data || !user) return done();
          // send email
          res.locals.data.sendEmail(req, res, {
            user: user,
            inviter: req.user,
            group: res.locals.group,
            acceptURL: we.config.hostname +'/group/'+ res.locals.group.id+'/join/'+res.locals.data.id,
            groupURL: we.config.hostname +'/group/'+ res.locals.group.id,
            we: we
          }, (err)=> {
            if (err) req.we.log.error('membershipinvite:sendEmail:', err);
            done();
          });
        }
      ], (err)=> {
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

  find(req, res, next) {
    if (!req.isAuthenticated()) return res.forbidden();

    res.locals.query.groupId = req.params.groupId;

    const functions = [];

    if (res.locals.currentUserInvites) {
      res.locals.query.where.email = req.user.email;
      res.locals.showInvites = true;
    }

    functions.push(function findUserToInvite (done) {
      if (!req.body.email || res.locals.currentUserInvites) return done();

      req.we.db.models.user.findOne({
        where: { email: req.body.email }
      })
      .then( (user)=> {
        if (!user) {
          res.addMessage('warn', {
            text: 'membershipinvite.invite.error.userNotFound'
          });
        }
        res.locals.userToInvite = user;
        done();
        return null;
      })
      .catch(done);
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
      .then( (result)=> {
        if (result) {
          res.addMessage('warn', {
            text: 'group.invite.error.is.member'
          });
          delete res.locals.userToInvite;
        }

        done();
        return null;
      })
      .catch(done);
    });

    req.we.utils.async.series(functions, (err)=> {
      if (err) return next(err);

      res.locals.Model
      .findAndCountAll(res.locals.query)
      .then( (record)=> {
        if (!record) return next();
        res.locals.metadata.count = record.count;
        res.locals.data = record.rows;
        res.ok();
        return null;
      })
      .catch(res.queryError);
    });
  }
};