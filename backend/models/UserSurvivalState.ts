import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface UserSurvivalStateAttributes {
  id?: string;
  user_id: string;
  visibility_score?: number;
  tier?: string;
  ghost_mode?: boolean;
  purge_count?: number;
  created_at?: Date;
  updated_at?: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

class UserSurvivalState extends Model<UserSurvivalStateAttributes> implements UserSurvivalStateAttributes {
  public id!: string;
  public user_id!: string;
  public visibility_score?: number;
  public tier?: string;
  public ghost_mode?: boolean;
  public purge_count?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };

  // Add proper typing for associations
  public readonly User?: any;
}

UserSurvivalState.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  visibility_score: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  tier: {
    type: DataTypes.STRING,
    defaultValue: 'STABLE'
  },
  ghost_mode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  purge_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  modelName: 'UserSurvivalState',
  tableName: 'user_survival_state',
  timestamps: true,
  underscored: true
});

// Define associations will be set up in associations.ts to avoid circular dependencies

export default UserSurvivalState;