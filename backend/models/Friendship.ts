import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface FriendshipAttributes {
  id?: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at?: Date;
  updated_at?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  friend?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Friendship extends Model<FriendshipAttributes> implements FriendshipAttributes {
  public id!: string;
  public user_id!: string;
  public friend_id!: string;
  public status!: 'pending' | 'accepted' | 'blocked';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  public friend?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly User?: any;
  public readonly Friend?: any;
}

Friendship.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  friend_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'blocked'),
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
  modelName: 'Friendship',
  tableName: 'friendships',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Friendship;