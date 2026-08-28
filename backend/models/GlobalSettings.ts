import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface GlobalSettingsAttributes {
  id: number;
  settings: any;
  created_at: Date;
  updated_at: Date;
}

interface GlobalSettingsCreationAttributes extends Optional<GlobalSettingsAttributes, 'id' | 'created_at' | 'updated_at'> {}

class GlobalSettings extends Model<GlobalSettingsAttributes, GlobalSettingsCreationAttributes> implements GlobalSettingsAttributes {
  public id!: number;
  public settings!: any;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

GlobalSettings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
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
    tableName: 'global_settings',
    timestamps: false,
  }
);

export default GlobalSettings;
