import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface MessageAttributes {
  id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Message extends Model<MessageAttributes> implements MessageAttributes {
  public id!: string;
  public conversationId!: string;
  public senderId!: string;
  public content!: string;
  public read!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public sender?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly User?: any;
  public readonly Conversation?: any;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id',
      },
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
  }
);

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Message; 