import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Create reactions table
  await queryInterface.createTable('reactions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Add indexes for better performance
  await queryInterface.addIndex('reactions', ['postId']);
  await queryInterface.addIndex('reactions', ['userId']);
  await queryInterface.addIndex('reactions', ['type']);

  // Update notifications table to support reactions
  await queryInterface.addColumn('notifications', 'reactionType', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  // Update the type enum in notifications table
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'reaction';
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove reaction type from notifications type enum
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_notifications_type" RENAME TO "enum_notifications_type_old";
    CREATE TYPE "enum_notifications_type" AS ENUM ('friend_request', 'friend_accept', 'comment', 'like');
    ALTER TABLE notifications 
      ALTER COLUMN type TYPE "enum_notifications_type" 
      USING type::text::"enum_notifications_type";
    DROP TYPE "enum_notifications_type_old";
  `);

  // Remove reactionType column from notifications
  await queryInterface.removeColumn('notifications', 'reactionType');

  // Drop reactions table
  await queryInterface.dropTable('reactions');
} 