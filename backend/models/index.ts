import sequelize from '../config/database';
import { Op } from 'sequelize';
import User from './User';
import Post from './Post';
import Comment from './Comment';
import Reaction from './Reaction';
import Like from './Like';
import Notification from './Notification';
import Follower from './Follower';
import FriendRequest from './FriendRequest';
import Friendship from './Friendship';
import Message from './Message';
import Conversation from './Conversation';
import ConversationParticipant from './ConversationParticipant';
import Status from './Status';
import PostPurge from './PostPurge';
import UserSurvivalState from './UserSurvivalState';
import Profile from './Profile';
import UserSettings from './UserSettings';
import GlobalSettings from './GlobalSettings';
import { setupAssociations } from './associations';

// Set up associations
setupAssociations();

// Export all models and sequelize instance
export {
  sequelize,
  Op,
  User,
  Post,
  Comment,
  Reaction,
  Like,
  Notification,
  Follower,
  FriendRequest,
  Friendship,
  Message,
  Conversation,
  ConversationParticipant,
  Status,
  PostPurge,
  UserSurvivalState,
  Profile,
  UserSettings,
  GlobalSettings
};

export default sequelize;