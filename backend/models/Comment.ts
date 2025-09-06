import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Post from './Post';

interface CommentAttributes {
  id?: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at?: Date;
  updated_at?: Date;
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
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };

  // Add proper typing for associations
  public readonly User?: User;
  public readonly Post?: Post;
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

// Define associations with proper aliases
Comment.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'  // This matches the 'as' in our queries
});

Comment.belongsTo(Post, { 
  foreignKey: 'post_id',
  as: 'post'  // Add alias for post association
});

Post.hasMany(Comment, { 
  foreignKey: 'post_id',
  as: 'postComments'  // Changed from 'comments' to 'postComments' to avoid collision
});

User.hasMany(Comment, { 
  foreignKey: 'user_id',
  as: 'userComments'  // Changed from 'comments' to 'userComments' for consistency
});

export default Comment; 