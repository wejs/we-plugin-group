/**
 * We {{group-membership-btn}}  helper
 *
 * usage:  {{{group-membership-btn groupId='' privacity=group.privacity membership='' locals=locals}}}
 */

module.exports = function(we) {
  return function helper() {
    var options = arguments[arguments.length-1];
    var ms;

    if (!options.hash.locals || !options.hash.groupId) {
      we.log.warn('we-plugin-group:helper:group-membership-btn: Locals or group attr is required')
      return '';
    }

    if (!options.hash.locals.req.isAuthenticated()) {
      return '';
    }

    if (we.utils._.isArray(options.hash.membership) ) {
      ms = options.hash.membership[0];
    } else {
      ms = options.hash.membership;
    }

    if (!options.hash.privacity) options.hash.privacity = 'public';

    return we.view.renderTemplate('group/membership-btn', options.hash.locals.theme, {
      membership: ms,
      groupId: options.hash.groupId,
      locals: options.hash.locals,
      privacity: options.hash.privacity
    });
  }
}