/**
 * Post
 *
 * @module      :: Model
 * @description :: Post model
 *
 */

module.exports = function Model(we) {
  const isEmpty = we.utils._.isEmpty;

  const model = {
    definition: {
      active:{
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true,
        formFieldType: null
      },
      // optional title
      title: {
        type: we.db.Sequelize.STRING,
        formFieldType: null
      },
      // auto set teaser
      teaser: {
        type: we.db.Sequelize.TEXT,
        formFieldType: null
      },
      // post content
      body: {
        type: we.db.Sequelize.TEXT,
        formFieldType: 'html',
        formFieldHeight: '300',
        allowNull: false
      },
      // image, text, link, video ...
      objectType: {
        type: we.db.Sequelize.STRING,
        defaultValue: 'text',
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
      titleField: 'title',

      termFields: {
        category: {
          vocabularyName: 'Group-category',
          formFieldType: 'post/category',
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
        setPostTeaser(post, options, next) {
          if (!post.body) return next();
          const postBodyClean = we.utils.string(post.body)
            .stripTags().s;

          if (!postBodyClean) return next();

          post.teaser = postBodyClean.substr(0, 150);

          next(null, post);
        },
        setPostObjectType(post, options, next) {

          if (!isEmpty(post.images) && !isEmpty(post.attachment)) {
            post.objectType = 'multimedia';
          } else if (!isEmpty(post.images)) {
            post.objectType = 'image';
          } else if (!isEmpty(post.attachment)){
            post.objectType = 'file';
          } else if(post.wembedId) {
            post.objectType = 'link';
          } else {
            post.objectType = 'text';
          }

          next();
        },
        /**
         * Context loader, preload current request record and related data
         *
         * @param  {Object}   req  express.js request
         * @param  {Object}   res  express.js response
         * @param  {Function} done callback
         */
        contextLoader(req, res, done) {
          if (!res.locals.id || !res.locals.loadCurrentRecord) return done();

          return this.findOne({
            where: { id: res.locals.id},
            include: [{ all: true }]
          })
          .then( (record)=> {
            res.locals.data = record;

            if (record) {
              if ( record.dataValues.creatorId && req.isAuthenticated()) {
                // set role owner
                if (record.isOwner(req.user.id)) {
                  if(req.userRoleNames.indexOf('owner') == -1 ) {
                    req.userRoleNames.push('owner');
                  }
                }
              }

              // redirect to post inside group
              if (record.groupId && !res.locals.group) {
                res.redirect(we.router.urlTo(
                  'group.post.findOne', [record.groupId, record.id]
                ));
                return null;
              }
            }

            done();
            return null;
          })
        },

        // returns an url for post record alias
        urlAlias(record) {
          let alias, target;

          if (record.groupId) {
            alias = '/'+ we.i18n.__('group') +'/'+ record.groupId +
                '/'+ we.i18n.__('post') +'/' + record.id;
            target = '/group/'+record.groupId+'/post/' + record.id;
          } else {
            alias  = '/'+ we.i18n.__('post') +'/' + record.id;
            target = '/post/' + record.id;
          }

          // skip if alias is = target
          if (alias == target) {
            return null;
          }

          return {
            alias: alias,
            target: target
          }
        }
      },

      instanceMethods: {
        /**
         * set url path instance method
         *
         * @return {String} url path
         */
        getUrlPath() {
          if (this.groupId) {
            return we.router.urlTo(
              'group.post.findOne', [this.groupId, this.id]
            );
          } else {
            return we.router.urlTo(
              'post.findOne', [this.id]
            );
          }
        },

        registerCreatePostNotifications(req, res, next) {

          if (
            !req.we.plugins['we-plugin-notification'] ||
            !req.we.plugins['we-plugin-flag'] ||
            !res.locals.data
          ) {
            return next();
          }

          let record = this;
          let followers = [];

          req.we.utils.async.series([
            function getFollowers(done) {
              if (!req.isAuthenticated()) {
                return done();
              }

              let where;

              if (res.locals.data.groupId) {
                where = {
                  $or: [
                    {
                      modelName: 'group',
                      modelId: res.locals.group.id
                    },
                    {
                      modelName: 'user',
                      modelId: req.user.id
                    },
                  ]
                };
              } else {
                where = {
                  modelName: 'user',
                  modelId: req.user.id
                };
              }
              // get followers
              req.we.db.models.follow
              .findAll({
                where: where,
                attributes: ['userId']
              })
              .then( (r)=> {
                followers = r;
                done();
                return null;
              })
              .catch(done);
            }
          ], (err)=> {
            if (err) return next(err);

            res.locals.createdPostUserNotified = {};

            if (res.locals.group) {
              req.we.utils.async.eachSeries(followers, record.createNotificationInGroup.bind({
                req: req, res: res, we: req.we
              }), next);
            } else {
              req.we.utils.async.eachSeries(followers, record.createNotification.bind({
                req: req, res: res, we: req.we
              }), next);
            }
            return null;
          });
        },

        /**
         * Create one post notification without group
         *
         * @param  {Object}   follower follow record
         * @param  {Function} done     callback
         */
        createNotification(follower, done) {
          if (
            this.res.locals.createdPostUserNotified[follower.userId] ||
            (follower.userId == this.res.locals.data.creatorId)
          ) {
            return done();
          }

          const self = this,
            actor = this.req.user,
            hostname = this.req.we.config.hostname,
            record = this.res.locals.data;

          let localeText;
          if (record.title) {
            localeText = 'post.'+record.objectType+'.create.notification.title.withTitle';
          } else {
            localeText = 'post.'+record.objectType+'.create.notification.title';
          }

          // after create register one notifications
          this.req.we.db.models.notification.create({
            locale: this.res.locals.locale,
            title: this.res.locals.__(localeText, {
              actorURL: hostname+'/user/'+actor.id,
              recordURL: hostname+'/post/'+record.id,
              hostname: hostname,
              actor: actor,
              record: record
            }),
            text: record.teaser,
            redirectUrl: hostname+'/post/'+record.id,
            userId: follower.userId,
            actorId: actor.id,
            modelName: 'post',
            modelId: record.id,
            type: 'post-created-in-group'
          })
          .then( (r)=> {

            self.res.locals.createdPostUserNotified[follower.userId] = true;

            self.req.we.log.verbose('New post notification, id: ', r.id);
            done(null, r);
            return null;
          })
          .catch(done);
        },

        /**
         * Create one post notification in group
         *
         * @param  {Object}   follower follow record
         * @param  {Function} done     callback
         */
        createNotificationInGroup(follower, done) {
          if (
            this.res.locals.createdPostUserNotified[follower.userId] ||
            (follower.userId == this.res.locals.data.creatorId)
          ) {
            return done();
          }

          const self = this,
            group = this.res.locals.group,
            actor = this.req.user,
            hostname = this.req.we.config.hostname,
            record = this.res.locals.data;

          let localeText;
          if (record.title) {
            localeText = 'post.'+record.objectType+'.create.notification.inGroup.title.withTitle';
          } else {
            localeText = 'post.'+record.objectType+'.create.notification.inGroup.title';
          }

          // after create register one notifications
          this.req.we.db.models.notification.create({
            locale: this.res.locals.locale,
            title: this.res.locals.__(localeText, {
              actorURL: hostname+'/user/'+actor.id,
              recordURL: hostname+'/post/'+record.id,
              groupURL: hostname+'/group/'+group.id,
              hostname: hostname,
              actor: actor,
              record: record,
              group: group
            }),
            text: record.teaser,
            redirectUrl: '/post/'+record.id,
            userId: follower.userId,
            actorId: actor.id,
            modelName: 'post',
            modelId: record.id,
            type: 'post-created-in-group'
          })
          .then( (r)=> {
            self.res.locals.createdPostUserNotified[follower.userId] = true;
            self.req.we.log.verbose('New post notification in group, id: ', r.id);
            done(null, r);
            return null;
          })
          .catch(done);
        }
      },

      hooks: {
        beforeCreate(post, options, next) {
          we.db.models.post.setPostTeaser(post, options, ()=> {
            we.db.models.post.setPostObjectType(post, options, next);
          });
        },

        beforeUpdate(post, options, next) {
          we.db.models.post.setPostTeaser(post, options, ()=> {
            we.db.models.post.setPostObjectType(post, options, next);
          });
        },

        // After create add user as follower
        afterCreate(record, options, next) {
          if (!record.creatorId) return next();

          we.db.models.follow
          .follow('post', record.id, record.creatorId, (err, follow)=> {
            if (err) return next(err);
            we.log.verbose('we-plugin-group:post:afterCreate:newFollow:', follow);
            next();
            return null;
          });
        }
      }
    }
  }

  return model;
}