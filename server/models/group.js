/**
 * Group.js
 *
 * @description :: We.js group model
 */

module.exports = function Model(we) {
  var async = we.utils.async;

  var model = {
    definition: {
      name: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },

      description: {
        type: we.db.Sequelize.TEXT,
        formFieldType: 'html',
        formFieldHeight: 200
      },

      // group | cource
      type: {
        type: we.db.Sequelize.STRING,
        defaultValue: 'group',
        formFieldType: null
      },

      // public | private
      privacity: {
        type: we.db.Sequelize.STRING,
        defaultValue: 'public',
        formFieldType: 'select' ,
        fieldOptions: {
          'public': 'Public',
          'private': 'Private'
        }
      },

      active: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true,
        formFieldType: null
      },

      meta: {
        type: we.db.Sequelize.VIRTUAL,
        formFieldType: null
      }
    },

    associations: {
      posts: {
        type: 'hasMany',
        model: 'post',
        inverse: 'group'
      },
      members: {
        type: 'belongsToMany',
        model: 'user',
        through: 'membership',
        inverse: 'groups'
      },
      creator: {
        type: 'belongsTo',
        model: 'user'
      }
    },

    options: {
      termFields: {
        categories: {
          vocabularyName: 'Group-category',
          canCreate: true,
          formFieldMultiple: true,
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
        logo: { formFieldMultiple: false },
        // banner: { formFieldMultiple: false }
      },
      // fileFields: {
      //   attachment: { formFieldMultiple: true }
      // },

      classMethods: {
        findAllMembers: function findAllMembers(modelId, cb) {
          we.db.models.membership.findAll({
            where: { modelId: modelId}
          }).then(function(r){cb(null, r);}).catch(cb)
        },

        findOneMember: function findOneMember(modelId, userId, cb) {
          we.db.models.membership.find({
            where: {
              memberId: userId,
              modelId: modelId
            }
          }).then(function(r){cb(null, r);}).catch(cb)
        },
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

              // redirect to posts list inside group
              if (res.locals.controller == 'group' && res.locals.action == 'findOne') {
                return res.redirect(we.router.urlTo(
                  'group.post.find', [record.id]
                ));
              }
            }

            return done();
          })
        }
      },
      instanceMethods: {
        // createRole: function createRole(roleName, cb) {
        //   we.db.models.group.createRole(this.id, roleName, cb);
        // },
        createRequestMembership: function(userId, cb) {
          var self = this;
          we.db.models.membershiprequest.findOrCreate({
            where: {
              userId: userId, groupId: self.id
            },
            defaults: {
              userId: userId, groupId: self.id
            }
          }).spread(function(membershiprequest) {
            cb(null, membershiprequest);
          }).catch(cb);
        },
//         addMember: function addMemberWithRole(userId, roleName, cb) {
//           if (!roleName) roleName = 'member';

//           if (we.config.groupRoles.indexOf(roleName) == -1)
//             return cb(new Error('Invalid role')) ;

// console.log('<<')

//           we.db.models.membership.findOrCreate({
//             where: {
//               memberId: userId,
//               modelId: this.id
//             },
//             defaults: {
//               memberId: userId,
//               modelId: this.id,
//               roles: roleName
//             }
//           }).spread(function(membership) {
//             console.log('>>')
//             cb(null, membership);
//           }).catch(cb);
//         },

        // removeMember: function removeMember(userId, cb) {
        //   var groupId = this.id;
        //   we.db.models.membership.find({
        //     where: {
        //       memberId: userId,
        //       modelId: groupId
        //     }
        //   }).then(function(membership) {
        //     if (!membership) return cb(null, null);

        //     membership.destroy().then(function() {
        //       we.db.models.follow.unFollow('group', groupId, userId, cb);
        //     }).catch(cb);
        //   }).catch(cb);
        // },

        /**
         * Invite one user to group
         *
         * @todo check if this user already solicited invite and if solicited create a membership
         *
         * @param  {[type]}   userId invited user id
         * @param  {Function} cb     callback
         */
        inviteMember: function inviteMember(inviterId, userId, name, text, email, cb) {
          var self = this;
          we.db.models.membershipinvite.findOrCreate({
            where: {
              email: email, groupId: self.id
            },
            defaults: {
              inviterId: inviterId,
              userId: userId, groupId: self.id,
              name: name,
              text: text,
              email: email
            }
          }).spread(function(membershiprequest) {
            cb(null, membershiprequest);
          }).catch(cb);
        },

        userJoin: function userJoin(userId, cb) {
          if (this.privacity == 'public') {
            this.addMember(userId, {
              roles: 'member'
            }).then(function(){
              cb();
            }).catch(cb);
          } else {
            this.createRequestMembership(userId, cb);
          }
        },

        userLeave: function userLeave(userId, cb) {
          this.removeMember(userId).then(function(){
            cb();
          }).catch(cb);
        },

        // findAllRoles: function(cb) {
        //   // cache
        //   if (this.dataValues.roles) return cb(null, this.dataValues.roles);

        //   we.db.models.group.findAllGroupRoles(this.id, cb);
        // },

        findAllMembers: function(cb) {
          we.db.models.group.findAllMembers(this.id, function(err, memberships){
            if (err) return cb(err);
            return cb(null, memberships);
          });
        },

        findOneMember: function(userId, cb) {
          we.db.models.group.findOneMember(this.id, userId, function(err, membership) {
            if (err) return cb(err);
            return cb(null, membership);
          });
        },

        // addContent: function addContent(contentModelName, contentId, cb) {
        //   we.db.models.groupcontent.findOrCreate({
        //     where: {
        //       groupName: 'group',
        //       groupId: this.id,
        //       contentModelName: contentModelName,
        //       contentId: contentId
        //     },
        //     defaults: {
        //       groupName: 'group',
        //       groupId: this.id,
        //       contentModelName: contentModelName,
        //       contentId: contentId
        //     }
        //   }).spread(function(groupcontent){
        //     cb(null, groupcontent);
        //   }).catch(cb);
        // },

        // removeContent: function removeContent(contentModelName, contentId, cb) {
        //   we.db.models.groupcontent.find({
        //     where: {
        //       groupName: 'group',
        //       groupId: this.id,
        //       contentModelName: contentModelName,
        //       contentId: contentId
        //     }
        //   }).then(function (groupcontent) {
        //     groupcontent.destroy().then(function(){
        //       cb();
        //     }).catch(cb);
        //   }).catch(cb);
        // },

        // findContent: function findContent(contentModelName, contentId, cb) {
        //   we.db.models.groupcontent.find({
        //     where: {
        //       groupName: 'group',
        //       groupId: this.id,
        //       contentModelName: contentModelName,
        //       contentId: contentId
        //     }
        //   }).then(function(r){cb(null, r);}).catch(cb)
        // },

        loadMembersCount: function loadMembersCount(cb) {
          we.db.models.membership.count({
            where: {
              groupId: this.id
            }
          }).then(function(r){cb(null, r);}).catch(cb)
        },

        // loadContentCount: function loadContentCount(cb) {
        //   we.db.models.groupcontent.count({
        //     where: {
        //       groupName: 'group',
        //       groupId: this.id
        //     }
        //   }).then(function(r){cb(null, r);}).catch(cb)
        // },

        loadCounts: function loadCounts(cb) {
          var group = this;
          if (!group.dataValues.meta) group.dataValues.meta = {};

          async.parallel([
            function loadMembers(done) {
              group.loadMembersCount(function(err, count) {
                if (err) return done(err);
                group.dataValues.meta.membersCount = count;
                done();
              });
            },
            // function loadContentCount(done) {
            //   group.loadContentCount(function(err, count) {
            //     if(err) return done(err);
            //     group.dataValues.meta.contentsCount = count;
            //     done();
            //   })
            // }
          ], cb);
        }
      },
      hooks: {
        // After create default roles and register admin member
        afterCreate: function(record, options, next) {
          record.addMember(record.creatorId, { roles: ['manager']} )
          .then(function(){
            next();
          }).catch(next);
        },
        afterFind: function(record, options, next) {
          if (!record) return next();
          if ( we.utils._.isArray(record) ) {
            async.each(record, function(r, next){
              r.loadCounts(next);
            }, function (err){
              next(err);
            });
          } else {
            record.loadCounts(next);
          }
        }
      }
    }
  }

  // we.hooks.on('we:before:send:okResponse',  function(data, done) {
  //   if (data.res.locals.model != 'group') return done();

  //   if (data.res.locals.record) {
  //     if (_.isArray(data.res.locals.record)) {
  //       return async.each(data.res.locals.record, function(record, next) {
  //         record.loadCounts(function(err) {
  //           if (err) return data.res.serverError(err);
  //           if (!data.req.user.id) return next();

  //           we.db.models.membership.find({where: {
  //             modelId: record.id,
  //             memberId: data.req.user.id
  //           }}).then(function (result){
  //             // save current user group membership in metadata
  //             if (result) record.dataValues.meta.membership = result;
  //             next();
  //           });
  //         });
  //       }, done);
  //     } else {
  //       return data.res.locals.record.loadCounts(function(err) {
  //         if (err) return data.res.serverError(err);
  //           if (!data.req.user.id) return done();
  //           we.db.models.membership.find({where: {
  //             modelId: data.res.locals.record.id,
  //             memberId: data.req.user.id
  //           }}).then(function (result) {
  //             // save current user group membership in metadata
  //             if (result) data.res.locals.record.dataValues.meta.membership = result;
  //             done();
  //           });
  //       });
  //     }
  //   }
  // });

  return model;
}
