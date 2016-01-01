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
        allowNull: false,
        formFieldType: 'html',
        formFieldHeight: '200'
      },
      // image, text, link, video ...
      objectType: {
        type: we.db.Sequelize.STRING,
        formFieldType: null
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

  return model;
}