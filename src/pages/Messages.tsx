import React, { useState, useRef, useEffect } from 'react';
import { useMessages } from '../context/MessagesContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Search, Paperclip, Smile, MoreVertical } from 'lucide-react';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

const Messages: React.FC = () => {
  const {
    conversations,
    currentConversation,
    messages,
    loadMessages,
    // sendMessage,
    setCurrentConversation,
  } = useMessages();

  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || !newMessage.trim()) return;

    // TODO: Re-enable messages backend integration after Supabase migration
    // All backend-dependent code is commented out for now.
    // (Dummy functionality for now)
    console.log('Sending message:', newMessage, 'to conversation', currentConversation.id);
    setNewMessage('');
    // You would typically call sendMessage(currentConversation.id, newMessage) here
  };

  const handleSelectConversation = (conversation: typeof currentConversation) => {
    if (conversation) {
      setCurrentConversation(conversation);
      loadMessages(conversation.id);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.participants[0].full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-[calc(100vh-3.5rem)] bg-[#0d0d0d] text-white rounded-lg overflow-hidden shadow-lg"
    >
      {/* Conversations List */}
      <div className="w-80 border-r border-[#1a1a1a] flex flex-col">
        <div className="p-4 border-b border-[#1a1a1a]">
          <h2 className="text-2xl font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-[#1a1a1a] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thumb-orange-600 scrollbar-track-[#1a1a1a]">
          <div className="space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No conversations found.</p>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${currentConversation?.id === conversation.id
                      ? 'bg-orange-600 shadow-md'
                      : 'hover:bg-[#1a1a1a]'
                    }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <Avatar
                    src={conversation.participants[0].avatar_url}
                    alt={conversation.participants[0].full_name}
                    size="lg"
                    showBorder={false}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white truncate">
                        {conversation.participants[0].full_name}
                      </span>
                      {conversation.last_message && (
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                            addSuffix: true
                          })}
                        </span>
                      )}
                    </div>
                    {conversation.last_message && (
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Messages Header */}
            <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src={currentConversation.participants[0].avatar_url}
                  alt={currentConversation.participants[0].full_name}
                  size="md"
                  showBorder={false}
                />
                <div>
                  <h3 className="font-semibold text-white">
                    {currentConversation.participants[0].full_name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    @{currentConversation.participants[0].username} <span className="text-green-500">• Online</span>
                  </p>
                </div>
              </div>
              <button className="p-2 rounded-full hover:bg-[#1a1a1a] transition-colors">
                <MoreVertical size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thumb-orange-600 scrollbar-track-[#1a1a1a]">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    message.from_user_id === currentConversation.participants[0].id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl p-3 ${
                      message.from_user_id === currentConversation.participants[0].id
                        ? 'bg-orange-500 text-white'
                        : 'bg-[#1a1a1a] text-gray-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#1a1a1a] bg-[#0d0d0d]">
              <div className="flex items-center gap-2">
                <button type="button" className="p-2 rounded-full hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#1a1a1a] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
                <button type="button" className="p-2 rounded-full hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white">
                  <Smile size={20} />
                </button>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-orange-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Messages; 