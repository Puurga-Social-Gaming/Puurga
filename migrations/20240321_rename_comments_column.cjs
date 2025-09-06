'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('posts', 'comments', 'comment_count');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('posts', 'comment_count', 'comments');
  }
}; 