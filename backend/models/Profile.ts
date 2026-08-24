import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface ProfileAttributes {
  id: string;
  full_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  cover_photo?: string;
  bio?: string;
  location?: string;
  website?: string;
  occupation?: string;
  education?: string;
  relationship?: string;
  role?: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
  is_private?: boolean;
  hide_from_suggestions?: boolean;
  message_requests?: 'everyone' | 'followers' | 'none';
  show_read_receipts?: boolean;
  show_online_status?: boolean;
  comment_privacy?: 'everyone' | 'followers' | 'none';
  story_privacy?: 'everyone' | 'followers' | 'close_friends';
  is_blocked?: boolean;
  purga_points?: number;
  certification_slug?: string;
  logo_certified?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

class Profile extends Model<ProfileAttributes> implements ProfileAttributes {
  public id!: string;
  public full_name?: string;
  public username?: string;
  public email?: string;
  public avatar_url?: string;
  public cover_photo?: string;
  public bio?: string;
  public location?: string;
  public website?: string;
  public occupation?: string;
  public education?: string;
  public relationship?: string;
  public role?: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
  public is_private?: boolean;
  public hide_from_suggestions?: boolean;
  public message_requests?: 'everyone' | 'followers' | 'none';
  public show_read_receipts?: boolean;
  public show_online_status?: boolean;
  public comment_privacy?: 'everyone' | 'followers' | 'none';
  public story_privacy?: 'everyone' | 'followers' | 'close_friends';
  public is_blocked?: boolean;
  public purga_points?: number;
  public certification_slug?: string;
  public logo_certified?: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Profile.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cover_photo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  occupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  education: {
    type: DataTypes.STRING,
    allowNull: true
  },
  relationship: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'super_admin', 'superadmin', 'business'),
    defaultValue: 'user'
  },
  is_private: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hide_from_suggestions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  message_requests: {
    type: DataTypes.ENUM('everyone', 'followers', 'none'),
    defaultValue: 'everyone'
  },
  show_read_receipts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  show_online_status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  comment_privacy: {
    type: DataTypes.ENUM('everyone', 'followers', 'none'),
    defaultValue: 'everyone'
  },
  story_privacy: {
    type: DataTypes.ENUM('everyone', 'followers', 'close_friends'),
    defaultValue: 'everyone'
  },
  is_blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  purga_points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  certification_slug: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logo_certified: {
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
  modelName: 'Profile',
  tableName: 'profiles',
  timestamps: true,
  underscored: true
});

export default Profile;