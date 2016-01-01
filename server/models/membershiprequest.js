/**
 * Group content
 *
 * @description :: We.js Group content model
 */

module.exports = function Model(we) {
  return {
    definition: {
      userId: {
        type: we.db.Sequelize.INTEGER,
        allowNull: false
      },
      groupId: {
        type: we.db.Sequelize.INTEGER,
        allowNull: false
      }
    }
  };
};