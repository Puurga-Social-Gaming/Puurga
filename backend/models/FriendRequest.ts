import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface FriendRequestAttributes {
  id?: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: Date;
  updated_at?: Date;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  receiver?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class FriendRequest extends Model<FriendRequestAttributes> implements FriendRequestAttributes {
  public id!: string;
  public sender_id!: string;
  public receiver_id!: string;
  public status!: 'pending' | 'accepted' | 'rejected';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public sender?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  public receiver?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly Sender?: any;
  public readonly Receiver?: any;
}

FriendRequest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  receiver_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'FriendRequest',
  tableName: 'friend_requests',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default FriendRequest;