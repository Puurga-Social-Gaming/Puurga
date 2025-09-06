import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('messages', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    receiver_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('messages', ['sender_id']);
  await queryInterface.addIndex('messages', ['receiver_id']);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('messages');
} 