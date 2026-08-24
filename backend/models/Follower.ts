import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface FollowerAttributes {
  id?: string;
  follower_id: string;
  following_id: string;
  created_at?: Date;
  follower?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  following?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Follower extends Model<FollowerAttributes> implements FollowerAttributes {
  public id!: string;
  public follower_id!: string;
  public following_id!: string;
  public readonly created_at!: Date;
  public follower?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  public following?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly Follower?: any;
  public readonly Following?: any;
}

Follower.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  follower_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  following_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Follower',
  tableName: 'followers',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Follower;