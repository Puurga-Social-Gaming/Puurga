import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, UserPlus, Heart, MessageCircle, UserCheck, CheckCheck, Ghost, Star, Award } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationsDropdown: React.FC = () => {
  const { notifications, unreadCount, loading, dismissNotifications, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'friend_request_accepted':
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-white" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case 'redemption':
        return <Award className="w-5 h-5 text-yellow-400" />;
      case 'redemption_contribution':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'friend_ghosted':
        return <Ghost className="w-5 h-5 text-gray-400" />;
      case 'purge':
        return <span className="text-lg">🔥</span>;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: typeof notifications[0]) => {
    switch (notification.type) {
      case 'friend_request':
        return 'sent you a friend request';
      case 'friend_request_accepted':
        return 'accepted your friend request';
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'message':
        return 'sent you a message';
      case 'redemption':
        return 'redeemed you from ghost mode! 🎉';
      case 'redemption_contribution':
        return 'contributed credits towards your redemption';
      case 'friend_ghosted':
        return 'has been ghosted (purged)';
      case 'purge':
        return 'purged your post';
      default:
        return 'sent you a notification';
    }
  };

  const getNotificationTarget = (notification: typeof notifications[0]) => {
    const data = notification.data || {};

    if (notification.type === 'message' || data.messageId || data.conversationId) {
      return '/messages';
    }

    if (notification.type === 'redemption' || notification.type === 'redemption_contribution') {
      return '/puurga-dashboard';
    }

    if (notification.type === 'friend_ghosted') {
      return '/puurga-dashboard';
    }

    if (data.postId) {
      return `/home#post-${data.postId}`;
    }

    if (notification.fromUser?.username) {
      return `/profile/${notification.fromUser.username}`;
    }

    return '/notifications';
  };

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    const target = getNotificationTarget(notification);
    await dismissNotifications([notification.id]);
    setIsOpen(false);
    navigate(target);
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-black border border-gray-800 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col"
            >
              {/* Header */}
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

              {/* Notifications List */}
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
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                              {notification.fromUser.avatar ? (
                                <img
                                  src={notification.fromUser.avatar}
                                  alt={notification.fromUser.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-semibold text-sm">
                                  {notification.fromUser.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm text-white">
                                  <span className="font-semibold">
                                    {notification.fromUser.name}
                                  </span>{' '}
                                  <span className="text-gray-400">
                                    {getNotificationText(notification)}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true
                                  })}
                                </p>
                              </div>

                              {/* Icon */}
                              <div className="flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                            </div>

                            {/* Unread indicator */}
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

              {/* Footer */}
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
