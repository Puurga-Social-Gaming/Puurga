'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const migrations = [
      '20231115_add_last_edited_to_posts.ts',
      '20231116_add_privacy_settings.ts',
      '20240318_add_profile_fields.ts',
      '20240319_create_notifications.ts'
    ];

    // Create SequelizeMeta table if it doesn't exist
    await queryInterface.createTable('SequelizeMeta', {
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      }
    }).catch(() => {
      // Table might already exist, ignore error
    });

    // Insert completed migrations
    await queryInterface.bulkInsert('SequelizeMeta', 
      migrations.map(name => ({ name })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface, Sequelize) {
    const migrations = [
      '20231115_add_last_edited_to_posts.ts',
      '20231116_add_privacy_settings.ts',
      '20240318_add_profile_fields.ts',
      '20240319_create_notifications.ts'
    ];

    await queryInterface.bulkDelete('SequelizeMeta', {
      name: migrations
    });
  }
};
