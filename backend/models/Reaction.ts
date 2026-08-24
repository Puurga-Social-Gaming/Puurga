import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface ReactionAttributes {
  id?: string;
  post_id: string;
  user_id: string;
  type: string;
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

class Reaction extends Model<ReactionAttributes> implements ReactionAttributes {
  public id!: string;
  public post_id!: string;
  public user_id!: string;
  public type!: string;
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

Reaction.init({
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
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Reaction',
  tableName: 'reactions',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default Reaction;