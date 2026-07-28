import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { Notification } from '../types/notification';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';
import { useWebSocket } from './useWebSocket';
import api from '../api/api';
import toast from 'react-hot-toast';
import { playMessageSound } from '../utils/messageSound';

const NOTIFICATION_MESSAGES: Record<string, (name: string) => string> = {
  like: (name) => `❤️ ${name} liked your post!`,
  dislike: (name) => `👎 ${name} disliked your post`,
  comment: (name) => `💬 ${name} commented on your post!`,
  reply: (name) => `↩️ ${name} replied to your comment`,
  mention: (name) => `@ ${name} mentioned you!`,
  follow: (name) => `👋 ${name} started following you!`,
  follow_accepted: (name) => `🎉 ${name} accepted your follow request!`,
  share: (name) => `🔄 ${name} shared your post!`,
  profile_visit: (name) => `👀 ${name} visited your profile`,
  message: (name) => `💬 ${name} sent you a message`,
  group_message: (name) => `💬 ${name} sent a message in a group`,
  message_reaction: (name) => `👍 ${name} reacted to your message`,
  missed_call: (name) => `📞 Missed call from ${name}`,
  resume_game: () => `🎮 Resume your game!`,
  reward_reminder: () => `🎁 Rewards available!`,
  tournament_reminder: () => `🏆 Tournament starting soon!`,
  challenge: (name) => `🏅 ${name} challenged you!`,
  welcome: () => `👋 Welcome to Puurga!`,
  verification: () => `📧 Verify your email`,
  security_alert: () => `🔒 Security alert`,
  maintenance: () => `🔧 Scheduled maintenance`,
  friend_request: (name) => `👋 ${name} sent you a friend request!`,
  friend_request_accepted: (name) => `🎉 ${name} accepted your friend request!`,
  redemption: (name) => `✨ ${name} redeemed you from ghost mode!`,
  redemption_contribution: (name) => `🤝 ${name} contributed to your redemption!`,
  friend_ghosted: (name) => `👻 ${name} has been ghosted!`,
  purge: (name) => `🔥 ${name} purged your post`,
};

export const useNotifications = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications');
      const data = response.data?.notifications || response.data || [];

      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;

    try {
      await api.put('/notifications/read', { notificationIds });
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.read;

      if (wasUnread) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });

    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error('Failed to delete notification');
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const { isConnected: _wsConnected } = useWebSocket({
    onNotification: (notification: Notification) => {
      setNotifications(prev => {
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
      const type = notification.type as string;
      if (type !== 'message' && type !== 'new_message') {
        playMessageSound();
      }

      const name = notification.fromUser?.name || 'Someone';
      const messageFn = NOTIFICATION_MESSAGES[type];
      const toastMessage = messageFn ? messageFn(name) : `${name} sent a notification`;

      toast.success(toastMessage, {
        duration: 5000,
        position: 'top-right',
      });
    },
  });

  useEffect(() => {
    if (!user || _wsConnected) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user, _wsConnected]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    fetchNotifications
  };
};

export default useNotifications;
