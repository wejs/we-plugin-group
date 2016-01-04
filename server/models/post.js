/**
 * Post
 *
 * @module      :: Model
 * @description :: Post model
 *
 */

module.exports = function Model(we) {
  var model = {
    definition: {
      active:{
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true,
        formFieldType: null
      },
      teaser: {
        type: we.db.Sequelize.TEXT,
        formFieldType: null
      },
      // post content
      body: {
        type: we.db.Sequelize.TEXT,
        allowNull: false
      },
      // image, text, link, video ...
      objectType: {
        type: we.db.Sequelize.STRING,
        formFieldType: null
      },
      // flag to highlight posts inside group
      highlighted: {
        type: we.db.Sequelize.BOOLEAN,
        formFieldType: null,
        defaultValue: false
      }
    },

    associations: {
      creator: {
        type: 'belongsTo',
        model: 'user'
      },
      wembed: {
        type: 'belongsTo',
        model: 'wembed',
        inverse: 'inPost'
      },
      group: {
        type: 'belongsTo',
        model: 'group'
      },
      categoryField: {
        type: 'hasOne',
        model: 'modelsterms',
        foreignKey: 'modelId',
        constraints: false,
        scope: {
          modelName: 'post',
          field: 'category'
        }
      }
    },

    options: {
      termFields: {
        category: {
          vocabularyName: 'Group-category',
          canCreate: false,
          formFieldMultiple: false,
          onlyLowercase: false
        },
        // tags: {
        //   vocabularyName: null,
        //   canCreate: true,
        //   formFieldMultiple: true,
        //   onlyLowercase: true
        // }
      },

      imageFields: {
        //featuredImage: { formFieldMultiple: false },
        images: { formFieldMultiple: true }
      },
      fileFields: {
        attachment: { formFieldMultiple: true }
      },

      classMethods: {
        /**
         * Context loader, preload current request record and related data
         *
         * @param  {Object}   req  express.js request
         * @param  {Object}   res  express.js response
         * @param  {Function} done callback
         */
        contextLoader: function contextLoader(req, res, done) {
          if (!res.locals.id || !res.locals.loadCurrentRecord) return done();

          return this.findOne({
            where: { id: res.locals.id},
            include: [{ all: true }]
          }).then(function (record) {
            res.locals.data = record;

            if (record) {
              if ( record.dataValues.creatorId && req.isAuthenticated()) {
                // set role owner
                if (record.isOwner(req.user.id)) {
                  if(req.userRoleNames.indexOf('owner') == -1 ) req.userRoleNames.push('owner');
                }
              }

              // redirect to post inside group
              if (record.groupId && !res.locals.group) {
                return res.redirect(we.router.urlTo(
                  'group.post.findOne', [record.groupId, record.id]
                ));
              }
            }

            return done();
          })
        },

        // returns an url for post record alias
        urlAlias: function urlAlias(record) {
          if (record.groupId) {
            return {
              alias:
                '/'+ we.i18n.__('group') + record.groupId +
                '/'+ we.i18n.__('post') +'/' + record.id ,
              target: '/group/'+record.groupId+'/post/' + record.id,
            }
          } else {
            return {
              alias:
                '/'+ we.i18n.__('post') +'/' + record.id,
                target: '/post/' + record.id,
            }
          }

        }
      },

      instanceMethods: {
        /**
         *et url path instance method
         *
         * @return {String} url path
         */
        getUrlPath: function getUrlPath() {
          if (this.groupId) {
            return we.router.urlTo(
              'group.post.findOne', [this.groupId, this.id]
            );
          } else {
            return we.router.urlTo(
              'post.findOne', [this.id]
            );
          }
        }
      },

      hooks: {
        beforeCreate: function beforeCreate(post, options, next) {
          if (!post.body) return next();
          var postBodyClean = we.utils.string(post.body)
            .stripTags().s;

          if (!postBodyClean) return next();

          post.teaser = postBodyClean.substr(0, 150);

          next(null, post);
        },

        beforeUpdate: function beforeUpdate(post, options, next) {
          if (!post.body) return next();
          var postBodyClean = we.utils.string(post.body)
            .stripTags().s;

          if (!postBodyClean) return next();

          post.teaser = postBodyClean.substr(0, 150);

          next(null, post);
        }
      }
    }
  }

  return model;
}