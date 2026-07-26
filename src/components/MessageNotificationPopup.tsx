import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import Avatar from './Avatar';
import ProfileLink from './Profile/ProfileLink';

interface IncomingMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
}

interface MessageNotificationPopupProps {
  message: IncomingMessage;
  onClose: () => void;
  onClick: () => void;
}

const MessageNotificationPopup: React.FC<MessageNotificationPopupProps> = ({
  message,
  onClose,
  onClick
}) => {
  const [progress, setProgress] = useState(100);
  const duration = 5000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -100, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed top-4 right-4 z-[9999] max-w-sm w-full"
    >
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-theme-xl">
        <div className="relative">
          <div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-accent to-accent-hover transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <ProfileLink username={message.senderUsername} className="flex-shrink-0 rounded-full">
              <Avatar
                src={message.senderAvatar}
                alt={message.senderName}
                size="lg"
                showBorder={true}
              />
            </ProfileLink>

            <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-accent uppercase tracking-wide">
                  New Message
                </span>
              </div>

              <ProfileLink username={message.senderUsername} className="font-semibold text-foreground text-base truncate hover:text-accent block">
                {message.senderName}
              </ProfileLink>
              <p className="text-sm text-muted line-clamp-2 mt-1">
                {message.content}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex-shrink-0 p-1.5 text-muted hover:text-foreground hover:bg-card-hover rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={onClick}
              className="flex-1 px-4 py-2 bg-accent hover:opacity-90 text-black font-medium text-sm rounded-lg transition-colors"
            >
              Open Chat
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 bg-card hover:bg-card-hover border border-border text-foreground text-sm rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface MessageNotificationContextType {
  showNotification: (message: Omit<IncomingMessage, 'timestamp'>) => void;
  clearNotification: () => void;
}

const MessageNotificationContext = React.createContext<MessageNotificationContextType | undefined>(undefined);

export const MessageNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMessage, setCurrentMessage] = useState<IncomingMessage | null>(null);

  const showNotification = useCallback((message: Omit<IncomingMessage, 'timestamp'>) => {
    setCurrentMessage({
      ...message,
      timestamp: new Date()
    });
  }, []);

  const clearNotification = useCallback(() => {
    setCurrentMessage(null);
  }, []);

  const handleNotificationClick = () => {
    if (currentMessage) {
      window.location.href = `/messages?conversation=${currentMessage.conversationId}`;
      clearNotification();
    }
  };

  return (
    <MessageNotificationContext.Provider value={{ showNotification, clearNotification }}>
      {children}
      <AnimatePresence>
        {currentMessage && (
          <MessageNotificationPopup
            message={currentMessage}
            onClose={clearNotification}
            onClick={handleNotificationClick}
          />
        )}
      </AnimatePresence>
    </MessageNotificationContext.Provider>
  );
};

export const useMessageNotification = () => {
  const context = React.useContext(MessageNotificationContext);
  if (!context) {
    throw new Error('useMessageNotification must be used within MessageNotificationProvider');
  }
  return context;
};

export default MessageNotificationPopup;
