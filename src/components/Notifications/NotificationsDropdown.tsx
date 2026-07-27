import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Loader2, UserPlus, Heart, MessageCircle, UserCheck,
  CheckCheck, Ghost, Star, Award, Reply, AtSign, Share2,
  Eye, ThumbsDown, MessageSquare, Trophy, AlertTriangle,
  Mail, Shield, Wrench, Gamepad2, Flame
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileLink from '../Profile/ProfileLink';
function PhoneCallIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

const getNotificationIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    like: <Heart className="w-5 h-5 text-red-500" />,
    dislike: <ThumbsDown className="w-5 h-5 text-red-500" />,
    comment: <MessageCircle className="w-5 h-5 text-white" />,
    reply: <Reply className="w-5 h-5 text-blue-400" />,
    mention: <AtSign className="w-5 h-5 text-blue-400" />,
    follow: <UserPlus className="w-5 h-5 text-blue-500" />,
    follow_accepted: <UserCheck className="w-5 h-5 text-green-500" />,
    share: <Share2 className="w-5 h-5 text-green-400" />,
    profile_visit: <Eye className="w-5 h-5 text-gray-400" />,
    message: <MessageSquare className="w-5 h-5 text-purple-500" />,
    group_message: <MessageSquare className="w-5 h-5 text-indigo-500" />,
    message_reaction: <Heart className="w-5 h-5 text-pink-400" />,
    missed_call: <PhoneCallIcon className="w-5 h-5 text-red-400" />,
    resume_game: <Gamepad2 className="w-5 h-5 text-green-400" />,
    reward_reminder: <Award className="w-5 h-5 text-yellow-400" />,
    tournament_reminder: <Trophy className="w-5 h-5 text-yellow-500" />,
    challenge: <Flame className="w-5 h-5 text-orange-500" />,
    game_score: <Gamepad2 className="w-5 h-5 text-cyan-400" />,
    game_high_score: <Trophy className="w-5 h-5 text-yellow-400" />,
    welcome: <Bell className="w-5 h-5 text-blue-400" />,
    verification: <Mail className="w-5 h-5 text-yellow-400" />,
    security_alert: <Shield className="w-5 h-5 text-red-500" />,
    maintenance: <Wrench className="w-5 h-5 text-gray-500" />,
    friend_request: <UserPlus className="w-5 h-5 text-blue-500" />,
    friend_request_accepted: <UserCheck className="w-5 h-5 text-green-500" />,
    redemption: <Award className="w-5 h-5 text-yellow-400" />,
    redemption_contribution: <Star className="w-5 h-5 text-yellow-500" />,
    friend_ghosted: <Ghost className="w-5 h-5 text-gray-400" />,
    purge: <AlertTriangle className="w-5 h-5 text-red-500" />,
  };
  return icons[type] || <Bell className="w-5 h-5 text-gray-500" />;
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
    game_score: 'just finished a game',
    game_high_score: 'set a new high score!',
    welcome: 'Welcome to Puurga!',
    verification: 'Verify your email',
    security_alert: 'Security alert',
    maintenance: 'Maintenance notice',
    friend_request: 'sent you a friend request',
    friend_request_accepted: 'accepted your friend request',
    redemption: 'redeemed you from ghost mode! 🎉',
    redemption_contribution: 'contributed credits towards your redemption',
    friend_ghosted: 'has been ghosted (purged)',
    purge: 'purged your post',
  };
  return texts[type] || 'sent you a notification';
};

const getNotificationTarget = (notification: any) => {
  const data = notification.data || {};

  if (['message', 'group_message', 'message_reaction'].includes(notification.type) || data.conversationId) {
    return '/messages';
  }
  if (['redemption', 'redemption_contribution', 'friend_ghosted'].includes(notification.type)) {
    return '/puurga-dashboard';
  }
  if (notification.type === 'challenge') {
    return '/puurga-games';
  }
  if (['game_score', 'game_high_score', 'resume_game', 'reward_reminder', 'tournament_reminder'].includes(notification.type)) {
    return '/puurga-games';
  }
  if (['like', 'dislike', 'comment', 'reply', 'mention', 'share'].includes(notification.type) && data.postId) {
    return `/home#post-${data.postId}`;
  }
  if (notification.fromUser?.username) {
    return `/profile/${notification.fromUser.username}`;
  }
  return '/notifications';
};

const NotificationsDropdown: React.FC = () => {
  const { notifications, unreadCount, loading, dismissNotifications, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: any) => {
    const target = getNotificationTarget(notification);
    await dismissNotifications([notification.id]);
    setIsOpen(false);
    navigate(target);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors cursor-pointer"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-black border border-gray-800 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col"
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-white hover:text-gray-300 flex items-center gap-1"
                  >
                    <CheckCheck size={16} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Bell className="w-12 h-12 text-gray-600 mb-3" />
                    <p className="text-gray-400 text-sm">No notifications yet</p>
                    <p className="text-gray-500 text-xs mt-1">
                      We'll notify you when something happens
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 cursor-pointer transition-colors ${
                          notification.read
                            ? 'hover:bg-gray-900/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <ProfileLink username={notification.fromUser.username} className="flex-shrink-0 rounded-full">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                              {notification.fromUser.avatar ? (
                                <img
                                  src={notification.fromUser.avatar}
                                  alt={notification.fromUser.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-semibold text-sm">
                                  {notification.fromUser.name?.charAt(0) || '?'}
                                </span>
                              )}
                            </div>
                          </ProfileLink>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm text-white">
                                  <ProfileLink
                                    username={notification.fromUser.username}
                                    className="font-semibold hover:text-accent"
                                  >
                                    {notification.fromUser.name || 'System'}
                                  </ProfileLink>{' '}
                                  <span className="text-gray-400">
                                    {getNotificationText(notification.type)}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true
                                  })}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                            </div>

                            {!notification.read && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-xs text-white">
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                  New
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-800 text-center">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/notifications';
                    }}
                    className="text-sm text-white hover:text-gray-300"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;
