import { QueryInterface, DataTypes } from 'sequelize';

export = {
  async up(queryInterface: QueryInterface) {
    return queryInterface.addColumn('posts', 'last_edited', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down(queryInterface: QueryInterface) {
    return queryInterface.removeColumn('posts', 'last_edited');
  }
}; 