/**
 * We {{post-highlight-btn}}  helper
 *
 * usage:  {{{post-highlight-btn postId=record.id highlighted=record.highlighted groupId=group.id locals=locals}}}
 */

module.exports = function(we) {
  return function helper() {
    var options = arguments[arguments.length-1];

    if (
      !options.hash.groupId ||
      !we.acl.canStatic('post_highlight', options.hash.locals.req.userRoleNames)
    ) {
      return '';
    }

    return we.view.renderTemplate('post/highlight-btn', options.hash.locals.theme, options.hash);
  }
}