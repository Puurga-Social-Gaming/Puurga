import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('Users', 'cover_photo', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'bio', {
    type: DataTypes.TEXT,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'location', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'website', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'occupation', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'education', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('Users', 'relationship', {
    type: DataTypes.STRING,
    allowNull: true
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('Users', 'cover_photo');
  await queryInterface.removeColumn('Users', 'bio');
  await queryInterface.removeColumn('Users', 'location');
  await queryInterface.removeColumn('Users', 'website');
  await queryInterface.removeColumn('Users', 'occupation');
  await queryInterface.removeColumn('Users', 'education');
  await queryInterface.removeColumn('Users', 'relationship');
} 