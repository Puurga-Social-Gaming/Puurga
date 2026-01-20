import React from 'react';
import { motion } from 'framer-motion';
import { Bell, X, User, Heart, MessageCircle, UserPlus } from 'lucide-react';
import Avatar from './Avatar';

interface LiveNotificationToastProps {
  notification: {
    id: string;
    type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment';
    fromUser: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
    data?: {
      friendRequestId?: string;
      postId?: string;
      commentId?: string;
    };
    createdAt: string;
  };
  onClose: () => void;
  onAction?: (action: 'accept' | 'decline' | 'view') => void;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  notification,
  onClose,
  onAction
}) => {
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'friend_request_accepted':
        return <User className="w-5 h-5 text-green-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationText = () => {
    switch (notification.type) {
      case 'friend_request':
        return 'sent you a friend request';
      case 'friend_request_accepted':
        return 'accepted your friend request';
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      default:
        return 'sent you a notification';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 shadow-lg max-w-sm w-full"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Avatar
            src={notification.fromUser.avatar}
            alt={notification.fromUser.name}
            size="sm"
            showBorder={false}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getNotificationIcon()}
            <span className="text-sm font-medium text-white truncate">
              {notification.fromUser.name}
            </span>
          </div>
          
          <p className="text-sm text-gray-300 mb-2">
            {getNotificationText()}
          </p>
          
          {notification.type === 'friend_request' && onAction && (
            <div className="flex gap-2">
              <button
                onClick={() => onAction('accept')}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onAction('decline')}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors"
              >
                Decline
              </button>
            </div>
          )}
          
          {(notification.type === 'like' || notification.type === 'comment') && onAction && (
            <button
              onClick={() => onAction('view')}
              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-md transition-colors"
            >
              View Post
            </button>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default LiveNotificationToast;
