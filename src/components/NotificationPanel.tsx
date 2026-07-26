import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../types/notification';
import { formatDistanceToNow } from 'date-fns';
import { Bell, X } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead([notification.id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border shadow-xl text-foreground">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-card-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted px-6">
              <Bell className="w-12 h-12 mb-4 opacity-60" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-card-hover cursor-pointer transition-colors ${
                    !notification.read ? 'bg-accent/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {notification.message || notification.fromUser?.name || 'Notification'}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {formatDistanceToNow(
                          new Date(notification.createdAt || notification.created_at),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 mt-1.5 bg-accent rounded-full shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
