/**
 * post Controller
 *
 * @module    :: Controller
 */
module.exports = {
  find(req, res) {
    let requiredModelsTerms = true;

    // post teaser list, use with responseType=modal query param
    if (req.query.teaserList)
      res.locals.template = 'post/teaser-list';
    // filter by groupId
    if (res.locals.group) {
      // create link in group
      res.locals.createPostUrl = '/group/'+res.locals.group.id+'/post/create';
      // set group where filter
      res.locals.query.where.groupId = res.locals.group.id;

      res.locals.query.order = [
        ['highlighted', 'DESC'],
        ['createdAt', 'DESC']
      ];
    } else {
      // create link
      res.locals.createPostUrl = '/post/create';
    }

    if (req.query.category) {
      if (req.query.category == 'null') {
        // find posts without category
        req.query.category = null;
        requiredModelsTerms = false;

        res.locals.query.where.$and = [
          [' categoryField.termId IS NULL ', []]
        ];
      }

      // filter by category
      res.locals.query.include.push({
        model: req.we.db.models.modelsterms,
        as: 'categoryField',
        required: requiredModelsTerms,
        include: [{
          model: req.we.db.models.term, as: 'term',
          required: requiredModelsTerms,
          where: { text: req.query.category }
        }]
      });
    }

    // follow
    if (req.isAuthenticated()) {
      if (req.query.follow) {
        res.locals.query.include.push({
          model: req.we.db.models.follow,
          as: 'follow',
          required: false,
          attributes: ['id'],
          where: {
            userId: req.user.id
          }
        });

        res.locals.query.where.$or = [
          [' follow.id IS NOT NULL '],
          [' `group.follow`.`id` IS NOT NULL '],
          // TODO add posts from people how you follow
          // [' `creator.follow`.`id` IS NOT NULL ']
        ];

        let groupAssoc;
        for (let i = res.locals.query.include.length - 1; i >= 0; i--) {
          if (res.locals.query.include[i].as == 'group') {
            groupAssoc = res.locals.query.include[i];
            break;
          }
        }

        groupAssoc.include = [
          {
            model: req.we.db.models.follow,
            as: 'follow',
            required: false,
            attributes: ['id'],
            where: {
              userId: req.user.id
            }
          }
        ];
      }
    }

    res.locals.Model.findAll(res.locals.query)
    .then( (records)=> {
      if (req.we.plugins['we-plugin-notification'] && req.isAuthenticated()) {
        // mark this posts as read
        let recordIds = records.map( (r)=> {
          return r.id;
        });

        req.we.db.models.notification
        .update({
          read: true
        }, {
          where: {
            modelId: recordIds,
            modelName: 'post',
            userId: req.user.id
          }
        })
        .catch( (err)=> {
          req.we.log.error(err);
          return null;
        });
      }

      res.locals.data = records;

      res.locals.Model.count(res.locals.query)
      .then( (count)=> {

        res.locals.metadata.count = count;
        res.ok();
        return null;
      })
      .catch(res.queryError);

      return null;
    })
    .catch(res.queryError);
  },

  findOne(req, res, next) {
    if (!res.locals.data) return next();
    // mark this post notifications as read
    if (req.we.plugins['we-plugin-notification'] && req.isAuthenticated()) {

      req.we.db.models.notification
      .update({
        read: true
      }, {
        where: {
          modelId: res.locals.data.id,
          modelName: 'post' ,
          userId: req.user.id
        }
      })
      .catch( (err)=> {
        req.we.log.error(err);
        return null;
      });
    }

    return res.ok();
  },

  create(req, res) {
    if (!res.locals.template) res.locals.template = res.locals.model + '/' + 'create';

    res.locals.data = req.body;

    if (req.method === 'POST') {
      if (req.isAuthenticated()) req.body.creatorId = req.user.id;

      if (res.locals.group) {
        req.body.groupId = res.locals.group.id;
      }

      return res.locals.Model.create(req.body)
      .then( (record)=> {
        res.locals.data = record;

        try {
          // register notifications in parallel
          record.registerCreatePostNotifications(req, res, (err)=> {
            if (err) req.we.log.error('Error in create post notifications: ',err);
          });
        } catch (e) {
          req.we.log.error(e);
        }
        if (!res.locals.redirectTo) {
          res.locals.redirectTo = record.getUrlPath();
        }
        // if dont are inside one group
        res.created();
        return null;
      }).catch(res.queryError);
    } else {
      res.locals.data = req.query;
      res.ok();
    }
  }
};