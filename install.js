module.exports = {
  requirements: function(we, done) {
    // check requirements
    done();
  },
  /**
   * Install function run in we.js install.
   *
   * @param  {Object}   we    we.js object
   * @param  {Function} done  callback
   */
  install: function install(we, done) {
    we.utils.async.series([
      /**
       * Create default group roles
       *
       * @param  {object} we
       * @param  {Function} cb callback
       */
      function registerDefaultRoles(done) {
        we.utils.async.parallel([
          function memberRole(done) {
            // create the administrator role
            we.db.models.role.findOrCreate({
              where: { name: 'groupMember' },
              defaults: {
                name: 'groupMember',
                isSystemRole: true,
                permissions: [
                  'find_group',
                  'find_post'
                ]
              }
            }).spread(function (role) {
              // set the role in global roles how will be avaible in we.acl.roles
              we.acl.roles.groupMember = role;
              done(null , role);
            }).catch(done);
          },
          function managerRole(done) {
            // create the administrator role
            we.db.models.role.findOrCreate({
              where: { name: 'groupManager' },
              defaults: {
                name: 'groupManager',
                isSystemRole: true,
                permissions: [
                  'update_group',
                  'find_group',
                  'delete_group',
                  'manage_group',
                  'find_group_member',
                  'post_highlight'
                ]
              }
            }).spread(function (role) {
              // set the role in global roles how will be avaible in we.acl.roles
              we.acl.roles.groupManager = role;
              done(null , role);
            }).catch(done);

          }
        ], done);
      },
      /**
       * Create default group vocabulary
       *
       * @param  {object} we
       * @param  {Function} cb callback
       */
      function creategroupVocabulary(done) {
        we.db.models.vocabulary.findOrCreate({
          where: { name: 'Group-category' },
          defaults: { name: 'Group-category' },
        }).then(function(){
          done();
        }).catch(done);
      }
    ], done);
  }
};