/**
 * Membership
 *
 * @description :: We.js membership model
 */

module.exports = function MembershipModel(we) {
  return {
    definition: {
      id: {
        type: we.db.Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      // active or blocked
      status: {
        type: we.db.Sequelize.STRING,
        defaultValue: 'active',
      },

      // roles array
      roles: {
        type: we.db.Sequelize.BLOB,
        get: function()  {
          if (this.getDataValue('roles')){
            if (typeof this.getDataValue('roles') == 'string') {
              return this.getDataValue('roles').split(';');
            } else {
              return this.getDataValue('roles').toString('utf8').split(';');
            }
          }
          return [];
        },
        set: function(val) {
          if (typeof val == 'string') {
            this.setDataValue('roles', val);
          } else {
            this.setDataValue('roles', val.join(';'));
          }
        }
      }
    },

    associations: {
      user: {
        type: 'belongsTo',
        model: 'user',
        constraints: false
      }
    },

    options: {
      classMethods: {},
      instanceMethods: {
        addRole: function(roleName) {
          var r = this.roles;
          if (r.indexOf(roleName) === -1) r.push(roleName);
          this.roles = r;
          return this.save();
        },
        removeRole: function(roleName) {
          var r = this.roles;
          var index = r.indexOf(roleName);
          if (index + -1) r.splice(index, 1);
          this.roles = r;
          return this.save();
        },
        haveRole: function(roleName) {
          var r = this.roles;
          if (r.indexOf(roleName) > -1) return true;
          return false;
        }
      },
      hooks: {
        afterCreate: function(instance, options, done) {
          we.utils.async.parallel([
            function deleteRequests(done) {
              we.db.models.membershiprequest.destroy({
                where: {
                  userId: instance.memberId,
                  groupId: instance.modelId
                }
              }).then(function () {
                done()
              }).catch(done);
            },
            function deleteInvites(done) {
              we.db.models.membershipinvite.destroy({
                where: {
                  userId: instance.memberId,
                  groupId: instance.modelId
                }
              }).then(function () {
                done()
              }).catch(done);
            }
          ], done);
        }
      }
    }
  }
}