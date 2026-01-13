import React, { useState, useRef, useEffect } from 'react';
import { useMessages } from '../context/MessagesContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Search, Paperclip, Smile, MoreVertical, Settings, Phone, Video, Bell, Filter, ChevronDown, X, MessageSquare } from 'lucide-react';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

const Messages: React.FC = () => {
  const { user } = useUser();
  const {
    conversations,
    currentConversation,
    messages,
    loadMessages,
    sendMessage,
    setCurrentConversation,
  } = useMessages();

  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock online users - replace with real API call
  const onlineUsers = [
    {
      id: '1',
      full_name: 'Vista Social',
      username: 'vistasocial',
      avatar_url: user?.avatar || '/api/placeholder/40/40',
      isOnline: true
    },
    {
      id: '2',
      full_name: 'Brittain',
      username: 'brittain',
      avatar_url: user?.avatar || '/api/placeholder/40/40',
      isOnline: true
    },
    {
      id: '3',
      full_name: 'Haziq',
      username: 'haziq',
      avatar_url: user?.avatar || '/api/placeholder/40/40',
      isOnline: false
    },
    {
      id: '4',
      full_name: 'Alex Johnson',
      username: 'alexj',
      avatar_url: user?.avatar || '/api/placeholder/40/40',
      isOnline: true
    },
    {
      id: '5',
      full_name: 'Sarah Wilson',
      username: 'sarahw',
      avatar_url: user?.avatar || '/api/placeholder/40/40',
      isOnline: true
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectConversation = (conversation: typeof currentConversation) => {
    if (conversation) {
      setCurrentConversation(conversation);
      loadMessages(conversation.id);
      setShowUserList(false);
    }
  };

  const handleStartConversation = (selectedUser: typeof onlineUsers[0]) => {
    // Create a new conversation with the selected user
    const newConversation = {
      id: `conv_${selectedUser.id}_${user?.id}`,
      participants: [{
        id: selectedUser.id,
        full_name: selectedUser.full_name,
        username: selectedUser.username,
        avatar_url: selectedUser.avatar_url
      }],
      unread_count: 0
    };
    
    setCurrentConversation(newConversation);
    setShowUserList(false);
    // Initialize empty messages for new conversation
    // In real implementation, this would check if conversation exists or create new one
  };

  const filteredConversations = conversations.filter(conv => 
    conv.participants[0].full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || !newMessage.trim()) return;

    try {
      await sendMessage(currentConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white overflow-hidden">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Conversations Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${
          isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'
        } lg:relative lg:flex w-80 bg-[#1a1a1a] border-r border-[#333] flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">All messages</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
              >
                <Filter size={16} />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors">
                <Settings size={16} />
              </button>
              <button 
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Filter Dropdown */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-2 bg-[#222] rounded-lg"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Select filters</span>
                  <span className="text-orange-500">0</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-[#222] text-white rounded px-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`flex items-center gap-3 p-3 mx-2 my-1 rounded cursor-pointer transition-colors ${
                currentConversation?.id === conversation.id
                  ? 'bg-[#222] border-r-2 border-orange-500'
                  : 'hover:bg-[#222]'
              }`}
              onClick={() => handleSelectConversation(conversation)}
            >
              <div className="relative">
                <Avatar
                  src={conversation.participants[0].avatar_url}
                  alt={conversation.participants[0].full_name}
                  size="md"
                  showBorder={false}
                />
                {conversation.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{conversation.unread_count}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-white truncate text-sm">
                    {conversation.participants[0].full_name}
                  </span>
                  {conversation.last_message && (
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                        addSuffix: false
                      }).replace('about ', '').replace(' ago', '')}
                    </span>
                  )}
                </div>
                {conversation.last_message && (
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {conversation.last_message.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d]">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-12 px-4 border-b border-[#333] flex items-center justify-between bg-[#1a1a1a] shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <MessageSquare size={16} />
                </button>
                <MessageSquare size={16} className="text-orange-500 hidden lg:block" />
                <h3 className="font-semibold text-white text-sm">
                  {currentConversation.participants[0].full_name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors">
                  <Phone size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors">
                  <Video size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors">
                  <Search size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => {
                const isFromCurrentUser = message.from_user_id === user?.id;
                const showAvatar = index === 0 || messages[index - 1]?.from_user_id !== message.from_user_id;
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 group hover:bg-[#1a1a1a] -mx-4 px-4 py-1 rounded"
                  >
                    <div className="w-10 flex-shrink-0">
                      {showAvatar && (
                        <Avatar
                          src={message.from_user.avatar_url}
                          alt={message.from_user.full_name}
                          size="sm"
                          showBorder={false}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-medium text-white text-sm">
                            {message.from_user.full_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.created_at).toLocaleDateString()} at {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div className="text-gray-200 text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button className="p-1 text-gray-400 hover:text-white hover:bg-[#222] rounded text-xs">
                        <Smile size={14} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-white hover:bg-[#222] rounded text-xs">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-[#1a1a1a]">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="flex items-center bg-[#222] rounded-lg px-4 py-3">
                  <button type="button" className="p-1 text-gray-400 hover:text-white transition-colors mr-3">
                    <Paperclip size={20} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${currentConversation.participants[0].full_name}`}
                    className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm"
                  />
                  <div className="flex items-center gap-2 ml-3">
                    <button type="button" className="p-1 text-gray-400 hover:text-white transition-colors">
                      <Smile size={20} />
                    </button>
                    {newMessage.trim() && (
                      <button
                        type="submit"
                        className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : showUserList ? (
          <div className="flex-1 flex flex-col bg-[#0d0d0d]">
            {/* User List Header */}
            <div className="h-12 px-4 border-b border-[#333] flex items-center justify-between bg-[#1a1a1a] shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <MessageSquare size={16} />
                </button>
                <MessageSquare size={16} className="text-orange-500 hidden lg:block" />
                <h3 className="font-semibold text-white text-sm">
                  Start New Conversation
                </h3>
              </div>
              <button 
                onClick={() => setShowUserList(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400 mb-4">Online Users</h4>
                {onlineUsers.filter(u => u.isOnline && u.id !== user?.id).map((onlineUser) => (
                  <div
                    key={onlineUser.id}
                    onClick={() => handleStartConversation(onlineUser)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-[#1a1a1a] border border-transparent hover:border-[#333]"
                  >
                    <div className="relative">
                      <Avatar
                        src={onlineUser.avatar_url}
                        alt={onlineUser.full_name}
                        size="md"
                        showBorder={false}
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0d0d0d]"></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">
                        {onlineUser.full_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        @{onlineUser.username} • Online
                      </div>
                    </div>
                  </div>
                ))}
                
                <h4 className="text-sm font-medium text-gray-400 mb-4 mt-6">All Users</h4>
                {onlineUsers.filter(u => u.id !== user?.id).map((allUser) => (
                  <div
                    key={allUser.id}
                    onClick={() => handleStartConversation(allUser)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-[#1a1a1a] border border-transparent hover:border-[#333]"
                  >
                    <div className="relative">
                      <Avatar
                        src={allUser.avatar_url}
                        alt={allUser.full_name}
                        size="md"
                        showBorder={false}
                      />
                      {!allUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-500 rounded-full border-2 border-[#0d0d0d]"></div>
                      )}
                      {allUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0d0d0d]"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">
                        {allUser.full_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        @{allUser.username} • {allUser.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to Messages</h3>
              <p className="text-gray-400 max-w-md mb-6">
                Select a conversation from the sidebar to start messaging, or start a new conversation.
              </p>
              <button 
                onClick={() => setShowUserList(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;