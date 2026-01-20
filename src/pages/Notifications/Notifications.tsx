import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { UserCheck, UserX, Heart, MessageCircle, Eye, ExternalLink, Bell, CheckCheck } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import { useNotifications } from '../../context/NotificationContext';
import api from '../../lib/axios';

interface NotificationUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

// Safe accessor for fromUser with defaults (handle both camelCase and snake_case)
const getFromUser = (notification: any): NotificationUser => {
  // The notification may come with fromUser object from API mapping
  if (notification.fromUser) {
    return notification.fromUser;
  }
  // Fallback
  return {
    id: notification.sender_id || '',
    name: 'Unknown User',
    username: 'unknown',
    avatar: DEFAULT_IMAGES.avatar,
  };
};

const getNotificationData = (notification: any) => {
  if (notification.data) return notification.data;
  return {
    friendRequestId: notification.friend_request_id,
    postId: notification.post_id,
    commentId: notification.comment_id,
  };
};

const getCreatedAt = (notification: any): string => {
  return notification.createdAt || notification.created_at || '';
};

// Map notification type from backend to display type
const mapNotificationType = (type: string): 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' => {
  switch (type) {
    case 'friend_request': return 'friend_request';
    case 'friend_request_accepted': return 'friend_request_accepted';
    case 'post_like':
    case 'comment_like':
    case 'like': return 'like';
    case 'post_comment':
    case 'comment': return 'comment';
    default: return 'like';
  }
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, deleteNotification, fetchNotifications } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleAcceptFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      // Optimistically remove notification
      deleteNotification(notificationId);
      await api.post(`/api/friend-requests/${friendRequestId}/accept`);
      toast.success('Friend request accepted');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      // Optimistically remove notification
      deleteNotification(notificationId);
      await api.post(`/api/friend-requests/${friendRequestId}/reject`);
      toast.success('Friend request rejected');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const handleViewProfile = (username: string, notificationId: string) => {
    // Fire and forget delete
    deleteNotification(notificationId);
    navigate(`/profile/${username}`);
  };

  const handleViewPost = (postId: string, commentId?: string, notificationId?: string) => {
    // Delete notification when viewing post
    if (notificationId) {
      deleteNotification(notificationId);
    }
    // Navigate to the post, with optional comment anchor
    if (commentId) {
      navigate(`/home?post=${postId}&comment=${commentId}`);
    } else {
      navigate(`/home?post=${postId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) {
        toast.success('All notifications are already read');
        return;
      }
      await markAsRead(unreadIds);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderNotification = (notification: any) => {
    const fromUser = getFromUser(notification);
    const data = getNotificationData(notification);
    const createdAt = getCreatedAt(notification);
    const displayType = mapNotificationType(notification.type);

    switch (displayType) {
      case 'friend_request':
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl shadow-theme-sm ${notification.read ? 'bg-card' : 'bg-card border-l-4 border-blue-500'} hover:bg-card-hover transition-colors`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                    <UserCheck size={12} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-muted"> sent you a friend request</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {data.friendRequestId && (
                  <>
                    <button
                      onClick={() => handleAcceptFriendRequest(data.friendRequestId!, notification.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                    >
                      <UserCheck size={14} />
                      <span className="hidden sm:inline">Accept</span>
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(data.friendRequestId!, notification.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                    >
                      <UserX size={14} />
                      <span className="hidden sm:inline">Decline</span>
                    </button>
                  </>
                )}
                {fromUser.username && (
                  <button
                    onClick={() => handleViewProfile(fromUser.username, notification.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-background-secondary hover:bg-card-hover text-foreground rounded-lg text-sm transition-colors shadow-theme-sm"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 'friend_request_accepted':
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl shadow-theme-sm ${notification.read ? 'bg-card' : 'bg-card border-l-4 border-green-500'} hover:bg-card-hover transition-colors`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                    <UserCheck size={12} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-muted"> accepted your friend request</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={() => handleViewProfile(fromUser.username, notification.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-background-secondary hover:bg-card-hover text-foreground rounded-lg text-sm transition-colors shadow-theme-sm"
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">View Profile</span>
                </button>
              )}
            </div>
          </motion.div>
        );

      case 'like':
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl shadow-theme-sm ${notification.read ? 'bg-card' : 'bg-card border-l-4 border-pink-500'} hover:bg-card-hover transition-colors`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1">
                    <Heart size={12} className="text-white fill-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-muted"> liked your post</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {data.postId && (
                  <button
                    onClick={() => handleViewPost(data.postId!, undefined, notification.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg text-sm transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">View Post</span>
                  </button>
                )}
                {fromUser.username && (
                  <button
                    onClick={() => handleViewProfile(fromUser.username, notification.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-background-secondary hover:bg-card-hover text-foreground rounded-lg text-sm transition-colors shadow-theme-sm"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 'comment':
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl shadow-theme-sm ${notification.read ? 'bg-card' : 'bg-card border-l-4 border-orange-500'} hover:bg-card-hover transition-colors`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
                    <MessageCircle size={12} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-muted"> commented on your post</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {data.postId && (
                  <button
                    onClick={() => handleViewPost(data.postId!, data.commentId, notification.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">View Comment</span>
                  </button>
                )}
                {fromUser.username && (
                  <button
                    onClick={() => handleViewProfile(fromUser.username, notification.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-background-secondary hover:bg-card-hover text-foreground rounded-lg text-sm transition-colors shadow-theme-sm"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background p-4 sm:p-6"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-hover text-muted hover:text-foreground rounded-lg text-sm transition-colors border border-border shadow-theme-sm"
            >
              <CheckCheck size={16} />
              <span className="hidden sm:inline">Mark all as read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted py-16 bg-card rounded-xl shadow-theme-sm"
              >
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No notifications yet</p>
                <p className="text-sm text-muted-light mt-1">You'll see notifications here when someone interacts with you</p>
              </motion.div>
            ) : (
              notifications.map(notification => renderNotification(notification))
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Notifications; 