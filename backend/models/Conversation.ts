import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Message from './Message';

interface ConversationAttributes {
  id?: string;
  name?: string;
  isGroup: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  participants?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  }[];
}

class Conversation extends Model<ConversationAttributes> implements ConversationAttributes {
  public id!: string;
  public name?: string;
  public isGroup!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public participants?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  }[];

  // Add proper typing for associations
  public readonly Users?: User[];
  public readonly Messages?: Message[];
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isGroup: {
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
    modelName: 'Conversation',
    tableName: 'conversations',
    timestamps: true,
  }
);

// Define associations
Conversation.belongsToMany(User, {
  through: 'conversation_participants',
  foreignKey: 'conversationId',
  otherKey: 'userId',
  as: 'participants'
});

User.belongsToMany(Conversation, {
  through: 'conversation_participants',
  foreignKey: 'userId',
  otherKey: 'conversationId',
  as: 'conversations'
});

Conversation.hasMany(Message, {
  foreignKey: 'conversationId',
  as: 'messages'
});

export default Conversation; 