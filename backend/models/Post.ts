import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Comment from './Comment';

interface PostAttributes {
  id?: string;
  user_id: string;
  content: string;
  media_url?: string;
  created_at?: Date;
  updated_at?: Date;
  last_edited?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class Post extends Model<PostAttributes> implements PostAttributes {
  public id!: string;
  public user_id!: string;
  public content!: string;
  public media_url?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public last_edited?: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly User?: User;
  public readonly Comments?: Comment[];
}

Post.init({
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  media_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_edited: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Post',
  tableName: 'posts',
  timestamps: true,
  underscored: true
});

// Define associations
Post.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Post, { 
  foreignKey: 'user_id',
  as: 'posts'
});

Post.hasMany(Comment, { 
  foreignKey: 'post_id',
  as: 'postComments'
});

export default Post; 