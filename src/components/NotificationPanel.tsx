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
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border/60 shadow-xl text-foreground">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-45px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted px-4">
              <Bell className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`px-3 py-2.5 hover:bg-card-hover/50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-accent/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">
                        {notification.message || notification.fromUser?.name || 'Notification'}
                      </p>
                      <p className="text-[10px] text-muted-light mt-0.5">
                        {formatDistanceToNow(
                          new Date(notification.createdAt || notification.created_at),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-1.5 h-1.5 mt-1.5 bg-accent rounded-full shrink-0" />
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
