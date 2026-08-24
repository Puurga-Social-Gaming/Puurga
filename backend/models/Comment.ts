import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface CommentAttributes {
  id?: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at?: Date;
  updated_at?: Date;
  is_purged?: boolean;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
}

class Comment extends Model<CommentAttributes> implements CommentAttributes {
  public id!: string;
  public post_id!: string;
  public user_id!: string;
  public content!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public is_purged?: boolean;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };

  // Add proper typing for associations
  public readonly User?: any;
  public readonly Post?: any;
}

Comment.init({
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_purged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  modelName: 'Comment',
  tableName: 'comments',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Comment; 