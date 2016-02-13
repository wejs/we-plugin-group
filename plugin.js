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
      },
      'manage_group': {
        'group': 'group',
        'title': 'Manage group',
        'description': ' '
      },
      'find_group_member': {
        'group': 'group',
        'title': 'Find group members',
        'description': ' '
      }
    },
    forms: {
      'post': __dirname + '/server/forms/post.json'
    }
  });

  //- BREADCRUMB

  plugin.router.breadcrumb.add('findOnePost', function findOneBreadcrumb(req, res, next) {
    res.locals.breadcrumb =
      '<ol class="breadcrumb">'+
        '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
        '<li><a href="'+req.we.router.urlTo('post.find', req.paramsArray)+
      '">'+res.locals.__('post.find')+'</a></li>'+
        '<li class="active">'+res.locals.__('post.find')+'</li>'+
      '</ol>';

    next();
  });

  plugin.router.breadcrumb.add('findAllPostInGroup', function findAllPostInGroupBreadcrumb(req, res, next) {
    if (!res.locals.group) return next();

    res.locals.breadcrumb =
      '<ol class="breadcrumb">'+
        '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
        '<li><a href="'+req.we.router.urlTo('group.find', req.paramsArray)+
      '">'+res.locals.__('group.find')+'</a></li>'+
        '<li class="active">'+res.locals.group.name+'</li>'+
      '</ol>';

    next();
  });

  plugin.router.breadcrumb.add('findOnePostInGroup', function findOnePostInGroupBreadcrumb(req, res, next) {
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
  });

  plugin.router.breadcrumb.add('findUserGroupInvite', function findUserGroupInviteBreadcrumb(req, res, next) {
    res.locals.breadcrumb =
      '<ol class="breadcrumb">'+
        '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
        '<li><a href="'+req.we.router.urlTo('group.find', req.paramsArray)+'">'+
          res.locals.__('group.find')+
        '</a></li>'+
        '<li class="active">'+res.locals.__('membershipinvite.find')+'</li>'+
      '</ol>';

    next();
  });

  //-- ROUTES

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
    findAll: {
      search: postSearch,
      query: { limit: 10 }
    },
    findOne: {
      breadcrumbHandler: 'findOnePost'
    }
  });

  plugin.setResource({
    parent: 'group',
    name: 'post',
    namePrefix: 'group.',
    templateFolderPrefix: 'group/',
    findAll: {
      query: { limit: 10 },
      search: postSearch ,
      breadcrumbHandler: 'findAllPostInGroup'
    },
    findOne: {
      breadcrumbHandler: 'findOnePostInGroup'
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

    'get /api/v1/group/:groupId([0-9]+)/join/:membershpinviteKeyId([0-9]+)': {
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
    // find and list
    'get /group/:groupId([0-9]+)/member/invite': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.find',
      permission : 'manage_group'
    },
    'post /group/:groupId([0-9]+)/member/invite': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.find',
      permission : 'manage_group'
    },
    'get /group/my-invites': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      template      : 'membershipinvite/find-my',
      resourceName  : 'membershipinvite.find',
      currentUserInvites: true,
      titleHandler : 'i18n',
      titleI18n: 'group.invites',
      breadcrumbHandler: 'findUserGroupInvite'
    },
    // create
    'get /group/:groupId([0-9]+)/member/invite/create': {
      controller    : 'membershipinvite',
      action        : 'create',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.create',
      permission: 'manage_group'
    },
    'post /group/:groupId([0-9]+)/member/invite/create': {
      controller    : 'membershipinvite',
      action        : 'create',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.create',
      permission: 'manage_group'
    },

    'get /group/:groupId([0-9]+)/find-user-to-invite': {
      controller    : 'membershipinvite',
      action        : 'find',
      model         : 'membershipinvite',
      titleHandler : 'i18n',
      titleI18n: 'membershipinvite.find',
      permission: 'manage_group'
    },

    'get /group/:groupId([0-9]+)/member': {
      controller    : 'group',
      action        : 'findMembers',
      model         : 'membership',
      titleHandler : 'i18n',
      titleI18n: 'group.findMembers',
      permission: 'find_group_member'
    },
    'post /group/:groupId([0-9]+)/member': {
      controller    : 'group',
      action        : 'inviteMember',
      model         : 'membership',
      responseType  : 'json',
      permission: 'find_group_member'
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
    // change user role
    'post /group/:groupId([0-9]+)/member/:memberId([0-9]+)/addRole': {
      controller    : 'group',
      action        : 'addMemberRole',
      responseType  : 'json',
      permission: 'manage_group'
    },
    // change user role
    'post /group/:groupId([0-9]+)/member/:memberId([0-9]+)/removeRole': {
      controller    : 'group',
      action        : 'removeMemberRole',
      responseType  : 'json',
      permission: 'manage_group'
    }
  });

  plugin.events.on('we:config:getAppBootstrapConfig', function(opts) {
    if (opts.context && opts.context.widgetContext && opts.context.group) {
     opts.configs.widgetContext = opts.context.widgetContext;
    }
  });

  plugin.events.on('we:express:set:params', function (data) {
    // group pre-loader
    data.express.param('groupId', plugin.expressGroupIdParams);

    data.express.param('membershpinviteKeyId', plugin.expressValidInviteParams);
  });

  plugin.expressGroupIdParams = function expressGroupIdParams(req, res, next, id) {
    if (!/^\d+$/.exec(String(id))) return res.notFound();

    var we = req.we;

    we.db.models.group.findById(id)
    .then(function (group) {
      if (!group) return res.notFound();
      res.locals.group = group;

      if (!group.metadata) group.metadata = {};

      res.locals.widgetContext = 'group-' + group.id;

      if (!req.user) return next();

      we.utils.async.parallel([
        function loadMembership(next) {
          we.db.models.membership.find({
            where: { userId: req.user.id }
          }).then(function (membership) {

            if (membership) {
              var roles = membership.roles;
              req.userRoleNames = req.userRoleNames.concat(roles.map(function (r) {
                return 'group' + r.charAt(0).toUpperCase() + r.slice(1);
              }));

              req.userRoleNames.push('groupMember');

              res.locals.membership = membership;
              req.membership = membership;
            }

            next();
          }).catch(res.queryError);
        },
        function loadFollowStatus(next) {
          we.db.models.follow.isFollowing(req.user.id, 'group', group.id)
          .then(function (isFollowing) {

            res.locals.group.metadata.isFollowing = isFollowing;
            next();
          }).catch(next);
        }
      ], next);
    }).catch(next);
  }

  /**
   * Valid one route with membershpinviteKeyId param
   */
  plugin.expressValidInviteParams = function expressValidInviteParams(req, res, next, id) {
    req.we.db.models.membershipinvite.findById(id)
    .then(function (membershipinvite) {
      if (!membershipinvite) return res.notFound();
      next();
    }).catch(next);
  }

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