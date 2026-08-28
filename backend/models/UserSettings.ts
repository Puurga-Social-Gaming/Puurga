import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserSettingsAttributes {
  id: string;
  user_id: string;
  settings: any;
  created_at: Date;
  updated_at: Date;
}

interface UserSettingsCreationAttributes extends Optional<UserSettingsAttributes, 'id' | 'created_at' | 'updated_at'> {}

class UserSettings extends Model<UserSettingsAttributes, UserSettingsCreationAttributes> implements UserSettingsAttributes {
  public id!: string;
  public user_id!: string;
  public settings!: any;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_settings',
    timestamps: false,
  }
);

export default UserSettings;
