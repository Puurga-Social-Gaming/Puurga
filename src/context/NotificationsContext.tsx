import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../lib/axios';
import { Notification, NotificationType } from '../types/notification';

export type { Notification, NotificationType };

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  dismissNotifications: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get('/notifications');
      const data = response.data?.notifications || response.data || [];
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    try {
      await api.put('/notifications/read', { notificationIds });

      setNotifications(prev =>
        prev.map(n => (notificationIds.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user]);

  const dismissNotifications = useCallback(async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    try {
      await Promise.all(
        notificationIds.map(id =>
          api.delete(`/notifications/${id}`)
        )
      );

      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
    } catch (error) {
      console.error('Error dismissing notifications:', error);
      try {
        await markAsRead(notificationIds);
        setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }, [user, markAsRead]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
      }
    }
  }, [notifications, markAsRead]);

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  }, []);

  useWebSocket({
    onNotification: handleNewNotification
  });

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        loadNotifications,
        markAsRead,
        dismissNotifications,
        markAllAsRead
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
