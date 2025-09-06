import React, { createContext, useContext, useEffect } from 'react';
// import { supabase } from '../../frontend/src/lib/supabaseClient';
import { useUser } from '../context/UserContext';

export interface Message {
  id: string;
  content: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  conversation_id: string;
  from_user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
  }[];
  last_message?: Message;
  unread_count: number;
}

interface MessagesContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const conversations: Conversation[] = [];
  const currentConversation: Conversation | null = null;
  const messages: Message[] = [];

  const loadConversations = async () => {
    // Temporarily disabled during auth migration
    console.log('Messages feature temporarily disabled during auth migration');
    return;
  };

  const loadMessages = async () => {
    // Temporarily disabled during auth migration
    console.log('Messages feature temporarily disabled during auth migration');
    return;
  };

  const sendMessage = async () => {
    // Temporarily disabled during auth migration
    console.log('Messages feature temporarily disabled during auth migration');
    return;
  };

  // Load conversations when user logs in
  useEffect(() => {
    // Temporarily disabled during auth migration
    return;
  }, [user]);

  // Set up real-time subscription for messages
  useEffect(() => {
    // Temporarily disabled during auth migration
    return;
  }, [user, currentConversation]);

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        loadConversations,
        loadMessages,
        sendMessage,
        setCurrentConversation: () => {}, // Temporarily disabled
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