import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface ConversationParticipantAttributes {
  id?: string;
  conversationId: string;
  userId: string;
  createdAt?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  conversation?: {
    id: string;
    name?: string;
    isGroup: boolean;
  };
}

class ConversationParticipant extends Model<ConversationParticipantAttributes> implements ConversationParticipantAttributes {
  public id!: string;
  public conversationId!: string;
  public userId!: string;
  public readonly createdAt!: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  public conversation?: {
    id: string;
    name?: string;
    isGroup: boolean;
  };

  // Add proper typing for associations
  public readonly User?: any;
  public readonly Conversation?: any;
}

ConversationParticipant.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ConversationParticipant',
    tableName: 'conversation_participants',
    timestamps: true,
  }
);

// Define associations will be set up in associations.ts to avoid circular dependencies

export default ConversationParticipant;