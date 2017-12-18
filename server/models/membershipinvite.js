/**
 * Membership invite model
 */

module.exports = function Model(we) {
  const model = {
    definition: {
      inviterId: {
        type: we.db.Sequelize.INTEGER,
        allowNull: false
      },
      userId: {
        type: we.db.Sequelize.INTEGER,
        allowNull: true
      },
      groupId: {
        type: we.db.Sequelize.INTEGER,
        allowNull: false
      },
      name: {
        type: we.db.Sequelize.TEXT,
        allowNull: false
      },
      text: {
        type: we.db.Sequelize.TEXT
      },
      email: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      }
    },
    options: {
      classMethods: {
        /**
         * Delete one membership invite record
         *
         * @param  {Number} groupId
         * @param  {String} email
         * @param  {Number} userId
         * @return {Object}         Sequelize destroy promisse
         */
        spentInvite(groupId, email, userId) {
          return we.db.models.membershipinvite.destroy({
            where: {
              groupId: groupId,
              $or: [
                { email: email },
                { userId: userId }
              ]
            }
          });
        }
      },
      instanceMethods: {
        sendEmail(req, res, data, cb) {
          // data => {
          //             user: user,
          //             inviter: req.user,
          //             group: res.locals.group,
          //             acceptURL: we.config.hostname +'/group/'+ res.locals.group.id+'/join/'+res.locals.data.id,
          //             groupURL: we.config.hostname +'/group/'+ res.locals.group.id,
          //             we: we
          //           }

          let appName = we.config.appName;
          if (we.systemSettings && we.systemSettings.siteName) {
            appName = we.systemSettings.siteName;
          }

          we.email
          .sendEmail('GroupMembershipInvite', {
            to: data.user.email,
            // subject: res.locals.__('group.membershipinvite.subject.email', {
            //   inviter: data.inviter,
            //   user: data.user,
            //   group: data.group
            // }),
            replyTo: data.inviter.displayName + ' <'+data.inviter.email+'>'
          }, {
            displayName: data.user.displayName,
            inviterName: data.inviter.displayName,
            email: data.user.email,
            acceptURL: data.acceptURL,
            groupURL: data.groupURL,
            groupName: data.group.name,
            groupDescription: data.group.description,
            siteName: '',
            siteURL: we.config.hostname
          }, cb);
        }
      }
    }
  }

  return model;
};