/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */

module.exports = function loadPlugin(projectPath, Plugin) {

  var plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    post: {
      objectTypes: {
        'text': 'post.objectType.text',
        'image': 'post.objectType.image',
        'link': 'post.objectType.link',
        'file': 'post.objectType.file',
        'multimedia': 'post.objectType.multimedia'
      }
    },
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

  var postSearch = {
    q:  {
      parser: 'contains',
      target: {
        type: 'field',
        field: 'body'
      }
    },
    since:  {
      parser: 'since',
      target: {
        type: 'field',
        field: 'createdAt'
      }
    },
    objectType: {
      parser: 'equal',
      target: {
        type: 'field',
        field: 'objectType'
      }
    }
  };

  plugin.setResource({
    name: 'post',
    findAll: { search: postSearch },
    findOne: {
      breadcrumbHandler: function findOneBreadcrumb(req, res, next) {
        res.locals.breadcrumb =
          '<ol class="breadcrumb">'+
            '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
            '<li><a href="'+req.we.router.urlTo('post.find', req.paramsArray)+
          '">'+res.locals.__('post.find')+'</a></li>'+
            '<li class="active">'+res.locals.__('post.find')+'</li>'+
          '</ol>';

        next();
      }
    }
  });

  plugin.setResource({
    parent: 'group',
    name: 'post',
    namePrefix: 'group.',
    templateFolderPrefix: 'group/',
    findAll: {
      search: postSearch ,
      breadcrumbHandler: function findBreadcrumb(req, res, next) {
        if (!res.locals.group) return next();

        res.locals.breadcrumb =
          '<ol class="breadcrumb">'+
            '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
            '<li><a href="'+req.we.router.urlTo('group.find', req.paramsArray)+
          '">'+res.locals.__('group.find')+'</a></li>'+
            '<li class="active">'+res.locals.group.name+'</li>'+
          '</ol>';

        next();
      }
    },
    findOne: {
      breadcrumbHandler: function findOneBreadcrumb(req, res, next) {
        if (!res.locals.group) return next();

        res.locals.breadcrumb =
          '<ol class="breadcrumb">'+
            '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
            '<li><a href="'+req.we.router.urlTo('group.find', req.paramsArray)+
          '">'+res.locals.__('group.find')+'</a></li>'+
            '<li><a href="/group/'+res.locals.group.id+'">'+res.locals.group.name+'</a></li>'+
            '<li class="active">'+res.locals.__(res.locals.resourceName + '.find')+'</li>'+
          '</ol>';

        next();
      }
    }
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
    'get /group/:groupId([0-9]+)/member/invite': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      groupPermission    : 'manage_members',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.find'
    },
    'post /group/:groupId([0-9]+)/member/invite': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.find'
    },

    'get /group/:groupId([0-9]+)/member/invite/create': {
      controller    : 'membershipinvite',
      action        : 'create',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.create'
    },
    'post /group/:groupId([0-9]+)/member/invite/create': {
      controller    : 'membershipinvite',
      action        : 'create',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.create'
    },

    'get /group/:groupId([0-9]+)/find-user-to-invite': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      groupPermission    : 'manage_members',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.find'
    },

    'get /group/:groupId([0-9]+)/member': {
      controller    : 'group',
      action        : 'findMembers',
      model         : 'membership',
      groupPermission : 'find_members',
      titleHandler : 'i18n',
      titleI18n: 'group.findMembers'
    },
    'post /group/:groupId([0-9]+)/member': {
      controller    : 'group',
      action        : 'inviteMember',
      model         : 'membership',
      responseType  : 'json',
      groupPermission : 'manage_members'
    },

    'get /group/:groupId([0-9]+)/accept-invite': {
      controller    : 'group',
      action        : 'acceptInvite',
      model         : 'membership',
      responseType  : 'json'
    },
    'post /group/:groupId([0-9]+)/accept-invite': {
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
    }
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
  plugin.addJs('we.post', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-group',
    path: 'files/public/we.post.js'
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