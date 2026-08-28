import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface StatusAttributes {
  id?: string;
  user_id: string;
  content?: string;
  media_url?: string;
  type: 'text' | 'media';
  gradient_index?: number;
  view_count?: number;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Status extends Model<StatusAttributes> implements StatusAttributes {
  public id!: string;
  public user_id!: string;
  public content?: string;
  public media_url?: string;
  public type!: 'text' | 'media';
  public gradient_index?: number;
  public view_count?: number;
  public expires_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  public readonly User?: any;
}

Status.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    media_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('text', 'media'),
      allowNull: false,
    },
    gradient_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Status',
    tableName: 'statuses',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Status;
