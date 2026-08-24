import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface PostAttributes {
  id?: string;
  user_id: string;
  content: string;
  media_url?: string;
  created_at?: Date;
  updated_at?: Date;
  last_edited?: Date;
  purge_count?: number;
  visibility?: string;
  background_index?: number;
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
  public purge_count?: number;
  public visibility?: string;
  public background_index?: number;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly User?: any;
  public readonly Comments?: any[];
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
  last_edited: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purge_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  visibility: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'public'
  },
  background_index: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Post',
  tableName: 'posts',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Post; 