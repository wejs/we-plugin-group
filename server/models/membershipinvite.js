/**
 * Membership invite model
 */

module.exports = function Model(we) {
  var model = {
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
        spentInvite: function spentInvite(groupId, email, userId) {
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
        sendEmail: function sendEmail (req, res, data, cb) {
          we.email.sendEmail('GroupMembershipinvite', {
            email: data.user.email,
            subject: res.locals.__('group.membershipinvite.subject.email', {
              inviter: data.inviter,
              user: data.user,
              group: data.group
            }),
            replyTo: data.inviter.displayName + ' <'+data.inviter.email+'>'
          }, data, cb);
        }
      }
    }
  }

  return model;
};