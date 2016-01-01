var projectPath = process.cwd();
var deleteDir = require('rimraf');
var testTools = require('we-test-tools');
var path = require('path');
var we;

before(function(callback) {
  this.slow(100);

  testTools.copyLocalConfigIfNotExitst(projectPath, function() {
    we = require('we-core');
    testTools.init({}, we);

    testTools.helpers.resetDatabase(we, function(err) {
      if(err) return callback(err);

      we.bootstrap({
        i18n: {
          directory: path.join(__dirname, 'locales')
        }
      }, function (err, we) {
        if (err) return console.error(err);
        we.startServer(function (err) {
          if (err) return console.error(err);
          callback();
        });
      });
    });
  });
});

//after all tests
after(function (callback) {
  we.db.defaultConnection.close();

  var tempFolders = [
    projectPath + '/files/tmp',
    projectPath + '/files/config',
    projectPath + '/files/sqlite',

    projectPath + '/files/public/min',

    projectPath + '/files/public/project.css',
    projectPath + '/files/public/project.js',
    projectPath + '/config/local.js',
  ];

  we.utils.async.each(tempFolders, function(folder, next){
    deleteDir( folder, next);
  }, function(err) {
    if (err) throw new Error(err);
    callback();
  })

});