import React from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Heart, MessageCircle, UserPlus, UserCheck, Reply,
  AtSign, Share2, Eye, ThumbsDown, MessageSquare, Ghost, Star, Award
} from 'lucide-react';
import Avatar from './Avatar';
import { NotificationType } from '../types/notification';

interface LiveNotificationToastProps {
  notification: {
    id: string;
    type: NotificationType;
    fromUser: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
    data?: Record<string, any>;
    createdAt: string;
  };
  onClose: () => void;
  onAction?: (action: 'accept' | 'decline' | 'view') => void;
}

const getNotificationIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    like: <Heart className="w-4 h-4 text-red-500" />,
    dislike: <ThumbsDown className="w-4 h-4 text-red-500" />,
    comment: <MessageCircle className="w-4 h-4 text-white" />,
    reply: <Reply className="w-4 h-4 text-blue-400" />,
    mention: <AtSign className="w-4 h-4 text-blue-400" />,
    follow: <UserPlus className="w-4 h-4 text-blue-500" />,
    follow_accepted: <UserCheck className="w-4 h-4 text-green-500" />,
    share: <Share2 className="w-4 h-4 text-green-400" />,
    profile_visit: <Eye className="w-4 h-4 text-gray-400" />,
    message: <MessageSquare className="w-4 h-4 text-purple-500" />,
    friend_request: <UserPlus className="w-4 h-4 text-blue-500" />,
    friend_request_accepted: <UserCheck className="w-4 h-4 text-green-500" />,
    redemption: <Star className="w-4 h-4 text-yellow-400" />,
    redemption_contribution: <Award className="w-4 h-4 text-yellow-500" />,
    friend_ghosted: <Ghost className="w-4 h-4 text-gray-400" />,
    purge: <span className="text-sm">🔥</span>,
  };
  return icons[type] || <Bell className="w-4 h-4 text-gray-500" />;
};

const getNotificationText = (type: string): string => {
  const texts: Record<string, string> = {
    like: 'liked your post',
    dislike: 'disliked your post',
    comment: 'commented on your post',
    reply: 'replied to your comment',
    mention: 'mentioned you',
    follow: 'started following you',
    follow_accepted: 'accepted your request',
    share: 'shared your post',
    profile_visit: 'visited your profile',
    message: 'sent you a message',
    group_message: 'sent a group message',
    message_reaction: 'reacted to your message',
    missed_call: 'missed your call',
    resume_game: 'Resume your game!',
    reward_reminder: 'Rewards available!',
    tournament_reminder: 'Tournament starting!',
    challenge: 'challenged you!',
    welcome: 'Welcome to Puurga!',
    verification: 'Verify your email',
    security_alert: 'Security alert',
    maintenance: 'Maintenance notice',
    friend_request: 'sent you a friend request',
    friend_request_accepted: 'accepted your friend request',
    redemption: 'redeemed you from ghost mode!',
    redemption_contribution: 'contributed to your redemption',
    friend_ghosted: 'has been ghosted',
    purge: 'purged your post',
  };
  return texts[type] || 'sent you a notification';
};

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  notification,
  onClose,
  onAction
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="bg-card border border-border rounded-lg p-4 shadow-theme-lg max-w-sm w-full"
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
            {getNotificationIcon(notification.type)}
            <span className="text-sm font-medium text-foreground truncate">
              {notification.fromUser.name}
            </span>
          </div>

          <p className="text-sm text-muted mb-2">
            {getNotificationText(notification.type)}
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
                className="px-3 py-1 bg-accent text-white text-xs rounded-md hover:opacity-90 transition-colors"
              >
                Decline
              </button>
            </div>
          )}

          {['like', 'comment', 'mention', 'share'].includes(notification.type) && onAction && (
            <button
              onClick={() => onAction('view')}
              className="px-3 py-1 bg-accent hover:opacity-90 text-black text-xs rounded-md transition-colors"
            >
              View Post
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-muted hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default LiveNotificationToast;
