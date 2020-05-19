/**
 * Group.js
 *
 * @description :: We.js group model
 */

module.exports = function Model(we) {
  const async = we.utils.async;

  const model = {
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
          //  TODO add suport to private group
          // 'private': 'Private'
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
        inverse: 'groups',
        constraints: false
      },
      creator: {
        type: 'belongsTo',
        model: 'user'
      }
    },

    options: {
      titleField: 'name',

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
        findAllMembers(modelId, cb) {
          we.db.models.membership.findAll({
            where: { modelId: modelId}
          })
          .then( (r)=> {
            return cb(null, r);
          })
          .catch(cb)
        },

        findOneMember(modelId, userId, cb) {
          we.db.models.membership.findOne({
            where: {
              userId: userId,
              groupId: modelId
            }
          })
          .then( (r)=> {
            return cb(null, r);
          })
          .catch(cb)
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
                  if(req.userRoleNames.indexOf('owner') == -1 ) req.userRoleNames.push('owner');
                }
              }
            }

            return done();
          })
          .catch(done);
        }
      },
      instanceMethods: {
        // createRole: function createRole(roleName, cb) {
        //   we.db.models.group.createRole(this.id, roleName, cb);
        // },
        createRequestMembership(userId, cb) {
          const self = this;
          we.db.models.membershiprequest.findOrCreate({
            where: {
              userId: userId, groupId: self.id
            },
            defaults: {
              userId: userId, groupId: self.id
            }
          })
          .spread( (membershiprequest)=> {
            cb(null, membershiprequest);
          })
          .catch(cb);
        },

        /**
         * Invite one user to group
         *
         * @todo check if this user already solicited invite and if solicited create a membership
         *
         * @param  {[type]}   userId invited user id
         * @param  {Function} cb     callback
         */
        inviteMember(inviterId, userId, name, text, email, cb) {
          const self = this;
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
          })
          .spread( (membershiprequest)=> {
            cb(null, membershiprequest);
          })
          .catch(cb);
        },

        /**
         * add user to group (join)
         *
         * @param  {String}   userId
         * @param  {Function} cb     callbak
         */
        userJoin(userId, cb) {
          const group = this;

          if (this.privacity == 'public') {
            this.addMember(userId, {
              through: { roles: ['member'] }
            })
            .then(function (r) {
              cb(null, {
                id: r[0][0],
                userId: userId,
                groupId: group.id
              });
            })
            .catch(cb);
          } else {
            we.db.models.membershipinvite
            .findOne({
              where: {
                groupId: group.id,
                userId: userId
              }
            })
            .then( (invite)=> {
              if (invite) {
                group.addMember(userId, {
                  through: { roles: ['member'] }
                })
                .then(function (r) {
                  cb(null, {
                    id: r[0][0],
                    userId: userId,
                    groupId: group.id
                  });
                }).catch(cb);
              } else {
                group.createRequestMembership(userId, cb);
              }
            })
            .catch(cb);
          }
        },

        userLeave(userId, cb) {
          this.removeMember(userId)
          .then( ()=> {
            cb();
          })
          .catch(cb);
        },

        // findAllRoles: function(cb) {
        //   // cache
        //   if (this.dataValues.roles) return cb(null, this.dataValues.roles);

        //   we.db.models.group.findAllGroupRoles(this.id, cb);
        // },

        findAllMembers(cb) {
          we.db.models.group.findAllMembers(this.id, (err, memberships)=> {
            if (err) {
              cb(err);
            } else {
              cb(null, memberships);
            }
          });
        },

        findOneMember(userId, cb) {
          we.db.models.group.findOneMember(this.id, userId, (err, membership)=> {
            if (err) {
              cb(err);
            } else {
              cb(null, membership);
            }
            return null;
          });
        },

        userCanAccessGroup(userId, cb) {
          switch(this.privacity) {
            case 'restrict':
            case 'private':
              if (!userId) return cb(null, false); // unAuthenticated

              this.findOneMember(userId, (err, is)=> {
                if (err) return cb(err);

                if (is) {
                  return cb(null, true);
                } else {
                  return cb(null, false);
                }
              })

              break;
            default:
              // public
              return cb(null, true);
          }

        },

        checkIfMemberIslastmanager(userId, cb) {
          we.db.models.membership.findAll({
            where: {
              roles: { [we.Op.like]: '%manager%' },
              groupId: this.id
            },
            attributes: ['userId'],
            limit: 2
          })
          .then( (r)=> {
            // no managers in this group ... something is wrong
            if (!r || !r.length) {
              cb(null, null);
            } else if (r.length > 1) {
            // more than one manager
              cb(null, false);
            } else if (r[0].userId != userId) {
              // not are the current manager
              cb(null, false)
            } else {
              // is the last manager member
              cb(null, true);
            }
          })
          .catch(cb);
        },

        loadMembersCount(cb) {
          we.db.models.membership.count({
            where: {
              groupId: this.id
            }
          })
          .then( (r)=> {
            cb(null, r);
          })
          .catch(cb)
        },

        loadCounts(cb) {
          const group = this;
          if (!group.dataValues.meta) {
            group.dataValues.meta = {};
          }

          async.parallel([
            function loadMembers(done) {
              group.loadMembersCount( (err, count)=> {
                if (err) return done(err);
                group.dataValues.meta.membersCount = count;
                done();
              });
            }
          ], cb);
        },
        generateDefaultWidgets(cb) {
          const self = this;

          we.utils.async.series([
            function (done) {
              we.db.models.widget.bulkCreate([{
                title: '',
                type: 'group-description',
                regionName: 'sidebar',
                context: 'group-' + self.id,
                theme: null,
                weight: 0
              },{
                title: we.i18n.__('group.menu.title'),
                type: 'group-menu',
                regionName: 'sidebar',
                context: 'group-' + self.id,
                theme: we.config.themes.app,
                weight: 1
              },{
                title: we.i18n.__('group.post.menu.title'),
                type: 'group-post-menu',
                regionName: 'sidebar',
                context: 'group-' + self.id,
                theme: null,
                weight: 2
              }])
              .then( ()=> {
                done();
              })
              .catch(done);
            }
          ], cb);
        }
      },
      hooks: {
        // After create default user admin and widgets
        afterCreate(record) {
          return new Promise( (resolve, reject)=> {
            we.utils.async.parallel([
              record.generateDefaultWidgets.bind(record),
              function registerAdmin(next) {
                if (!record.creatorId) {
                  return next();
                }

                record.addMember(record.creatorId, {
                  through: { roles: ['manager'] }
                })
                .then( ()=> {
                  next();
                })
                .catch(next);
              },
              function registerCreatorFollow(next) {
                if (!record.creatorId) return next();

                we.db.models.follow
                .follow('group', record.id, record.creatorId, (err, follow)=> {
                  if (err) {
                    return next(err);
                  }
                  we.log.verbose('we-plugin-group:group:afterCreate:newFollow:', follow);
                  next();
                });
              }
            ], (err)=> {
              if (err) return reject(err);
              resolve();
            });
          });
        },
        afterFind(record) {
          return new Promise( (resolve)=> {
            if (!record) return resolve();
            if ( we.utils._.isArray(record) ) {
              async.each(record, (r, next)=> {
                r.loadCounts(next);
              }, (err)=> {
                resolve(err);
              });
            } else {
              record.loadCounts(resolve);
            }
          });
        },
        afterDestroy(record) {
          return new Promise( (resolve, reject)=> {
            if (!record) return resolve();

            we.utils.async.parallel([
              function destroyWidgets(next) {
                we.db.models.widget.destroy({
                  where: { context: 'group-'+record.id }
                })
                .then( ()=> {
                  next();
                })
                .catch(next);
              },
              function destroyPosts(next) {
                we.db.models.post.destroy({
                  where: { groupId: record.id }
                })
                .then( ()=> {
                  next();
                })
                .catch(next);
              }
            ], (err)=> {
              if (err) return reject(err);
              resolve();
            });
          });
        }
      }
    }
  }

  return model;
}
