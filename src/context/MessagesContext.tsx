import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import { useMessageNotification } from '../components/MessageNotificationPopup';

export interface Message {
  id: string;
  content: string;
  from_user_id: string;
  is_from_current_user?: boolean;
  created_at: string;
  conversation_id?: string;
  images?: string[];
  from_user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    show_online_status?: boolean;
  }[];
  latest_message?: {
    content: string;
    created_at: string;
    from_user: any;
  } | null;
  unread_count: number;
  updated_at?: string;
}

export interface OnlineUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  isOnline: boolean;
  show_online_status?: boolean;
}

interface MessagesContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  onlineUsers: OnlineUser[];
  loading: boolean;
  messagesLoading: boolean;
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, imageUrls?: string[]) => Promise<void>;
  sendTypingStatus: (conversationId: string, isTyping: boolean) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createConversation: (otherUserId: string) => Promise<Conversation | null>;
  loadOnlineUsers: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const userRef = useRef(user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const activeMessagesFetchRef = useRef<string | null>(null);
  const [appIsActive, setAppIsActive] = useState(document.hasFocus());
  const appIsActiveRef = useRef(appIsActive);
  const showNotificationRef = useRef<((message: any) => void) | null>(null);

  const { showNotification } = useMessageNotification();

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  useEffect(() => {
    appIsActiveRef.current = appIsActive;
  }, [appIsActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setAppIsActive(!document.hidden && document.hasFocus());
    };

    const handleFocus = () => {
      setAppIsActive(true);
    };

    const handleBlur = () => {
      setAppIsActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Keep ref updated with latest user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const currentConversationRef = useRef(currentConversation);
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  const loadConversations = useCallback(async (retryCount = 0) => {
    if (!user) return;

    try {
      // Only set loading on first load or manual refresh, not background retries
      if (retryCount === 0 && conversations.length === 0) {
        setLoading(true);
      }

      const response = await api.get('/messages/conversations');
      setConversations(response.data || []);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);

      // Retry logic - max 1 retry with exponential backoff
      if (retryCount < 1 && error?.message?.includes('Network error')) {
        const delay = 1000 * (retryCount + 1);
        console.log(`Retrying conversations load in ${delay}ms...`);
        setTimeout(() => loadConversations(retryCount + 1), delay);
        return;
      }

      // Only log error if it's not a transient network issue or if retries failed
      console.error('Error loading conversations:', error.message || error);
    }
  }, [user, conversations.length]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) {
      setMessages(cached);
    }

    if (activeMessagesFetchRef.current === conversationId) return;
    activeMessagesFetchRef.current = conversationId;

    try {
      setMessagesLoading(true);
      const response = await api.get(`/messages/conversations/${conversationId}/messages`);
      const data: Message[] = response.data || [];
      messagesCacheRef.current.set(conversationId, data);

      if (currentConversationRef.current?.id === conversationId) {
        setMessages(data);
      }

      void markAsRead(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (currentConversationRef.current?.id === conversationId && !cached) {
        setMessages([]);
      }
    } finally {
      if (activeMessagesFetchRef.current === conversationId) {
        activeMessagesFetchRef.current = null;
      }
      setMessagesLoading(false);
    }
  }, [user]);

  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      await api.put(`/messages/conversations/${conversationId}/read`);
      console.log('Marked messages as read for conversation:', conversationId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (conversationId: string, content: string, imageUrls: string[] = []) => {
    if (!user || (!content.trim() && imageUrls.length === 0)) return;

    try {
      const response = await api.post(`/messages/conversations/${conversationId}/messages`, {
        content: content.trim(),
        images: imageUrls
      });

      console.log('Message sent:', response.data);

      const newMessage = response.data as Message;
      setMessages(prev => [...prev, newMessage]);

      if (currentConversationRef.current) {
        const convoId = currentConversationRef.current.id;
        const cached = messagesCacheRef.current.get(convoId) || [];
        messagesCacheRef.current.set(convoId, [...cached, newMessage]);
      }

      void loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const sendTypingStatus = async (conversationId: string, isTyping: boolean) => {
    if (!user) return;
    try {
      await api.post(`/messages/conversations/${conversationId}/typing`, { isTyping });
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  const createConversation = async (otherUserId: string): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      const response = await api.post('/messages/conversations', {
        otherUserId
      });

      console.log('Conversation created:', response.data);

      // Reload conversations to include the new one
      await loadConversations();

      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const loadOnlineUsers = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/messages/users/online');
      setOnlineUsers(response.data || []);
    } catch (error) {
      console.error('Error loading online users:', error);
      setOnlineUsers([]);
    }
  }, [user]);

  // WebSocket Handlers
  const handleNewMessage = useCallback((payload: any) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const { conversationId, message } = payload;

    // Validate: ignore messages from self (prevents echo/duplicate)
    if (message.fromUserId === currentUser.id) {
      return;
    }

    // 1. Update messages if we are in this conversation (use ref for latest value)
    if (currentConversationRef.current?.id === conversationId) {
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.some(m => m.id === message.id)) return prev;

        const incoming: Message = {
          id: message.id,
          content: message.content,
          images: message.images || [],
          from_user_id: message.fromUserId,
          created_at: message.createdAt,
          conversation_id: conversationId,
          from_user: {
            id: message.fromUser.id,
            full_name: message.fromUser.name,
            username: message.fromUser.username,
            avatar_url: message.fromUser.avatar
          }
        };
        const next = [...prev, incoming];
        messagesCacheRef.current.set(conversationId, next);
        return next;
      });
    }

    // 2. Show notification if we are NOT in this conversation
    const isChattingInThisConvo = currentConversationRef.current?.id === conversationId;

    if (!isChattingInThisConvo) {
      // Show popup notification if user is actively using the app (has focus)
      if (appIsActiveRef.current && document.hasFocus()) {
        showNotificationRef.current?.({
          id: message.id,
          conversationId,
          senderId: message.fromUser.id,
          senderName: message.fromUser.name,
          senderUsername: message.fromUser.username,
          senderAvatar: message.fromUser.avatar,
          content: message.content
        });
      } else {
        // Fallback to toast if app is in background
        toast.success(
          <div className="flex flex-col">
            <span className="font-bold">{message.fromUser.name}</span>
            <span className="text-sm line-clamp-2">{message.content}</span>
          </div>,
          {
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333'
            }
          }
        );
      }
    }

    // 3. Reload conversations list to update latest message/unread count
    loadConversations();
  }, [loadConversations]);

  const handleTyping = useCallback((payload: { conversationId: string; userId: string; isTyping: boolean }) => {
    const { conversationId, userId, isTyping } = payload;

    setTypingUsers(prev => {
      const currentTyping = prev[conversationId] || [];

      if (isTyping) {
        // Add user to typing list if not already there
        if (!currentTyping.includes(userId)) {
          return {
            ...prev,
            [conversationId]: [...currentTyping, userId]
          };
        }
      } else {
        // Remove user from typing list
        return {
          ...prev,
          [conversationId]: currentTyping.filter(id => id !== userId)
        };
      }
      return prev;
    });
  }, []);

  const handleUserStatusChange = useCallback((status: { userId: string; isOnline: boolean }) => {
    setOnlineUsers(prev => {
      const updated = [...prev];
      const userIndex = updated.findIndex(u => u.id === status.userId);

      if (userIndex !== -1) {
        // Update existing user
        updated[userIndex] = { ...updated[userIndex], isOnline: status.isOnline };
      }
      // Note: We don't add new users here because we only track friends/suggestions loaded via API
      // Reloading online users might be cleaner but more expensive
      return updated;
    });
  }, []);

  // Initialize WebSocket listeners
  useWebSocket({
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onUserStatusChange: handleUserStatusChange
  });

  // Load conversations when user logs in
  useEffect(() => {
    if (user) {
      loadConversations();
      // Don't auto-refresh - let WebSocket handle online status updates
      // loadOnlineUsers will be called when Messages page is explicitly opened
    }
  }, [user]);

  useEffect(() => {
    if (!user || !currentConversation) {
      setMessages([]);
      return;
    }
    const cached = messagesCacheRef.current.get(currentConversation.id);
    setMessages(cached ?? []);
    loadMessages(currentConversation.id);
  }, [user, currentConversation?.id, loadMessages]);

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        onlineUsers,
        loading,
        messagesLoading,
        typingUsers,
        loadConversations,
        loadMessages,
        markAsRead,
        sendMessage,
        sendTypingStatus,
        setCurrentConversation,
        createConversation,
        loadOnlineUsers
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}; 