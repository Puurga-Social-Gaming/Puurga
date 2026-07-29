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
  like: <Heart size={14} className="text-pink-500" />,
  dislike: <ThumbsDown size={14} className="text-red-500" />,
  comment: <MessageCircle size={14} className="text-white" />,
  reply: <Reply size={14} className="text-blue-400" />,
  mention: <AtSign size={14} className="text-blue-400" />,
  follow: <UserPlus size={14} className="text-blue-500" />,
  follow_accepted: <UserCheck size={14} className="text-green-500" />,
  share: <Share2 size={14} className="text-green-400" />,
  profile_visit: <Eye size={14} className="text-gray-400" />,
  message: <MessageSquare size={14} className="text-purple-500" />,
  group_message: <MessageSquare size={14} className="text-indigo-500" />,
  message_reaction: <Heart size={14} className="text-pink-400" />,
  missed_call: <Phone size={14} className="text-red-400" />,
  resume_game: <Gamepad2 size={14} className="text-green-400" />,
  reward_reminder: <Award size={14} className="text-yellow-400" />,
  tournament_reminder: <Trophy size={14} className="text-yellow-500" />,
  challenge: <Flame size={14} className="text-orange-500" />,
  welcome: <Bell size={14} className="text-blue-400" />,
  verification: <Mail size={14} className="text-yellow-400" />,
  security_alert: <Shield size={14} className="text-red-500" />,
  maintenance: <Wrench size={14} className="text-gray-500" />,
  friend_request: <UserPlus size={14} className="text-blue-500" />,
  friend_request_accepted: <UserCheck size={14} className="text-green-500" />,
  redemption: <Star size={14} className="text-yellow-400" />,
  redemption_contribution: <Award size={14} className="text-yellow-500" />,
  friend_ghosted: <Ghost size={14} className="text-gray-400" />,
  purge: <AlertTriangle size={14} className="text-red-500" />,
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
  const { notifications, dismissNotifications, markAsRead, markAllAsRead, clearAllNotifications, unreadCount } = useNotifications();
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
      toast.success(t('notifications.rejectSuccess'));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error(t('notifications.rejectFailed'));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    const { type, data, fromUser } = notification;

    const socialTypes = ['like', 'dislike', 'comment', 'reply', 'mention', 'share'];
    if (socialTypes.includes(type) && data?.postId) {
      await markAsRead([notification.id]);
      navigate(`/home?post=${data.postId}`);
    } else if ((type === 'follow_accepted' || type === 'follow') && fromUser?.username) {
      await markAsRead([notification.id]);
      navigate(`/profile/${fromUser.username}`);
    } else if (['message', 'group_message', 'message_reaction'].includes(type) && data?.conversationId) {
      await markAsRead([notification.id]);
      navigate(`/messages?conversation=${data.conversationId}`);
    } else if (type === 'challenge' && data?.gameId) {
      await markAsRead([notification.id]);
      navigate(`/puurga-games?play=${data.gameId}`);
    } else if (type === 'redemption' || type === 'redemption_contribution' || type === 'friend_ghosted') {
      await markAsRead([notification.id]);
      navigate('/puurga-dashboard');
    } else if (fromUser?.username) {
      await markAsRead([notification.id]);
      navigate(`/profile/${fromUser.username}`);
    }
  };

  const handleViewProfile = async (username: string, notificationId: string) => {
    await markAsRead([notificationId]);
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
        <div key={notification.id} className={`rounded-xl border border-border/60 bg-card/50 p-3 sm:p-3.5 transition-colors hover:bg-card/80 ${notification.read ? '' : `border-l-[3px] ${borderColor}`}`}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <ProfileLink username={fromUser.username} className="shrink-0 rounded-full">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="sm" />
              </ProfileLink>
              <div className="min-w-0">
                <p className="text-[13px] text-foreground leading-snug">
                  <ProfileLink username={fromUser.username} className="font-semibold hover:text-accent">
                    {fromUser.name || t('notifications.someone')}
                  </ProfileLink>
                  {' '}
                  <span className="text-muted">{getNotificationText(notification.type)}</span>
                </p>
                <p className="text-[11px] text-muted-light mt-0.5">{formatDate(notification.createdAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
              {data.friendRequestId && (
                <>
                  <button
                    onClick={() => handleAcceptFriendRequest(data.friendRequestId!, notification.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-600"
                  >
                    <UserCheck size={12} />
                    <span className="hidden sm:inline">{t('notifications.accept')}</span>
                  </button>
                  <button
                    onClick={() => handleRejectFriendRequest(data.friendRequestId!, notification.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25"
                  >
                    <UserX size={12} />
                    <span className="hidden sm:inline">{t('notifications.decline')}</span>
                  </button>
                </>
              )}
              {fromUser.username && (
                <button
                  onClick={() => handleViewProfile(fromUser.username, notification.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
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
        className={`cursor-pointer rounded-xl border border-border/60 bg-card/50 p-3 sm:p-3.5 transition-colors hover:bg-card/80 ${notification.read ? '' : `border-l-[3px] ${borderColor}`}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <ProfileLink username={fromUser.username} className="rounded-full inline-block">
              <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="sm" />
            </ProfileLink>
            {(notification.type === 'like' || notification.type === 'message_reaction') && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-pink-500 rounded-full p-0.5">
                <Heart size={8} className="text-white fill-white" />
              </div>
            )}
            {(notification.type === 'comment' || notification.type === 'reply') && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-card border border-border rounded-full p-0.5">
                <MessageCircle size={8} className="text-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-foreground leading-snug">
              <ProfileLink username={fromUser.username} className="font-semibold hover:text-accent">
                {fromUser.name || t('notifications.someone')}
              </ProfileLink>
              {' '}
              <span className="text-muted">{getNotificationText(notification.type)}</span>
              <span className="inline-block ml-1.5 align-middle">{NOTIFICATION_ICONS[notification.type]}</span>
            </p>
            {notification.title && (
              <p className="text-[12px] font-medium text-foreground mt-0.5">{notification.title}</p>
            )}
            <p className="text-[11px] text-muted-light mt-0.5">{formatDate(notification.createdAt)}</p>
          </div>
          {fromUser.username && (
            <button
              onClick={(e) => { e.stopPropagation(); handleViewProfile(fromUser.username, notification.id); }}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover shrink-0"
            >
              {t('notifications.viewProfile')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border -mx-[var(--page-shell-pad-x,20px)] px-[var(--page-shell-pad-x,20px)]">
        <div className="py-3 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-theme-sm">
                <Bell size={16} className="text-accent" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-foreground">{t('notifications.notifications')}</h1>
                <p className="text-xs text-muted">
                  {unreadCount > 0 ? `${unreadCount} ${t('notifications.unread')}` : t('notifications.interactionPrompt')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all notifications? This cannot be undone.')) {
                      void clearAllNotifications();
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Clear all
                </button>
              )}
              <MessageRingtoneSettings
                title="Notification ringtone"
                description="Plays when a new notification arrives"
              />
            </div>
          </div>
        </div>

        <div className="pb-2.5">
          <div className="flex overflow-x-auto gap-1.5 scrollbar-hide">
            {FILTER_CATEGORIES.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as FilterCategory)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                  activeFilter === filter.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted border-border/60 hover:bg-card-hover hover:text-foreground'
                }`}
              >
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-3 sm:py-4">
          <div className="space-y-1.5">
            {filteredNotifications.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-12 text-center text-muted">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background">
                  <Bell size={20} className="text-muted-light" />
                </div>
                <p className="text-sm font-semibold text-foreground">{t('notifications.noNotificationsYet')}</p>
                <p className="mt-0.5 text-xs text-muted-light">{t('notifications.interactionPrompt')}</p>
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
