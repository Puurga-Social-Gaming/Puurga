import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface PostPurgeAttributes {
  id?: string;
  post_id: string;
  user_id: string;
  created_at?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  post?: {
    id: string;
    content: string;
  };
}

class PostPurge extends Model<PostPurgeAttributes> implements PostPurgeAttributes {
  public id!: string;
  public post_id!: string;
  public user_id!: string;
  public readonly created_at!: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  public post?: {
    id: string;
    content: string;
  };

  // Add proper typing for associations
  public readonly User?: any;
  public readonly Post?: any;
}

PostPurge.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  post_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'posts',
      key: 'id'
    }
  },
  user_id: {
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
  modelName: 'PostPurge',
  tableName: 'post_purges',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default PostPurge;