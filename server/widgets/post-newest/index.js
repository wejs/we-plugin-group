/**
 * Widget post-newest main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */

module.exports = function (projectPath, Widget) {
  var widget = new Widget('post-newest', __dirname);

  // // Override default widget class functions after instance
  //
  // widget.beforeSave = function widgetBeforeSave(req, res, next) {
  //   // do something after save this widget in create or edit ...
  //   return next();
  // };

  // // form middleware, use for get data for widget form
  // widget.formMiddleware = function formMiddleware(req, res, next) {
  //
  //   next();
  // }

  // // Widget view middleware, use for get data after render the widget html
  widget.viewMiddleware = function viewMiddleware(w, req, res, next) {

    req.we.db.models.post
    .findAll({
      where: {},
      limit: 3,
      include: [{ all: true }]
    })
    .then( (r)=> {
      w.posts = r;

      w.posts.forEach( (p)=> {
        p.hideComments = true;
      });

      next();
      return null;
    })
    .catch(next);
  }

  return widget;
};