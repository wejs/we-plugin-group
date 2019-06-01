/**
 * Widget post-newest main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */

module.exports = function (projectPath, Widget) {
  const widget = new Widget('post-newest', __dirname);

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
  widget.viewMiddleware = function (w, req, res, next) {
    const Post = req.we.db.models.post;

    Post.findAll({
      where: { active: true },
      limit: 3,
      attributes: ['id'],
      raw: true
    })
    .then( (r)=> {
      if (!r || !r.length) {
        return r;
      }

      let proms = [];

      r.forEach( function (item, index) {
        proms.push (
          Post.findOne({
            where: {
              id: item.id
            },
            include: { all: true }
          })
          .then(function (post) {
            r[index] = post;
          })
        );
      })

      return Promise.all(proms)
      .then( ()=> {
        return r;
      });
    })
    .then( (r)=> {
      if (!r || !r.length) {
        w.hide = true;
        return next();
      }

      w.posts = r;


      w.posts.forEach( (p)=> {
        p.hideComments = true;
      });

      next();
    })
    .catch(next);
  }

  return widget;
};