import sequelize from '../config/database';
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

// Set up all model associations
export function setupAssociations() {
  // User associations
  User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
  User.hasMany(Comment, { foreignKey: 'user_id', as: 'userComments' });
  User.hasMany(Reaction, { foreignKey: 'user_id', as: 'reactions' });
  User.hasMany(Like, { foreignKey: 'user_id', as: 'likes' });
  User.hasMany(Notification, { foreignKey: 'receiver_id', as: 'receivedNotifications' });
  User.hasMany(Notification, { foreignKey: 'sender_id', as: 'sentNotifications' });
  User.hasMany(Follower, { foreignKey: 'follower_id', as: 'following' });
  User.hasMany(Follower, { foreignKey: 'following_id', as: 'followers' });
  User.hasMany(FriendRequest, { foreignKey: 'sender_id', as: 'sentFriendRequests' });
  User.hasMany(FriendRequest, { foreignKey: 'receiver_id', as: 'receivedFriendRequests' });
  User.hasMany(Friendship, { foreignKey: 'user_id', as: 'friendships' });
  User.hasMany(Friendship, { foreignKey: 'friend_id', as: 'friendOf' });
  User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
  User.hasMany(Status, { foreignKey: 'user_id', as: 'statuses' });
  User.hasMany(PostPurge, { foreignKey: 'user_id', as: 'postPurges' });
  User.hasOne(UserSurvivalState, { foreignKey: 'user_id', as: 'survivalState' });

  // Post associations
  Post.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Post.hasMany(Comment, { foreignKey: 'post_id', as: 'postComments' });
  Post.hasMany(Reaction, { foreignKey: 'post_id', as: 'postReactions' });
  Post.hasMany(Like, { foreignKey: 'post_id', as: 'postLikes' });
  Post.hasMany(PostPurge, { foreignKey: 'post_id', as: 'purges' });

  // Comment associations
  Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Comment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

  // Reaction associations
  Reaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Reaction.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

  // Like associations
  Like.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Like.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

  // Notification associations
  Notification.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });
  Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

  // Follower associations
  Follower.belongsTo(User, { foreignKey: 'follower_id', as: 'follower' });
  Follower.belongsTo(User, { foreignKey: 'following_id', as: 'following' });

  // FriendRequest associations
  FriendRequest.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
  FriendRequest.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

  // Friendship associations
  Friendship.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Friendship.belongsTo(User, { foreignKey: 'friend_id', as: 'friend' });

  // Message associations
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

  // Conversation associations
  Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
  Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversationId', as: 'participants' });
  User.hasMany(ConversationParticipant, { foreignKey: 'userId', as: 'conversationParticipants' });

  // ConversationParticipant associations
  ConversationParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

  // Status associations
  Status.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // PostPurge associations
  PostPurge.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  PostPurge.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

  // UserSurvivalState associations
  UserSurvivalState.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
}

// Export all models for easy importing
export {
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
  Profile
};

export default sequelize;