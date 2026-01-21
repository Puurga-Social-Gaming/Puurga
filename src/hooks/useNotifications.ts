import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { Notification } from '../types/notification';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';
import { useWebSocket } from './useWebSocket';
import api from '../api/api';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      // Use API endpoint instead of direct Supabase call for consistency
      const response = await api.get('/notifications');
      const data = response.data || [];

      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;

    try {
      // Use API endpoint for marking as read
      await api.put('/notifications/read', { notificationIds });

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    // Optimistic update: Remove immediately from UI
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
      // Background API call
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Revert on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error('Failed to delete notification');
    }
  };

  // Fetch notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Set up WebSocket for real-time notifications
  const { isConnected } = useWebSocket({
    onNotification: (notification) => {
      console.log('Received live notification:', notification);

      // Add notification to state
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show different toast notifications based on type
      if (notification.type === 'friend_request') {
        toast.success(
          `👋 ${notification.fromUser.name} sent you a friend request! Check your notifications to accept or decline.`,
          {
            duration: 8000,
            position: 'top-right',
          }
        );
      } else if (notification.type === 'friend_request_accepted') {
        toast.success(`🎉 ${notification.fromUser.name} accepted your friend request!`, {
          duration: 5000,
          position: 'top-right',
        });
      } else if (notification.type === 'like') {
        toast.success(`❤️ ${notification.fromUser.name} liked your post!`, {
          duration: 4000,
          position: 'top-right',
        });
      } else if (notification.type === 'comment') {
        toast.success(`💬 ${notification.fromUser.name} commented on your post!`, {
          duration: 4000,
          position: 'top-right',
        });
      } else {
        // Default notification for other types
        toast.success(`${notification.fromUser.name}: ${notification.type.replace('_', ' ')}`, {
          duration: 4000,
          position: 'top-right',
        });
      }
    },
    onConnectionChange: (connected) => {
      console.log('WebSocket connection status:', connected);
    }
  });

  // Fallback: Set up Supabase real-time subscription if WebSocket is not connected
  useEffect(() => {
    if (!user || isConnected) return;

    // Clean up existing subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription as fallback
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

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user, isConnected]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    fetchNotifications
  };
}; 