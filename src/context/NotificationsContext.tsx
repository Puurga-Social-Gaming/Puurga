import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../lib/axios';

export interface Notification {
  id: string;
  type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' | 'message';
  read: boolean;
  createdAt: string;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  data?: {
    friendRequestId?: string;
    postId?: string;
    commentId?: string;
    conversationId?: string;
    messageId?: string;
  };
}

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data || []);
      
      // Calculate unread count
      const unread = (response.data || []).filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications/unread/count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    try {
      await api.put('/notifications/read', { notificationIds });
      
      // Update local state (keep items, but mark read)
      setNotifications(prev =>
        prev.map(n => (notificationIds.includes(n.id) ? { ...n, read: true } : n))
      );

      // Decrement unreadCount by number of actually-unread items being marked
      setUnreadCount(prevUnread => {
        const currentlyUnread = notifications.filter(n => !n.read && notificationIds.includes(n.id)).length;
        return Math.max(0, prevUnread - currentlyUnread);
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user, notifications]);

  const dismissNotifications = useCallback(async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    // Mark as read server-side first
    await markAsRead(notificationIds);

    // Then remove from UI entirely
    setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
  }, [user, markAsRead]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }, [notifications, markAsRead]);

  // Handle realtime notifications via WebSocket
  const handleNewNotification = useCallback((notification: Notification) => {
    console.log('New notification received:', notification);
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Set up WebSocket listener for notifications
  useWebSocket({
    onNotification: handleNewNotification
  });

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user, loadNotifications, loadUnreadCount]);

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
