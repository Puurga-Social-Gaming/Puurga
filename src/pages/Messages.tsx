import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMessages } from '../context/MessagesContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Search, Smile, MoreVertical, Phone, Video, MessageSquare, X, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const {
    conversations,
    currentConversation,
    messages,
    onlineUsers,
    loading,
    typingUsers,
    loadMessages,
    sendMessage,
    sendTypingStatus,
    setCurrentConversation,
    createConversation,
    loadOnlineUsers
  } = useMessages();

  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load online users on component mount
  useEffect(() => {
    if (user) {
      console.log('Loading online users on mount');
      loadOnlineUsers();
    }
  }, [user, loadOnlineUsers]);

  // Handle URL parameter for conversation
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        handleSelectConversation(conversation);
      }
    }
  }, [searchParams, conversations]);

  // Helper function to check if a user is online
  // const isUserOnline = (userId: string): boolean => {
  //   return onlineUsers.some(u => u.id === userId && u.isOnline);
  // };

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
      toast.error(t('messages.failedToStart'));
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participants[0]?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || !newMessage.trim()) return;

    try {
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await sendTypingStatus(currentConversation.id, false);

      await sendMessage(currentConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(t('messages.failedToSend'));
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!currentConversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    if (value.trim()) {
      sendTypingStatus(currentConversation.id, true);

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(currentConversation.id, false);
      }, 2000);
    } else {
      sendTypingStatus(currentConversation.id, false);
    }
  };

  const ConversationItem = ({ conversation, onClick }: any) => (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all ${currentConversation?.id === conversation.id
        ? 'bg-accent/10 border border-accent/30'
        : 'hover:bg-card-hover'
        }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar
          src={conversation.participants[0]?.avatar_url || ''}
          alt={conversation.participants[0]?.full_name || 'User'}
          size="md"
          userId={conversation.participants[0]?.id || ''}
          showOnlineStatus={true}
        />
        {conversation.unread_count > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{conversation.unread_count}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <span className="font-semibold text-foreground text-sm truncate">
            {conversation.participants[0]?.full_name || t('messages.unknownUser')}
          </span>
          {conversation.latest_message && (
            <span className="text-xs text-muted ml-2 flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.latest_message.created_at), {
                addSuffix: false
              }).replace('about ', '').replace(' ago', '')}
            </span>
          )}
        </div>
        {conversation.latest_message && (
          <p className="text-xs text-muted truncate">
            {conversation.latest_message.content}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-background text-foreground flex relative"
    >
      {/* Sidebar - Conversations List */}
      <div className={`${showMobileSidebar ? 'flex' : 'hidden'
        } lg:flex flex-col w-full lg:w-80 bg-background border-r border-border z-10 h-full`}>
        {/* Sticky Sidebar Header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border flex-shrink-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">{t('messages.title')}</h2>
              <button
                onClick={() => setShowUserList(true)}
                className="p-2 sm:p-2.5 bg-accent hover:bg-accent-hover rounded-full transition-colors touch-manipulation"
                title={t('messages.newConversation')}
                aria-label={t('messages.newConversation')}
              >
                <Plus size={20} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder={t('messages.searchConversations')}
                className="w-full bg-input text-foreground rounded-lg px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-12 h-12 text-muted mb-3" />
              <p className="text-muted text-sm">{t('messages.noConversationsYet')}</p>
              <button
                onClick={() => setShowUserList(true)}
                className="mt-4 text-accent hover:text-accent-hover text-sm font-medium px-4 py-2 rounded-lg touch-manipulation"
              >
                {t('messages.startConversation')}
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
      <div className={`${showMobileSidebar ? 'hidden' : 'flex'
        } lg:flex flex-1 flex-col bg-background relative`}>
        <AnimatePresence>
          {showUserList && (
            /* User List View - Full Screen Overlay on Mobile */
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex flex-col h-full w-full fixed inset-0 lg:relative lg:inset-auto bg-background z-50 lg:z-auto"
            >
              {/* User List Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowUserList(false);
                      setShowMobileSidebar(true);
                    }}
                    className="lg:hidden p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors touch-manipulation"
                    aria-label={t('common.close')}
                  >
                    <X size={20} className="sm:w-5 sm:h-5" />
                  </button>
                  <h3 className="text-lg font-semibold text-foreground">{t('messages.startNewConversation')}</h3>
                </div>
                <button
                  onClick={() => setShowUserList(false)}
                  className="p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors touch-manipulation"
                  aria-label={t('common.close')}
                >
                  <X size={20} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : onlineUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>{t('messages.noUsersAvailable')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {onlineUsers.map((onlineUser) => (
                      <div
                        key={onlineUser.id}
                        onClick={() => handleStartConversation(onlineUser)}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-card-hover border border-transparent hover:border-border"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center overflow-hidden">
                            {onlineUser.avatar_url ? (
                              <img
                                src={onlineUser.avatar_url}
                                alt={onlineUser.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-foreground font-semibold">
                                {onlineUser.full_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          {onlineUser.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground text-sm">
                            {onlineUser.full_name}
                          </div>
                          <div className="text-xs text-muted">
                            @{onlineUser.username}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!showUserList && currentConversation ? (
          /* Chat View */
          <div className="flex flex-col h-full min-h-0">
            {/* Sticky Chat Header */}
            <div className="sticky top-0 z-20 h-16 px-4 flex items-center justify-between border-b border-border bg-background flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors touch-manipulation"
                  aria-label={t('messages.title')}
                >
                  <MessageSquare size={20} className="sm:w-5 sm:h-5" />
                </button>
                <Avatar
                  src={currentConversation.participants[0]?.avatar_url || ''}
                  alt={currentConversation.participants[0]?.full_name || 'User'}
                  size="md"
                  userId={currentConversation.participants[0]?.id || ''}
                  showOnlineStatus={true}
                />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {currentConversation.participants[0]?.full_name || 'Unknown User'}
                  </h3>
                  <p className="text-xs text-muted">
                    @{currentConversation.participants[0]?.username || 'unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors touch-manipulation"
                  aria-label="Call"
                >
                  <Phone size={18} className="sm:w-5 sm:h-5" />
                </button>
                <button
                  className="p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors touch-manipulation"
                  aria-label="Video call"
                >
                  <Video size={18} className="sm:w-5 sm:h-5" />
                </button>
                <button
                  className="p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors touch-manipulation"
                  aria-label="More options"
                >
                  <MoreVertical size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4 min-h-0">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted mb-3" />
                  <p className="text-muted text-sm">{t('messages.noMessages')}</p>
                  <p className="text-muted-light text-xs mt-1">{t('messages.startConversationPrompt')}</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  // Use String() comparison to handle potential type mismatches
                  const isFromCurrentUser = String(message.from_user_id) === String(user?.id);
                  const showAvatar = index === 0 || messages[index - 1]?.from_user_id !== message.from_user_id;

                  // Debug logging (remove after fixing)
                  if (index === 0) {
                    console.log('Personal message ownership check:', {
                      messageFromUserId: message.from_user_id,
                      currentUserId: user?.id,
                      isFromCurrentUser,
                      fromUserIdType: typeof message.from_user_id,
                      userIdType: typeof user?.id
                    });
                  }

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
                          <Avatar
                            src={message.from_user.avatar_url || ''}
                            alt={message.from_user.full_name}
                            size="sm"
                            userId={message.from_user.id}
                            showOnlineStatus={true}
                          />
                        )}
                      </div>
                      <div className={`flex-1 ${isFromCurrentUser ? 'flex flex-col items-end' : ''}`}>
                        {showAvatar && (
                          <div className={`flex items-baseline gap-2 mb-1 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className="font-medium text-foreground text-sm">
                              {isFromCurrentUser ? t('messages.you') : message.from_user.full_name}
                            </span>
                            <span className="text-xs text-muted-light">
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <div className={`inline-block max-w-[70%] px-4 py-2 rounded-2xl ${isFromCurrentUser
                          ? 'bg-accent text-white'
                          : 'bg-card text-foreground'
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

            {/* Typing Indicator */}
            {currentConversation && typingUsers[currentConversation.id]?.length > 0 && (
              <div className="px-6 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span>
                    {currentConversation.participants[0]?.full_name} {t('messages.isTyping')}
                  </span>
                </div>
              </div>
            )}

            {/* Sticky Message Input - Above Footer */}
            <div className="sticky bottom-20 lg:bottom-0 z-[100] p-3 sm:p-4 border-t border-border bg-background flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2.5 sm:p-2 text-muted hover:text-foreground transition-colors flex-shrink-0 touch-manipulation"
                  aria-label="Add emoji"
                >
                  <Smile size={20} className="sm:w-5 sm:h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder={t('messages.messageUserPlaceholder', { username: currentConversation.participants[0]?.full_name || t('messages.user') })}
                  className="flex-1 bg-input text-foreground rounded-full px-4 py-2.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {newMessage.trim() && (
                  <button
                    type="submit"
                    className="bg-accent text-white p-2.5 sm:p-2 rounded-full hover:bg-accent-hover transition-colors flex-shrink-0 touch-manipulation"
                    aria-label={t('messages.sendMessage')}
                  >
                    <Send size={18} className="sm:w-5 sm:h-5" />
                  </button>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mb-4 shadow-theme-md">
              <MessageSquare size={40} className="text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{t('messages.welcomeTitle')}</h3>
            <p className="text-muted max-w-md mb-6">
              {t('messages.welcomePrompt')}
            </p>
            <button
              onClick={() => setShowUserList(true)}
              className="bg-accent text-white px-6 py-3 rounded-lg hover:bg-accent-hover transition-colors font-medium touch-manipulation"
            >
              {t('messages.startNewConversation')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Messages;
