/**
 * Wembed  - page embed with wembed
 *
 * @module      :: Model
 * @description :: Wembed model
 *
 */

module.exports = function Model(we) {
  var model = {
    definition: {
      creatorId: { type: we.db.Sequelize.BIGINT },
      // shared page url
      url: {
        type: we.db.Sequelize.STRING,
        allowNull: false,
      },

      wembedId: {
        type: we.db.Sequelize.STRING,
        allowNull: false,
      },
      // page domain
      domain: {
        type: we.db.Sequelize.STRING,
        allowNull: false,
      },
      // time how the page is scaned
      cacheTime: {
        type:  we.db.Sequelize.DATE,
        allowNull: false,
      },

      title: {
        type: we.db.Sequelize.STRING,
      },

      description: {
        type: we.db.Sequelize.TEXT,
      },

      // youtube, vimeo ... wikipedia
      provider: {
        type: we.db.Sequelize.STRING,
      },

      pageId: {
        type: we.db.Sequelize.STRING,
      },

      pageType: {
        type: we.db.Sequelize.STRING,
      },

      imageIndex: {
        type: we.db.Sequelize.INTEGER,
        defaultValue: 0
      },

      thumbnail: {
        type: we.db.Sequelize.STRING,
      },

      thumbnailMime: {
        type: we.db.Sequelize.STRING,
      }
    },

    associations: {
      inPost:  {
        emberOnly: true,
        type: 'belongsTo',
        model: 'post',
        inverse: 'wembed'
      }
    }
  }

  return model;
}