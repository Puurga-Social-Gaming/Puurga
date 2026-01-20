import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';

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
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
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

  const loadConversations = async (retryCount = 0) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get('/api/messages/conversations');
      console.log('Loaded conversations:', response.data);
      setConversations(response.data || []);
    } catch (error: any) {
      // Retry once if it's a network error (server might be starting up)
      if (retryCount === 0 && error?.message?.includes('Network error')) {
        console.log('Retrying conversations load...');
        setTimeout(() => loadConversations(1), 1000);
        return;
      }
      
      // Only log error if it's not a transient network issue
      if (retryCount > 0 || !error?.message?.includes('Network error')) {
        console.error('Error loading conversations:', error);
      }
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, _retryCount = 0) => {
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
      
      // Add the new message to the messages array
      setMessages(prev => [...prev, response.data]);
      
      // Reload conversations to update the latest message
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
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
        loadConversations,
        loadMessages,
        sendMessage,
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