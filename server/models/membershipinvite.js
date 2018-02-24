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
          return we.db.models.membershipinvite
          .destroy({
            where: {
              groupId: groupId,
              [we.Op.or]: [
                { email: email },
                { userId: userId }
              ]
            }
          });
        }
      },
      instanceMethods: {
        sendEmail(req, res, data, cb) {
          let appName = we.config.appName;
          if (we.systemSettings && we.systemSettings.siteName) {
            appName = we.systemSettings.siteName;
          }

          we.email
          .sendEmail('GroupMembershipInvite', {
            to: data.user.email,
            replyTo: data.inviter.displayName + ' <'+data.inviter.email+'>'
          }, {
            displayName: data.user.displayName,
            inviterName: data.inviter.displayName,
            email: data.user.email,
            acceptURL: data.acceptURL,
            groupURL: data.groupURL,
            groupName: data.group.name,
            groupDescription: data.group.description,
            siteName: appName,
            siteURL: we.config.hostname,
            siteUrl: we.config.hostname
          }, cb);
        }
      }
    }
  }

  return model;
};