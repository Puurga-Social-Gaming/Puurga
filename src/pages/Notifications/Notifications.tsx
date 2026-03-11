import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../lib/axios';
import { UserCheck, UserX, Heart, MessageCircle } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import { useNotifications } from '../../context/NotificationsContext';

interface NotificationUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

import { Notification as ContextNotification } from '../../context/NotificationsContext';

type Notification = ContextNotification;

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, dismissNotifications } = useNotifications();

  // Safe accessor for fromUser with defaults
  const getFromUser = (notification: Notification): NotificationUser => {
    return notification.fromUser || {
      id: '',
      name: t('notifications.unknownUser'),
      username: 'unknown',
      avatar: DEFAULT_IMAGES.avatar,
    };
  };

  const handleAcceptFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      // Optimistically remove notification
      await dismissNotifications([notificationId]);
      await api.post(`/friend-requests/${friendRequestId}/accept`);
      await api.put(`/notifications/read`, { notificationIds: [notificationId] });
      toast.success(t('notifications.acceptSuccess'));
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error(t('notifications.acceptFailed'));
    }
  };

  const handleRejectFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      // Optimistically remove notification
      await dismissNotifications([notificationId]);
      await api.post(`/friend-requests/${friendRequestId}/reject`);
      await api.put(`/notifications/read`, { notificationIds: [notificationId] });
      toast.success(t('notifications.rejectSuccess'));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error(t('notifications.rejectFailed'));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Delete notification when opened
    try {
      await dismissNotifications([notification.id]);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }

    // Navigate
    const { type, data, fromUser } = notification;
    if ((type === 'like' || type === 'comment') && data?.postId) {
      navigate(`/home?post=${data.postId}`);
    } else if (type === 'friend_request_accepted' && fromUser?.username) {
      navigate(`/profile/${fromUser.username}`);
    } else if (type === 'message' && data?.conversationId) {
      navigate(`/messages?conversation=${data.conversationId}`);
    }
  };

  const handleViewProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}${t('notifications.daysAgo')}`;
    if (hours > 0) return `${hours}${t('notifications.hoursAgo')}`;
    if (minutes > 0) return `${minutes}${t('notifications.minutesAgo')}`;
    return t('notifications.justNow');
  };

  const renderNotification = (notification: Notification) => {
    const fromUser = getFromUser(notification);
    const data = notification.data || {};

    switch (notification.type) {
      case 'friend_request':
        return (
          <div key={notification.id} className={`p-4 rounded-lg card-gradient border border-border ${notification.read ? '' : 'border-l-4 border-l-blue-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                <div>
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || t('notifications.someone')}</span>
                    <span className="text-muted"> {t('notifications.sentFriendRequest')}</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(notification.createdAt)}</p>
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
                      <span className="hidden sm:inline">{t('notifications.accept')}</span>
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(data.friendRequestId!, notification.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                    >
                      <UserX size={14} />
                      <span className="hidden sm:inline">{t('notifications.decline')}</span>
                    </button>
                  </>
                )}
                {fromUser.username && (
                  <button
                    onClick={() => handleViewProfile(fromUser.username)}
                    className="px-3 py-1 bg-background-secondary hover:bg-background-tertiary text-foreground rounded-lg text-sm"
                  >
                    {t('notifications.viewProfile')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'friend_request_accepted':
        return (
          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-4 rounded-lg cursor-pointer card-gradient border border-border ${notification.read ? '' : 'border-l-4 border-l-green-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                <div>
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || t('notifications.someone')}</span>
                    <span className="text-muted"> {t('notifications.acceptedFriendRequest')}</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleViewProfile(fromUser.username); }}
                  className="px-3 py-1 bg-background-secondary hover:bg-background-tertiary text-foreground rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      case 'like':
        return (
          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-4 rounded-lg cursor-pointer card-gradient border border-border ${notification.read ? '' : 'border-l-4 border-l-pink-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1">
                    <Heart size={12} className="text-white fill-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || t('notifications.someone')}</span>
                    <span className="text-muted"> {t('notifications.likedPost')}</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleViewProfile(fromUser.username); }}
                  className="px-3 py-1 bg-background-secondary hover:bg-background-tertiary text-foreground rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      case 'comment':
        return (
          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-4 rounded-lg cursor-pointer card-gradient border border-border ${notification.read ? '' : 'border-l-4 border-l-orange-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
                    <MessageCircle size={12} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || t('notifications.someone')}</span>
                    <span className="text-muted"> {t('notifications.commentedPost')}</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleViewProfile(fromUser.username); }}
                  className="px-3 py-1 bg-background-secondary hover:bg-background-tertiary text-foreground rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      case 'message':
        return (
          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-4 rounded-lg cursor-pointer card-gradient border border-border ${notification.read ? '' : 'border-l-4 border-l-purple-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1">
                    <MessageCircle size={12} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground">
                    <span className="font-semibold">{fromUser.name || t('notifications.someone')}</span>
                    <span className="text-muted"> {t('notifications.sentMessage')}</span>
                  </p>
                  <p className="text-sm text-muted-light">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleViewProfile(fromUser.username); }}
                  className="px-3 py-1 bg-background-secondary hover:bg-background-tertiary text-foreground rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };



  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('notifications.notifications')}</h1>
                {notifications.filter(n => !n.read).length > 0 && (
                  <p className="text-sm text-muted">{notifications.filter(n => !n.read).length} {t('notifications.unread')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Notifications List */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center text-muted py-16 bg-card rounded-xl shadow-theme-sm">
                <p className="text-lg">{t('notifications.noNotificationsYet')}</p>
                <p className="text-sm text-muted-light mt-1">{t('notifications.interactionPrompt')}</p>
              </div>
            ) : (
              notifications.map(notification => renderNotification(notification))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications; 