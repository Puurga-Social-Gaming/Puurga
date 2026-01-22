import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

export interface Message {
  id: string;
  content: string;
  from_user_id: string;
  created_at: string;
  conversation_id?: string;
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
}

interface MessagesContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  onlineUsers: OnlineUser[];
  loading: boolean;
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  sendTypingStatus: (conversationId: string, isTyping: boolean) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createConversation: (otherUserId: string) => Promise<Conversation | null>;
  loadOnlineUsers: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const loadConversations = async (retryCount = 0) => {
    if (!user) return;
    
    try {
      // Only set loading on first load or manual refresh, not background retries
      if (retryCount === 0 && conversations.length === 0) {
        setLoading(true);
      }
      
      const response = await api.get('/api/messages/conversations');
      console.log('Loaded conversations:', response.data?.length || 0);
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
  };

  const loadMessages = async (conversationId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/messages/conversations/${conversationId}/messages`);
      console.log('Loaded messages:', response.data);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;
    
    try {
      const response = await api.post(`/api/messages/conversations/${conversationId}/messages`, {
        content: content.trim()
      });
      
      console.log('Message sent:', response.data);
      
      // Add the new message to the messages array immediately (optimistic update/server response)
      setMessages(prev => [...prev, response.data]);
      
      // Reload conversations to update the latest message
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const sendTypingStatus = async (conversationId: string, isTyping: boolean) => {
    if (!user) return;
    try {
      await api.post(`/api/messages/conversations/${conversationId}/typing`, { isTyping });
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  const createConversation = async (otherUserId: string): Promise<Conversation | null> => {
    if (!user) return null;
    
    try {
      const response = await api.post('/api/messages/conversations', {
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

  const loadOnlineUsers = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/messages/users/online');
      console.log('Loaded online users:', response.data);
      setOnlineUsers(response.data || []);
    } catch (error) {
      console.error('Error loading online users:', error);
      setOnlineUsers([]);
    }
  };

  // WebSocket Handlers
  const handleNewMessage = useCallback((payload: any) => {
    if (!user) return;

    const { conversationId, message } = payload;
    
    // 1. Update messages if we are in this conversation
    if (currentConversation?.id === conversationId) {
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.some(m => m.id === message.id)) return prev;
        
        return [...prev, {
          id: message.id,
          content: message.content,
          from_user_id: message.fromUserId,
          created_at: message.createdAt,
          conversation_id: conversationId,
          from_user: {
            id: message.fromUser.id,
            full_name: message.fromUser.name,
            username: message.fromUser.username,
            avatar_url: message.fromUser.avatar
          }
        }];
      });
    }

    // 2. Show toast notification if we are NOT in this conversation
    const isChattingInThisConvo = currentConversation?.id === conversationId;
    
    if (!isChattingInThisConvo && message.fromUserId !== user.id) {
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

    // 3. Reload conversations list to update latest message/unread count
    loadConversations();
  }, [currentConversation, user]);

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
    }
  }, [user]);

  // Set up real-time subscription for messages
  useEffect(() => {
    if (user && currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [user, currentConversation]);

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        onlineUsers,
        loading,
        typingUsers,
        loadConversations,
        loadMessages,
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