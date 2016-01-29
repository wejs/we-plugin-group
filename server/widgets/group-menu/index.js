/**
 * Widget group-menu main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */
var widgetUtils = require('../../../lib/widgetUtils');

module.exports = function (projectPath, Widget) {
  var widget = new Widget('group-menu', __dirname);

  widget.checkIfIsValidContext = widgetUtils.checkIfIsValidContext;
  widget.isAvaibleForSelection = widgetUtils.isAvaibleForSelection;
  widget.beforeSave = widgetUtils.beforeSave;
  widget.renderVisibilityField = widgetUtils.renderVisibilityField;


  // // Widget view middleware, use for get data after render the widget html
  widget.viewMiddleware = function viewMiddleware(widget, req, res, next) {
    if (!res.locals.group) return next();

    widget.menu = new req.we.class.Menu({
      class: 'nav nav-pills nav-stacked'
    });

    // Then add links:
    widget.menu.addLinks([
      {
        id: 'posts',
        text: '<i class="fa fa-file"></i> '+req.__('group.post.find'),
        href: '/group/'+res.locals.group.id+'/post',
        weight: 1,
        name: 'posts'
      },
      {
        id: 'members',
        text: '<i class="fa fa-user"></i> '+req.__('group.findMembers'),
        href: '/group/'+res.locals.group.id+'/member',
        weight: 3,
        name: 'member'
      },
      {
        id: 'invite',
        text: '<i class="fa fa-plus"></i> '+req.__('membershipinvite.find'),
        href: '/group/'+res.locals.group.id+'/member/invite',
        weight: 5,
        name: 'member.invite'
      }
    ]);

    return next();
  }

  return widget;
};