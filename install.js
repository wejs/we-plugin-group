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
       * Create default group vocabulary
       *
       * @param  {object} we
       * @param  {Function} cb callback
       */
      function creategroupVocabulary(done) {
        we.db.models.vocabulary
        .findOrCreate({
          where: { name: 'Group-category' },
          defaults: { name: 'Group-category' },
        })
        .then(function(){
          done();
          return null;
        })
        .catch(done);
      }
    ], done);
  }
};