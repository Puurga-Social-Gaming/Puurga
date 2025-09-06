import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface StatusAttributes {
  id?: string;
  userId: string;
  content?: string;
  mediaUrl?: string;
  type: 'text' | 'media';
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Status extends Model<StatusAttributes> implements StatusAttributes {
  public id!: string;
  public userId!: string;
  public content?: string;
  public mediaUrl?: string;
  public type!: 'text' | 'media';
  public expiresAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly User?: User;
}

Status.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
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
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('text', 'media'),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Status',
    tableName: 'statuses',
    timestamps: true,
  }
);

// Define associations
Status.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Status, { 
  foreignKey: 'userId',
  as: 'statuses'
});

export default Status; 