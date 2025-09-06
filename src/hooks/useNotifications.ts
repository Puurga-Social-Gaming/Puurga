import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { Notification } from '../types/notification';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';

export const useNotifications = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return;
      }

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

  // Fetch notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    // Clean up existing subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
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
  }, [user]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    fetchNotifications
  };
}; 