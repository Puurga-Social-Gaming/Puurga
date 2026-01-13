import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadConversations = async () => {
    try {
      // For now, create conversations with all authenticated users
      // This will be replaced with actual API call to get user's conversations
      console.log('Loading conversations for user:', user?.id);
      
      // Mock conversations with real user structure - replace with actual API call
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participants: [{
            id: '1',
            full_name: 'Vista Social',
            username: 'vistasocial',
            avatar_url: user?.avatar || '/api/placeholder/40/40'
          }],
          last_message: {
            id: '1',
            content: 'Our customer success team is on 🔥 as always!',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            from_user_id: '1',
            to_user_id: user?.id || '',
            conversation_id: '1',
            from_user: {
              id: '1',
              full_name: 'Vista Social',
              username: 'vistasocial',
              avatar_url: user?.avatar || '/api/placeholder/40/40'
            }
          },
          unread_count: 1
        }
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      
      // Mock messages - replace with actual API call
      const mockMessages: Message[] = [
        {
          id: '1',
          content: 'Our customer success team is on 🔥 as always!',
          from_user_id: '1',
          to_user_id: user?.id || '',
          created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
          conversation_id: conversationId,
          from_user: {
            id: '1',
            full_name: 'Vista Social',
            username: 'vistasocial',
            avatar_url: user?.avatar || '/api/placeholder/40/40'
          }
        },
        {
          id: '2',
          content: 'Like this comment they took a',
          from_user_id: '1',
          to_user_id: user?.id || '',
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          conversation_id: conversationId,
          from_user: {
            id: '1',
            full_name: 'Vista Social',
            username: 'vistasocial',
            avatar_url: user?.avatar || '/api/placeholder/40/40'
          }
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (conversationId: string, content: string) => {
    try {
      console.log('Sending message:', content, 'to conversation:', conversationId);
      
      // Create new message object
      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        from_user_id: user?.id || '',
        to_user_id: currentConversation?.participants[0]?.id || '',
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
        from_user: {
          id: user?.id || '',
          full_name: user?.name || 'You',
          username: user?.username || 'you',
          avatar_url: user?.avatar || '/api/placeholder/40/40'
        }
      };
      
      // Add to messages array
      setMessages(prev => [...prev, newMessage]);
      
      // TODO: Replace with actual API call
      // await api.post('/messages', { conversationId, content });
      
    } catch (error) {
      console.error('Error sending message:', error);
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
        loadConversations,
        loadMessages,
        sendMessage,
        setCurrentConversation
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