import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('Users', 'isPrivate', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'hideFromSuggestions', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'messageRequests', {
    type: DataTypes.ENUM('everyone', 'followers', 'none'),
    defaultValue: 'everyone',
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'showReadReceipts', {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'showOnlineStatus', {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'commentPrivacy', {
    type: DataTypes.ENUM('everyone', 'followers', 'none'),
    defaultValue: 'everyone',
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'storyPrivacy', {
    type: DataTypes.ENUM('everyone', 'followers', 'close_friends'),
    defaultValue: 'everyone',
    allowNull: false
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('Users', 'isPrivate');
  await queryInterface.removeColumn('Users', 'hideFromSuggestions');
  await queryInterface.removeColumn('Users', 'messageRequests');
  await queryInterface.removeColumn('Users', 'showReadReceipts');
  await queryInterface.removeColumn('Users', 'showOnlineStatus');
  await queryInterface.removeColumn('Users', 'commentPrivacy');
  await queryInterface.removeColumn('Users', 'storyPrivacy');
} 