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
      instanceMethods: {
        sendEmail: function sendEmail (req, res, data, cb) {

          we.email.sendEmail('GroupMembershipinvite', {
            email: data.user.email,
            subject: res.locals.__('group.membershipinvite.subject.email') + ' - ' + data.group.name,
            replyTo: data.inviter.displayName + ' <'+data.inviter.email+'>'
          }, data, cb);
        }
      }
    }
  }

  return model;
};