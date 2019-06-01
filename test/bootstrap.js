const projectPath = process.cwd(),
  testTools = require('we-test-tools'),
  deleteDir = require('rimraf'),
  path = require('path');

let we;


before(function (callback) {
  testTools.copyLocalSQLiteConfigIfNotExitst(projectPath, callback);
});

before(function(callback) {
  this.slow(100);

  const We = require('we-core');
  we = new We();

  testTools.init({}, we);

  we.bootstrap({
    i18n: {
      directory: path.join(__dirname, 'locales'),
      updateFiles: true
    }
  } , function(err, we) {
    if (err) throw err;

    we.startServer(function(err) {
      if (err) throw err;
      callback();
    });
  });

});

// after all tests remove test folders and delete the database:
after(function (callback) {
  testTools.helpers.resetDatabase(we, (err)=> {
    if(err) return callback(err);

    const tempFolders = [
      projectPath + '/files/tmp',
      projectPath + '/files/config',
      projectPath + '/files/sqlite',
      projectPath + '/files/uploads',
      projectPath + '/files/templatesCacheBuilds.js'
    ];

    we.utils.async.each(tempFolders, (folder, next)=> {
      deleteDir( folder, next);
    }, (err)=> {
      if (err) throw new Error(err);
      we.exit(callback);
    });
  });
});