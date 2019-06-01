/**
 * Widget group-newest main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */

module.exports = function (projectPath, Widget) {
  const widget = new Widget('group-newest', __dirname);

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

    req.we.db.models.group
    .findAll({
      limit: 3,
      order:[
        ['createdAt', 'DESC'],
        ['id', 'DESC']
      ]
    })
    .then( (r)=> {
      if (!r || !r.length) {
        w.hide = true;
      } else {
        w.groups = r;
      }

      next();
      return null;
    })
    .catch(next);
  }

  return widget;
};