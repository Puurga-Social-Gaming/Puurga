import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

interface UserAttributes {
  id?: string;
  name: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  role?: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
  is_private?: boolean;
  hide_from_suggestions?: boolean;
  message_requests?: 'everyone' | 'followers' | 'none';
  show_read_receipts?: boolean;
  show_online_status?: boolean;
  comment_privacy?: 'everyone' | 'followers' | 'none';
  story_privacy?: 'everyone' | 'followers' | 'close_friends';
  is_blocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public username!: string;
  public email!: string;
  public password!: string;
  public avatar?: string;
  public bio?: string;
  public role?: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
  public is_private?: boolean;
  public hide_from_suggestions?: boolean;
  public message_requests?: 'everyone' | 'followers' | 'none';
  public show_read_receipts?: boolean;
  public show_online_status?: boolean;
  public comment_privacy?: 'everyone' | 'followers' | 'none';
  public story_privacy?: 'everyone' | 'followers' | 'close_friends';
  public is_blocked?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Add method to check password
  public async checkPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'super_admin', 'superadmin', 'business'),
      defaultValue: 'user',
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    hide_from_suggestions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    message_requests: {
      type: DataTypes.ENUM('everyone', 'followers', 'none'),
      defaultValue: 'everyone',
    },
    show_read_receipts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    show_online_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    comment_privacy: {
      type: DataTypes.ENUM('everyone', 'followers', 'none'),
      defaultValue: 'everyone',
    },
    story_privacy: {
      type: DataTypes.ENUM('everyone', 'followers', 'close_friends'),
      defaultValue: 'everyone',
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User; 