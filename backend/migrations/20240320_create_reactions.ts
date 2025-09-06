import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('reactions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('reactions', ['post_id']);
  await queryInterface.addIndex('reactions', ['user_id']);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('reactions');
} 