import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn('posts', 'purge_count', {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  });

  await queryInterface.addColumn('posts', 'visibility', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'public'
  });

  await queryInterface.addColumn('posts', 'background_index', {
    type: DataTypes.INTEGER,
    allowNull: true
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn('posts', 'purge_count');
  await queryInterface.removeColumn('posts', 'visibility');
  await queryInterface.removeColumn('posts', 'background_index');
}