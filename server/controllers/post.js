/**
 * post Controller
 *
 * @module    :: Controller
 */
module.exports = {
  find: function findAll(req, res) {
    var requiredModelsTerms = true;

    // filter by groupId
    if (res.locals.group) {
      res.locals.query.where.groupId = res.locals.group.id;
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

    res.locals.Model.findAll(res.locals.query)
    .then(function (records) {

      res.locals.data = records;

      res.locals.Model.count(res.locals.query)
      .then(function (count) {

        res.locals.metadata.count = count;
        res.ok();

      }).catch(res.queryError);

    }).catch(res.queryError);
  },
  create: function create(req, res) {
    if (!res.locals.template) res.locals.template = res.locals.model + '/' + 'create';

    if (!res.locals.data) res.locals.data = {};

     req.we.utils._.merge(res.locals.data, req.query);

    if (req.method === 'POST') {
      if (req.isAuthenticated()) req.body.creatorId = req.user.id;

      // set temp record for use in validation errors
      res.locals.data = req.query;
      req.we.utils._.merge(res.locals.data, req.body);

      if (res.locals.group) {
        req.body.groupId = res.locals.group.id;
      }

      return res.locals.Model.create(req.body)
      .then(function (record) {
        res.locals.data = record;
        // if dont are inside one group
        return res.created();
      }).catch(res.queryError);
    } else {
      res.locals.data = req.query;
      res.ok();
    }
  }
};