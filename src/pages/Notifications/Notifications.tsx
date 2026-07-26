import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../lib/axios';
import {
  Bell, Heart, MessageCircle, UserPlus, UserCheck, UserX,
  Gamepad2, Reply, AtSign, Share2,
  Eye, ThumbsDown, MessageSquare, Trophy, Award,
  AlertTriangle, Mail, Shield, Wrench, Ghost, Star, Flame
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import ProfileLink from '../../components/Profile/ProfileLink';
import MessageRingtoneSettings from '../../components/Messages/MessageRingtoneSettings';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import { useNotifications } from '../../context/NotificationsContext';
import { Notification, NotificationType, FILTER_CATEGORIES, getNotificationCategory } from '../../types/notification';

type FilterCategory = 'all' | 'social' | 'messaging' | 'gaming' | 'system';

const NOTIFICATION_ICONS: Partial<Record<NotificationType, React.ReactNode>> = {
  like: <Heart size={16} className="text-pink-500" />,
  dislike: <ThumbsDown size={16} className="text-red-500" />,
  comment: <MessageCircle size={16} className="text-white" />,
  reply: <Reply size={16} className="text-blue-400" />,
  mention: <AtSign size={16} className="text-blue-400" />,
  follow: <UserPlus size={16} className="text-blue-500" />,
  follow_accepted: <UserCheck size={16} className="text-green-500" />,
  share: <Share2 size={16} className="text-green-400" />,
  profile_visit: <Eye size={16} className="text-gray-400" />,
  message: <MessageSquare size={16} className="text-purple-500" />,
  group_message: <MessageSquare size={16} className="text-indigo-500" />,
  message_reaction: <Heart size={16} className="text-pink-400" />,
  missed_call: <Phone size={16} className="text-red-400" />,
  resume_game: <Gamepad2 size={16} className="text-green-400" />,
  reward_reminder: <Award size={16} className="text-yellow-400" />,
  tournament_reminder: <Trophy size={16} className="text-yellow-500" />,
  challenge: <Flame size={16} className="text-orange-500" />,
  welcome: <Bell size={16} className="text-blue-400" />,
  verification: <Mail size={16} className="text-yellow-400" />,
  security_alert: <Shield size={16} className="text-red-500" />,
  maintenance: <Wrench size={16} className="text-gray-500" />,
  friend_request: <UserPlus size={16} className="text-blue-500" />,
  friend_request_accepted: <UserCheck size={16} className="text-green-500" />,
  redemption: <Star size={16} className="text-yellow-400" />,
  redemption_contribution: <Award size={16} className="text-yellow-500" />,
  friend_ghosted: <Ghost size={16} className="text-gray-400" />,
  purge: <AlertTriangle size={16} className="text-red-500" />,
};

const NOTIFICATION_COLORS: Partial<Record<NotificationType, string>> = {
  like: 'border-l-pink-500',
  dislike: 'border-l-red-500',
  comment: 'border-l-white',
  reply: 'border-l-blue-400',
  mention: 'border-l-blue-400',
  follow: 'border-l-blue-500',
  follow_accepted: 'border-l-green-500',
  share: 'border-l-green-400',
  profile_visit: 'border-l-gray-400',
  message: 'border-l-purple-500',
  group_message: 'border-l-indigo-500',
  message_reaction: 'border-l-pink-400',
  missed_call: 'border-l-red-400',
  friend_request: 'border-l-blue-500',
  friend_request_accepted: 'border-l-green-500',
  redemption: 'border-l-yellow-400',
  redemption_contribution: 'border-l-yellow-500',
  friend_ghosted: 'border-l-gray-400',
  purge: 'border-l-red-500',
};

function Phone(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, dismissNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  useEffect(() => {
    if (unreadCount > 0) {
      void markAllAsRead();
    }
  }, [unreadCount, markAllAsRead]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => getNotificationCategory(n.type) === activeFilter);
  }, [notifications, activeFilter]);

  const getFromUser = (notification: Notification) => {
    return notification.fromUser || {
      id: '',
      name: t('notifications.unknownUser'),
      username: 'unknown',
      avatar: DEFAULT_IMAGES.avatar,
    };
  };

  const handleAcceptFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      await dismissNotifications([notificationId]);
      await api.post(`/friend-requests/${friendRequestId}/accept`);
      await api.put('/notifications/read', { notificationIds: [notificationId] });
      toast.success(t('notifications.acceptSuccess'));
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error(t('notifications.acceptFailed'));
    }
  };

  const handleRejectFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      await dismissNotifications([notificationId]);
      await api.post(`/friend-requests/${friendRequestId}/reject`);
      await api.put('/notifications/read', { notificationIds: [notificationId] });
      toast.success(t('notifications.rejectSuccess'));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error(t('notifications.rejectFailed'));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await markAsRead([notification.id]);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    const { type, data, fromUser } = notification;
    const socialTypes = ['like', 'dislike', 'comment', 'reply', 'mention', 'share'];
    if (socialTypes.includes(type) && data?.postId) {
      navigate(`/home?post=${data.postId}`);
    } else if ((type === 'follow_accepted' || type === 'follow') && fromUser?.username) {
      navigate(`/profile/${fromUser.username}`);
    } else if (['message', 'group_message', 'message_reaction'].includes(type) && data?.conversationId) {
      navigate(`/messages?conversation=${data.conversationId}`);
    } else if (type === 'challenge' && data?.gameId) {
      navigate(`/puurga-games?play=${data.gameId}`);
    } else if (type === 'redemption' || type === 'redemption_contribution' || type === 'friend_ghosted') {
      navigate('/puurga-dashboard');
    } else if (fromUser?.username) {
      navigate(`/profile/${fromUser.username}`);
    }
  };

  const handleViewProfile = async (username: string, notificationId: string) => {
    try {
      await markAsRead([notificationId]);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
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

  const getNotificationText = (type: string): string => {
    const texts: Record<string, string> = {
      like: t('notifications.likedPost'),
      dislike: 'disliked your post',
      comment: t('notifications.commentedPost'),
      reply: 'replied to your comment',
      mention: 'mentioned you',
      follow: 'started following you',
      follow_accepted: 'accepted your follow request',
      share: 'shared your post',
      profile_visit: 'visited your profile',
      message: t('notifications.sentMessage'),
      group_message: 'sent a message in a group',
      message_reaction: 'reacted to your message',
      missed_call: 'tried to call you',
      resume_game: 'Resume your game',
      reward_reminder: 'Rewards available!',
      tournament_reminder: 'Tournament starting soon',
      challenge: 'challenged you',
      welcome: 'Welcome to Puurga!',
      verification: 'Verify your email address',
      security_alert: 'Security alert for your account',
      maintenance: 'Scheduled maintenance notice',
      friend_request: t('notifications.sentFriendRequest'),
      friend_request_accepted: t('notifications.acceptedFriendRequest'),
      redemption: 'redeemed you from ghost mode',
      redemption_contribution: 'contributed to your redemption',
      friend_ghosted: 'has been ghosted',
      purge: 'purged your post',
    };
    return texts[type] || 'sent you a notification';
  };

  const renderNotification = (notification: Notification) => {
    const fromUser = getFromUser(notification);
    const data = notification.data || {};
    const borderColor = NOTIFICATION_COLORS[notification.type] || 'border-l-gray-500';

    if (notification.type === 'friend_request') {
      return (
        <div key={notification.id} className={`rounded-2xl card-gradient border border-border bg-card/80 p-4 sm:p-5 shadow-theme-sm ${notification.read ? '' : `border-l-4 ${borderColor}`}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <ProfileLink username={fromUser.username} className="shrink-0 rounded-full">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
              </ProfileLink>
              <div className="min-w-0">
                <p className="text-foreground leading-6">
                  <ProfileLink username={fromUser.username} className="font-semibold hover:text-accent">
                    {fromUser.name || t('notifications.someone')}
                  </ProfileLink>
                  <span className="text-muted"> {getNotificationText(notification.type)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-light uppercase tracking-wide">{formatDate(notification.createdAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              {data.friendRequestId && (
                <>
                  <button
                    onClick={() => handleAcceptFriendRequest(data.friendRequestId!, notification.id)}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                  >
                    <UserCheck size={14} />
                    <span className="hidden sm:inline">{t('notifications.accept')}</span>
                  </button>
                  <button
                    onClick={() => handleRejectFriendRequest(data.friendRequestId!, notification.id)}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
                  >
                    <UserX size={14} />
                    <span className="hidden sm:inline">{t('notifications.decline')}</span>
                  </button>
                </>
              )}
              {fromUser.username && (
                <button
                  onClick={() => handleViewProfile(fromUser.username, notification.id)}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                >
                  {t('notifications.viewProfile')}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={`cursor-pointer rounded-2xl border border-border bg-card/80 p-4 sm:p-5 shadow-theme-sm transition-colors hover:bg-card ${notification.read ? '' : `border-l-4 ${borderColor}`}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <ProfileLink username={fromUser.username} className="rounded-full inline-block">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
              </ProfileLink>
              {(notification.type === 'like' || notification.type === 'message_reaction') && (
                <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1">
                  <Heart size={12} className="text-white fill-white" />
                </div>
              )}
              {(notification.type === 'comment' || notification.type === 'reply') && (
                <div className="absolute -bottom-1 -right-1 bg-card border border-border rounded-full p-1">
                  <MessageCircle size={12} className="text-black" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-foreground">
                <ProfileLink username={fromUser.username} className="font-semibold hover:text-accent">
                  {fromUser.name || t('notifications.someone')}
                </ProfileLink>
                {NOTIFICATION_ICONS[notification.type]}
                {!notification.read && (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                )}
              </p>
              <p className="mt-1 text-sm text-muted">{getNotificationText(notification.type)}</p>
              {notification.title && (
                <p className="mt-1 text-sm font-medium text-foreground">{notification.title}</p>
              )}
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-light">{formatDate(notification.createdAt)}</p>
            </div>
          </div>
          {fromUser.username && (
            <button
              onClick={(e) => { e.stopPropagation(); handleViewProfile(fromUser.username, notification.id); }}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              View Profile
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border -mx-[var(--page-shell-pad-x,20px)] px-[var(--page-shell-pad-x,20px)]">
        <div className="py-4 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-theme-sm">
                <Bell size={20} className="text-accent" />
              </div>
              <div className="min-w-0">
                <h1 className="page-title text-xl sm:text-2xl">{t('notifications.notifications')}</h1>
                <p className="text-sm text-muted">
                  {unreadCount > 0 ? `${unreadCount} ${t('notifications.unread')}` : t('notifications.interactionPrompt')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                >
                  Mark all as read
                </button>
              )}
              <MessageRingtoneSettings
                title="Notification ringtone"
                description="Plays when a new notification arrives"
              />
            </div>
          </div>
        </div>

        <div className="pb-3">
          <div className="flex overflow-x-auto gap-2 scrollbar-hide">
            {FILTER_CATEGORIES.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as FilterCategory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 min-h-[44px] border ${
                  activeFilter === filter.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted border-border hover:bg-card-hover hover:text-foreground'
                }`}
              >
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-4 sm:py-6">
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card/70 px-6 py-16 text-center text-muted shadow-theme-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
                  <Bell size={28} className="text-muted-light" />
                </div>
                <p className="text-lg font-semibold text-foreground">{t('notifications.noNotificationsYet')}</p>
                <p className="mt-1 text-sm text-muted-light">{t('notifications.interactionPrompt')}</p>
              </div>
            ) : (
              filteredNotifications.map(notification => renderNotification(notification))
            )}
          </div>
        </div>
    </div>
  );
};

export default Notifications;
