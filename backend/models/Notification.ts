import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface NotificationAttributes {
  id?: string;
  receiver_id: string;
  sender_id?: string;
  type: string;
  content?: string;
  read: boolean;
  created_at?: Date;
  post_id?: string;
  comment_id?: string;
  receiver?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
  public id!: string;
  public receiver_id!: string;
  public sender_id?: string;
  public type!: string;
  public content?: string;
  public read!: boolean;
  public readonly created_at!: Date;
  public post_id?: string;
  public comment_id?: string;
  public receiver?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  public sender?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly Receiver?: any;
  public readonly Sender?: any;
}

Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  receiver_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  post_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  comment_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Notification;