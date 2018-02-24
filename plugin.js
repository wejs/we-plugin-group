/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);

  const Op = plugin.we.Op;

  // set plugin configs
  plugin.setConfigs({
    roles: {
      groupMember: {
        name: 'groupMember',
        isSystemRole: true,
        permissions: [
          'find_group',
          'find_post',
          'create_post_in_group'
        ]
      },
      groupManager: {
        name: 'groupManager',
        isSystemRole: true,
        permissions: [
          'update_group',
          'find_group',
          'delete_group',
          'manage_group',
          'find_group_member',
          'post_highlight',
          'create_post_in_group',
          'update_post_in_group',
          'delete_post_in_group'
        ]
      }
    },
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
      },
      'find_group.post': {
        'group': 'group',
        'title': 'Create one post inside group',
        'description': ' '
      },
      'create_group.post': {
        'group': 'group',
        'title': 'Create one post inside group',
        'description': ' '
      },
      'update_group.post': {
        'group': 'group',
        'title': 'Update one post inside group',
        'description': ' '
      },
      'delete_group.post': {
        'group': 'group',
        'title': 'Delete one post inside group',
        'description': ' '
      }
    },
    forms: {
      'post': __dirname + '/server/forms/post.json'
    },
    emailTypes: {
      GroupMembershipInvite: {
        label: 'Email de aviso de convite para entrar em um grupo',
        templateVariables: {
          displayName: {
            example: 'Alberto Souza',
            description: 'Nome da pessoa convidada'
          },
          email: {
            example: 'contact@linkysysytems.com',
            description: 'Email da pessoa convidada'
          },
          inviterName: {
            example: 'Santos',
            description: 'Nome da pessoa que convidou'
          },
          acceptURL: {
            example: '/group/1/accept',
            description: 'URL para aceitar o convite e participar do grupo'
          },
          groupURL: {
            example: '/group/1',
            description: 'URL de acesso ao grupo'
          },
          groupName: {
            example: 'Grupo de trabalho',
            description: 'Nome do grupo'
          },
          groupDescription: {
            example: 'Grupo incrível',
            description: 'Descrição do grupo'
          },
          siteName: {
            example: 'Site Name',
            description: 'Nome deste site'
          },
          siteUrl: {
            example: '/#example',
            description: 'Endereço deste site'
          }
        }
      }
    }
  });

  //-- ROUTES

  plugin.setResource({
    name: 'group',
    findAll: {
      search: {
        name:  {
          parser: 'groupSearch',
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
      parser: 'postSearch',
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
      breadcrumbHandler: 'findAllPostInGroup',
      permission: 'find_group.post'
    },
    findOne: {
      breadcrumbHandler: 'findOnePostInGroup',
      permission: 'find_group.post'
    },
    create: {
      permission: 'create_group.post'
    },
    update: {
      permission: 'update_group.post'
    },
    delete: {
      permission: 'delete_group.post'
    }
  });

  plugin.setResource({
    parent: 'user',
    name: 'post',
    namePrefix: 'user.',
    templateFolderPrefix: 'user/',

    findAll: {
      action: 'findUserPosts',
      layoutName: 'user-layout',
      query: { limit: 10 },
      search: postSearch ,
      permission: 'find_post'
    },
    findOne: {
      layoutName: 'user-layout',
      permission: 'find_post',
      breadcrumbHandler(req, res) {
        res.goTo('/post/'+res.locals.id);
      }
    },
    create: {
      layoutName: 'user-layout',
      permission: 'create_post',
      breadcrumbHandler(req, res) {
        res.goTo('/post/'+res.locals.id);
      }
    },
    update: {
      layoutName: 'user-layout',
      permission: 'update_post',
      breadcrumbHandler(req, res) {
        res.goTo('/post/'+res.locals.id);
      }
    },
    delete: {
      layoutName: 'user-layout',
      permission: 'delete_post',
      breadcrumbHandler(req, res) {
        res.goTo('/post/'+res.locals.id);
      }
    }
  });

  plugin.setResource({
    parent: 'user',
    name: 'group',
    namePrefix: 'user.',
    templateFolderPrefix: 'user/',

    findAll: {
      action: 'findUserGroup',
      layoutName: 'user-layout',
      query: { limit: 10 },
      breadcrumbHandler(req, res, next) {
        if (!res.locals.user) return next();

        let name = plugin.we.utils.string(res.locals.user.displayName).truncate(40).s;

        res.locals.breadcrumb =
          '<ol class="breadcrumb">'+
            '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
            '<li><a href="'+req.we.router.urlTo('user.find', req.paramsArray)+
          '">'+res.locals.__('user.find')+'</a></li>'+
            '<li><a href="'+req.we.router.urlTo('user.findOne', req.paramsArray)+
          '">'+name+'</a></li>'+
            '<li class="active">'+res.locals.__('group.find')+'</li>'+
          '</ol>';

        next();
      },
      permission: 'find_post'
    },
    findOne: {
      layoutName: 'user-layout',
      permission: 'find_post',
      breadcrumbHandler(req, res) {
        res.goTo('/group/'+res.locals.id);
      }
    },
    create: {
      layoutName: 'user-layout',
      permission: 'create_post',
      breadcrumbHandler(req, res) {
        res.goTo('/group/'+res.locals.id);
      }
    },
    update: {
      layoutName: 'user-layout',
      permission: 'update_post',
      breadcrumbHandler(req, res) {
        res.goTo('/group/'+res.locals.id);
      }
    },
    delete: {
      layoutName: 'user-layout',
      permission: 'delete_post',
      breadcrumbHandler(req, res) {
        res.goTo('/group/'+res.locals.id);
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

    // group details route with group information to members and not members
    'get /group/:groupId([0-9]+)/detail': {
      controller    : 'group',
      action        : 'detail',
      model         : 'group',
      titleHandler  : 'i18n',
      titleI18n     : 'group.details',
      permission    : true
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

  plugin.events.on('we:after:load:plugins', function(we) {
    //- BREADCRUMB
    we.router.breadcrumb.add('findOnePost', function findOneBreadcrumb(req, res, next) {
      res.locals.breadcrumb =
        '<ol class="breadcrumb">'+
          '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
          '<li><a href="'+req.we.router.urlTo('post.find', req.paramsArray)+
        '">'+res.locals.__('post.find')+'</a></li>'+
          '<li class="active">'+res.locals.__('post.find')+'</li>'+
        '</ol>';

      next();
    });

    we.router.breadcrumb.add('findAllPostInGroup', function findAllPostInGroupBreadcrumb(req, res, next) {
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

    we.router.breadcrumb.add('findOnePostInGroup', function findOnePostInGroupBreadcrumb(req, res, next) {
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

    we.router.breadcrumb.add('findUserGroupInvite', function findUserGroupInviteBreadcrumb(req, res, next) {
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
    /**
     * Custom group search parser
     */
    we.router.search.parsers.groupSearch = function groupSearch(searchName, field, value, w) {

      return w[Op.or] = {
        name: {
          [Op.like]: '%'+value+'%'
        },
        description: {
          [Op.like]: '%'+value+'%'
        }
      }
    };
    /**
     * Custom post search parser
     */
    we.router.search.parsers.postSearch = function postSearch(searchName, field, value, w) {
      return w[Op.or] = {
        title: {
          [Op.like]: '%'+value+'%'
        },
        body: {
          [Op.like]: '%'+value+'%'
        }
      }
    };
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

    const we = req.we;

    we.db.models.group.findById(id)
    .then( (group)=> {
      if (!group) {
        res.notFound();
        return null;
      }

      res.locals.group = group;

      if (!group.metadata) group.metadata = {};

      res.locals.widgetContext = 'group-' + group.id;

      if (!req.user) {
        next();
        return null;
      }

      we.utils.async.parallel([
        function loadMembership(next) {
          we.db.models.membership.find({
            where: { userId: req.user.id, groupId: group.id }
          })
          .then( (membership)=> {

            if (membership) {
              let roles = membership.roles;
              req.userRoleNames = req.userRoleNames.concat(roles.map( (r)=> {
                return 'group' + r.charAt(0).toUpperCase() + r.slice(1);
              }));

              req.userRoleNames.push('groupMember');

              res.locals.membership = membership;
              req.membership = membership;
            }

            next();
            return null;
          })
          .catch(res.queryError);
        },
        function loadFollowStatus(next) {
          we.db.models.follow.isFollowing(req.user.id, 'group', group.id)
          .then( (isFollowing)=> {
            res.locals.group.metadata.isFollowing = isFollowing;
            next();
            return null;
          })
          .catch(next);
        }
      ], next);
      return null;
    })
    .catch(next);
  }

  /**
   * Valid one route with membershpinviteKeyId param
   */
  plugin.expressValidInviteParams = function expressValidInviteParams(req, res, next, id) {
    req.we.db.models.membershipinvite.findById(id)
    .then( (membershipinvite)=> {
      if (!membershipinvite) {
        res.notFound();
      } else {
        next();
      }

      return null;
    })
    .catch(next);
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