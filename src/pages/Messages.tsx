import React, { useState, useRef, useEffect } from 'react';
import { useMessages } from '../context/MessagesContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Search, Smile, MoreVertical, Phone, Video, MessageSquare, X, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import toast from 'react-hot-toast';

const Messages: React.FC = () => {
  const { user } = useUser();
  const {
    conversations,
    currentConversation,
    messages,
    onlineUsers,
    loading,
    loadMessages,
    sendMessage,
    setCurrentConversation,
    createConversation,
    loadOnlineUsers
  } = useMessages();

  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadOnlineUsers();
    }
  }, [user]);

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
      setShowMobileSidebar(false);
    }
  };

  const handleStartConversation = async (selectedUser: typeof onlineUsers[0]) => {
    try {
      const conversation = await createConversation(selectedUser.id);
      if (conversation) {
        setCurrentConversation(conversation);
        setShowUserList(false);
        setShowMobileSidebar(false);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.participants[0]?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || !newMessage.trim()) return;

    try {
      await sendMessage(currentConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const ConversationItem = ({ conversation, onClick }: any) => (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all ${
        currentConversation?.id === conversation.id
          ? 'bg-orange-500/10 border border-orange-500/30'
          : 'hover:bg-gray-800/50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
          {conversation.participants[0]?.avatar_url ? (
            <img 
              src={conversation.participants[0].avatar_url} 
              alt={conversation.participants[0]?.full_name || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold">
              {conversation.participants[0]?.full_name?.charAt(0) || '?'}
            </span>
          )}
        </div>
        {conversation.unread_count > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{conversation.unread_count}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <span className="font-semibold text-white text-sm truncate">
            {conversation.participants[0]?.full_name || 'Unknown User'}
          </span>
          {conversation.latest_message && (
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.latest_message.created_at), {
                addSuffix: false
              }).replace('about ', '').replace(' ago', '')}
            </span>
          )}
        </div>
        {conversation.latest_message && (
          <p className="text-xs text-gray-400 truncate">
            {conversation.latest_message.content}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className={`${
        showMobileSidebar ? 'flex' : 'hidden'
      } lg:flex flex-col w-full lg:w-80 bg-black border-r border-gray-800`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <button
              onClick={() => setShowUserList(true)}
              className="p-2 bg-orange-500 hover:bg-orange-600 rounded-full transition-colors"
              title="New conversation"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations"
              className="w-full bg-gray-800 text-white rounded-lg px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <button
                onClick={() => setShowUserList(true)}
                className="mt-4 text-orange-500 hover:text-orange-400 text-sm font-medium"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onClick={() => handleSelectConversation(conversation)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${
        showMobileSidebar ? 'hidden' : 'flex'
      } lg:flex flex-1 flex-col bg-black`}>
        {showUserList ? (
          /* User List View */
          <div className="flex flex-col h-full">
            {/* User List Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowUserList(false);
                    setShowMobileSidebar(true);
                  }}
                  className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-lg font-semibold text-white">Start New Conversation</h3>
              </div>
              <button
                onClick={() => setShowUserList(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : onlineUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No users available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineUsers.map((onlineUser) => (
                    <div
                      key={onlineUser.id}
                      onClick={() => handleStartConversation(onlineUser)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-800/50 border border-transparent hover:border-gray-700"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                          {onlineUser.avatar_url ? (
                            <img 
                              src={onlineUser.avatar_url} 
                              alt={onlineUser.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {onlineUser.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        {onlineUser.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">
                          {onlineUser.full_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          @{onlineUser.username}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : currentConversation ? (
          /* Chat View */
          <div className="flex flex-col h-full">
            {/* Chat Header - Sticky */}
            <div className="sticky top-0 z-10 h-16 px-4 flex items-center justify-between border-b border-gray-800 bg-black">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <MessageSquare size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {currentConversation.participants[0]?.avatar_url ? (
                    <img 
                      src={currentConversation.participants[0].avatar_url} 
                      alt={currentConversation.participants[0]?.full_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {currentConversation.participants[0]?.full_name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {currentConversation.participants[0]?.full_name || 'Unknown User'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    @{currentConversation.participants[0]?.username || 'unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <Phone size={18} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <Video size={18} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">No messages yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isFromCurrentUser = message.from_user_id === user?.id;
                  const showAvatar = index === 0 || messages[index - 1]?.from_user_id !== message.from_user_id;
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-3 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && !isFromCurrentUser && (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                            {message.from_user.avatar_url ? (
                              <img 
                                src={message.from_user.avatar_url} 
                                alt={message.from_user.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-xs font-semibold">
                                {message.from_user.full_name.charAt(0)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`flex-1 ${isFromCurrentUser ? 'flex flex-col items-end' : ''}`}>
                        {showAvatar && (
                          <div className={`flex items-baseline gap-2 mb-1 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className="font-medium text-white text-sm">
                              {isFromCurrentUser ? 'You' : message.from_user.full_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <div className={`inline-block max-w-[70%] px-4 py-2 rounded-2xl ${
                          isFromCurrentUser 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-800 text-gray-100'
                        }`}>
                          <p className="text-sm leading-relaxed break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Sticky */}
            <div className="sticky bottom-0 z-10 p-4 border-t border-gray-800 bg-black">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${currentConversation.participants[0]?.full_name || 'user'}...`}
                  className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {newMessage.trim() && (
                  <button
                    type="submit"
                    className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors flex-shrink-0"
                  >
                    <Send size={18} />
                  </button>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={40} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Welcome to Messages</h3>
            <p className="text-gray-400 max-w-md mb-6">
              Select a conversation from the sidebar or start a new one to begin messaging.
            </p>
            <button 
              onClick={() => setShowUserList(true)}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Start New Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
