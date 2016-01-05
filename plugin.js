/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */

module.exports = function loadPlugin(projectPath, Plugin) {

  var plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    permissions: {
      'post_highlight': {
        'group': 'group',
        'title': 'Highlight group post',
        'description': ' '
      }
    },
    forms: {
      'post': __dirname + '/server/forms/post.json'
    }
  });

  plugin.setResource({
    name: 'group',
    findAll: {
      search: {
        name:  {
          parser: 'contains',
          target: {
            type: 'field',
            field: 'name'
          }
        }
      }
    }
  });

  plugin.setResource({
    name: 'post'
  });

  plugin.setResource({
    parent: 'group',
    name: 'post',
    namePrefix: 'group.',
    templateFolderPrefix: 'group/'
  });

  // ser plugin routes
  plugin.setRoutes({
    'get /user/:userId([0-9]+)/membership': {
      controller    : 'group',
      action        : 'findUserGroups',
      model         : 'membership'
    },
    // find groups to user
    'get /user/:userId([0-9]+)/find-new-groups': {
      controller    : 'group',
      action        : 'findNewGroupsToUser',
      model         : 'group'
    },

    // GROUPS
    //
    'post /api/v1/group/:groupId([0-9]+)/addContent/:contentModelName/:contentId': {
      controller    : 'group',
      action        : 'addContent',
      model         : 'group',
      responseType  : 'json',
      groupPermission : 'add_content'
    },

    'delete /api/v1/group/:groupId([0-9]+)/addContent/:contentModelName/:contentId': {
      controller    : 'group',
      action        : 'removeContent',
      model         : 'group',
      responseType  : 'json',
      groupPermission : 'remove_content'
    },

    'get /api/v1/group/:groupId([0-9]+)/content': {
      controller    : 'group',
      action        : 'findAllContent',
      model         : 'group',
      responseType  : 'json',
      groupPermission : 'find_content'
    },

    'get /api/v1/group/:groupId([0-9]+)/content/:contentModelName': {
      controller    : 'group',
      action        : 'findContentByType',
      model         : 'group',
      responseType  : 'json',
      groupPermission : 'find_content'
    },

    'post /api/v1/group/:groupId([0-9]+)/join': {
      controller    : 'group',
      action        : 'join',
      model         : 'group',
      responseType  : 'json'
    },
    'post /api/v1/group/:groupId([0-9]+)/leave': {
      controller    : 'group',
      action        : 'leave',
      model         : 'group',
      responseType  : 'json'
    },
    'get /group/:groupId([0-9]+)/member': {
      controller    : 'group',
      action        : 'findMembers',
      model         : 'membership',
      groupPermission : 'find_members'
    },
    'post /group/:groupId([0-9]+)/member': {
      controller    : 'group',
      action        : 'inviteMember',
      model         : 'membership',
      responseType  : 'json',
      groupPermission : 'manage_members'
    },
    'post /group/:groupId([0-9]+)/accept-invite/': {
      controller    : 'group',
      action        : 'acceptInvite',
      model         : 'membership',
      responseType  : 'json'
    },
    'get /group/:groupId([0-9]+)/role': {
      controller    : 'group',
      action        : 'findRoles',
      responseType  : 'json',
      groupPermission : 'find_members'
    },
    // 'get /group/:id([0-9]+)': {
    //   controller    : 'group',
    //   action        : 'findOne',
    //   model         : 'group',
    //   permission    : 'find_group'
    // },
    // 'get /group': {
    //   controller    : 'group',
    //   action        : 'find',
    //   model         : 'group',
    //   permission    : 'find_group'
    // },
    // 'post /group': {
    //   controller    : 'group',
    //   action        : 'create',
    //   model         : 'group',
    //   permission    : 'create_group'
    // },
    // 'put /group/:id([0-9]+)': {
    //   controller    : 'group',
    //   action        : 'update',
    //   model         : 'group',
    //   permission    : 'update_group'
    // },
    // 'delete /group/:id([0-9]+)': {
    //   controller    : 'group',
    //   action        : 'destroy',
    //   model         : 'group',
    //   permission    : 'delete_group'
    // },
    'get /group/:groupId([0-9]+)/members/invites': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      groupPermission    : 'manage_members'
    },
  });

  plugin.events.on('we:config:getAppBootstrapConfig', function(opts) {
    if (opts.context && opts.context.widgetContext && opts.context.group) {
     opts.configs.widgetContext = opts.context.widgetContext;
    }
  });

  plugin.events.on('we:express:set:params', function (data) {
    // group pre-loader
    data.express.param('groupId', function (req, res, next, id) {
      if (!/^\d+$/.exec(String(id))) return res.notFound();

      data.we.db.models.group.findById(id)
      .then(function (group) {
        if (!group) return res.notFound();
        res.locals.group = group;

        if (!group.metadata) group.metadata = {};

        res.locals.widgetContext = 'group-' + group.id;

        if (!req.user) return next();

        data.we.utils.async.parallel([
          function loadMembership(next) {
            data.we.db.models.membership.find({
              where: { userId: req.user.id }
            }).then(function (membership) {

              res.locals.membership = membership;
              req.membership = membership;

              next();
            }).catch(res.queryError);
          },
          function loadFollowStatus(next) {
            data.we.db.models.follow.isFollowing(req.user.id, 'group', group.id)
            .then(function (isFollowing) {

              res.locals.group.metadata.isFollowing = isFollowing;
              next();
            }).catch(next);
          }
        ], next);
      }).catch(next);
    });
  });

  plugin.addJs('we.sharebox', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-group',
    path: 'files/public/we.sharebox.js'
  });
  plugin.addCss('we.sharebox', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-group',
    path: 'files/public/we.sharebox.css'
  });
  plugin.addCss('we.post', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-group',
    path: 'files/public/we.post.css'
  });
  plugin.addCss('we.group', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-group',
    path: 'files/public/we.group.css'
  });

  return plugin;
};