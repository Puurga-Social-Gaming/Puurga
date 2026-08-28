import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessages } from '../context/MessagesContext';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { Send, Search, MoreVertical, Phone, Video, MessageSquare, X, Plus, Loader2, Film, ChevronLeft, Check, CheckCheck, UserPlus, Users, Clock, Pencil, Trash2, Lock, Trash, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import imageCompression from 'browser-image-compression';
import CallRoom from '../components/Call/CallRoom';
import CallNotification from '../components/Call/CallNotification';
import api from '../lib/axios';
import SupabaseVideo from '../components/ui/SupabaseVideo';
import RichText from '../components/RichText/RichText';
import ContentTranslator from '../components/ContentTranslator';
import { extractUrls } from '../utils/linkParser';
import ProfileLink from '../components/Profile/ProfileLink';
import MessageRingtoneSettings from '../components/Messages/MessageRingtoneSettings';

function formatMessageDateLabel(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
}

function formatMessageTime(dateString: string): string {
  return format(new Date(dateString), 'HH:mm');
}

function formatConversationTime(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yy');
}

/** Elegant date divider between message groups */
const DateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-6 px-2 select-none" role="separator" aria-label={label}>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
    <span className="shrink-0 px-3.5 py-1 rounded-full text-[11px] font-medium tracking-wide text-muted bg-card border border-border shadow-theme-sm">
      {label}
    </span>
    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
  </div>
);

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const {
    conversations,
    currentConversation,
    messages,
    onlineUsers,
    loading,
    messagesLoading,
    typingUsers,
    typingDrafts,
    sendMessage,
    editMessage,
    deleteMessage,
    loadTrash,
    permanentlyDeleteFromTrash,
    reactToMessage,
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
  const draftSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [callType, setCallType] = useState<'video' | 'audio' | null>(null);
  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const [showMessagePreview, setShowMessagePreview] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    messageId: string;
    isOwn: boolean;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<
    Awaited<ReturnType<typeof loadTrash>>
  >([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // Load contacts (friends + pending requests) whenever Messages opens / user changes
  useEffect(() => {
    if (!user?.id) return;
    loadOnlineUsers();

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadOnlineUsers();
      }
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [user?.id, loadOnlineUsers]);

  // Hide mobile bottom nav while in a chat / new-chat sheet so composer isn't covered
  useEffect(() => {
    const open = !showMobileSidebar || showUserList;
    window.dispatchEvent(new CustomEvent('puurga:messages-chat', { detail: { open } }));
    return () => {
      window.dispatchEvent(new CustomEvent('puurga:messages-chat', { detail: { open: false } }));
    };
  }, [showMobileSidebar, showUserList]);

  // All friends + pending outgoing requests (always visible so you can message them)
  const messageableContacts = onlineUsers.filter(
    (u) => u.relationship === 'friend' || u.relationship === 'pending',
  );

  const friendContacts = messageableContacts.filter((u) => u.relationship === 'friend');
  const pendingContacts = messageableContacts.filter((u) => u.relationship === 'pending');

  const newChatFriends = onlineUsers.filter((u) => u.relationship === 'friend');
  const newChatPending = onlineUsers.filter((u) => u.relationship === 'pending');
  const newChatOthers = onlineUsers.filter(
    (u) => u.relationship !== 'friend' && u.relationship !== 'pending',
  );

  const filteredNewChatFriends = newChatFriends.filter((u) =>
    !searchTerm ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredNewChatPending = newChatPending.filter((u) =>
    !searchTerm ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredNewChatOthers = newChatOthers.filter((u) =>
    !searchTerm ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  // Detect URLs in message for live preview
  useEffect(() => {
    if (newMessage) {
      const urls = extractUrls(newMessage);
      setShowMessagePreview(urls.length > 0);
    } else {
      setShowMessagePreview(false);
    }
  }, [newMessage]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (draftSyncTimeoutRef.current) {
        clearTimeout(draftSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (currentConversation?.id) {
        void sendTypingStatus(currentConversation.id, false, '');
      }
    };
  }, [currentConversation?.id, sendTypingStatus]);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    };

    try {
      const compressedFile = await imageCompression(file, options);

      if (compressedFile.size > file.size) {
        console.log('Compressed file is larger than original, using original');
        return file;
      }

      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length + selectedVideos.length > 5) {
      toast.error(t('messages.maxImagesError', 'Maximum 5 files allowed'));
      return;
    }

    const newImages = files.filter(file => file.type.startsWith('image/'));
    const newVideos = files.filter(file => file.type.startsWith('video/'));

    if (newImages.length > 0) {
      try {
        // Compress images
        const compressedImages = await Promise.all(
          newImages.map(file => compressImage(file))
        );

        setSelectedImages(prev => [...prev, ...compressedImages]);

        // Create preview URLs
        const newPreviewUrls = compressedImages.map(file => URL.createObjectURL(file));
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        toast.success(t('messages.imagesAdded', 'Images added successfully'));
      } catch (error) {
        console.error('Error processing images:', error);
        toast.error(t('messages.errorProcessing', 'Error processing images'));
      }
    }

    if (newVideos.length > 0) {
      setSelectedVideos(prev => [...prev, ...newVideos]);
      const newVideoUrls = newVideos.map(file => URL.createObjectURL(file));
      setVideoPreviewUrls(prev => [...prev, ...newVideoUrls]);
      toast.success(`${newVideos.length} video(s) added`);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(videoPreviewUrls[index]);
    setVideoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoClick = (mediaUrl: string) => {
    setPlayingVideoId(playingVideoId === mediaUrl ? null : mediaUrl);
  };

  const canEditMessage = (createdAt: string) => {
    return Date.now() - new Date(createdAt).getTime() < 15 * 60 * 1000;
  };

  const startEditingMessage = (message: {
    id: string;
    content: string | null;
    is_encrypted?: boolean;
    decrypt_failed?: boolean;
  }) => {
    // Never seed the editor with ciphertext / lock placeholders
    const raw = message.content || '';
    if (
      message.decrypt_failed ||
      raw.startsWith('🔒') ||
      raw.startsWith('e2e:')
    ) {
      toast.error(
        t(
          'messages.cannotEditEncrypted',
          'This encrypted message cannot be edited on this device'
        )
      );
      setMessageMenuId(null);
      return;
    }
    setEditingMessageId(message.id);
    setEditContent(raw);
    setMessageMenuId(null);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const saveEditedMessage = async () => {
    if (!currentConversation || !editingMessageId || !editContent.trim()) return;
    setEditSaving(true);
    try {
      await editMessage(currentConversation.id, editingMessageId, editContent.trim());
      cancelEditingMessage();
    } catch {
      // toast handled in context
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteMessage = (messageId: string, isOwn: boolean) => {
    setMessageMenuId(null);
    setDeleteTarget({ messageId, isOwn });
  };

  const confirmDeleteMessage = async (scope: 'me' | 'everyone') => {
    if (!currentConversation || !deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteMessage(currentConversation.id, deleteTarget.messageId, scope);
      setDeleteTarget(null);
      // Refresh trash so the deleted message appears immediately
      try {
        const items = await loadTrash();
        setTrashItems(items);
      } catch {
        // ignore refresh errors
      }
    } catch {
      // toast in context
    } finally {
      setDeleteBusy(false);
    }
  };

  const openTrash = async () => {
    setShowChatMenu(false);
    setShowTrash(true);
    setTrashLoading(true);
    try {
      const items = await loadTrash();
      setTrashItems(items);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleStartCall = async (type: 'video' | 'audio') => {
    if (!currentConversation || !user) return;

    try {
      const statusRes = await api.get('/calls/status');
      if (!statusRes.data?.configured) {
        toast.error('Call feature not configured. Please contact support.');
        return;
      }
    } catch {
      toast.error('Unable to verify call service. Please try again.');
      return;
    }

    const roomId = `call_${currentConversation.id}`;
    const calleeId = currentConversation.participants[0]?.id;

    if (!calleeId) {
      toast.error('Unable to identify the recipient.');
      return;
    }

    try {
      await api.post('/calls/invite', {
        caller_id: user.id,
        callee_id: calleeId,
        conversation_id: currentConversation.id,
        call_type: type,
        room_id: roomId,
      });
    } catch (err) {
      console.error('Failed to send call invite:', err);
      toast.error('Failed to start call. Please try again.');
      return;
    }

    toast.success(`${type === 'video' ? 'Video' : 'Audio'} call started`);
    setCallRoomId(roomId);
    setCallType(type);
  };

  const handleEndCall = () => {
    setCallRoomId(null);
    setCallType(null);
  };

  const handleAcceptCall = (invite: any) => {
    setCallRoomId(invite.room_id);
    setCallType(invite.call_type);
    api.post(`/calls/invite/${invite.id}/accept`).catch(() => {});
  };

  const handleDeclineCall = async (invite: any) => {
    await api.post(`/calls/invite/${invite.id}/decline`).catch(() => {});
  };

  const handleSelectConversation = (conversation: typeof currentConversation) => {
    if (conversation) {
      setCurrentConversation(conversation);
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
        await loadOnlineUsers();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participants[0]?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Dismiss keyboard on mobile when clicking outside input areas
    if (e.target === e.currentTarget) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.blur();
      }
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || (!newMessage.trim() && selectedImages.length === 0 && selectedVideos.length === 0) || isSending) return;
    
    setIsSending(true);

    try {
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await sendTypingStatus(currentConversation.id, false, '');

      let mediaUrls: string[] = [];

      if (selectedImages.length > 0 || selectedVideos.length > 0) {
        const formData = new FormData();
        
        selectedImages.forEach((file, index) => {
          const fileExtension = file.type.split('/')[1];
          const fileName = `image${index}.${fileExtension}`;
          const newFile = new File([file], fileName, { type: file.type });
          formData.append('media', newFile);
        });
        
        selectedVideos.forEach((file, index) => {
          const fileExtension = file.type.split('/')[1];
          const fileName = `video${index}.${fileExtension}`;
          const newFile = new File([file], fileName, { type: file.type });
          formData.append('media', newFile);
        });
        
        const response = await api.post('/users/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000, // 3 minutes for video uploads
        });
        
        mediaUrls = response.data.urls;
      }

      await sendMessage(currentConversation.id, newMessage.trim(), mediaUrls);

      setNewMessage('');
      setSelectedImages([]);
      setSelectedVideos([]);
      setImagePreviewUrls([]);
      setVideoPreviewUrls([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('messages.errorSending'));
    } finally {
      setIsSending(false);
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
    if (draftSyncTimeoutRef.current) {
      clearTimeout(draftSyncTimeoutRef.current);
    }

    // Send typing indicator
    if (value.trim()) {
      draftSyncTimeoutRef.current = setTimeout(() => {
        void sendTypingStatus(currentConversation.id, true, value);
      }, 180);

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        void sendTypingStatus(currentConversation.id, false, '');
      }, 2000);
    } else {
      void sendTypingStatus(currentConversation.id, false, '');
    }
  };

  const ConversationItem = ({ conversation, onClick }: any) => {
    const isActive = currentConversation?.id === conversation.id;
    const participant = conversation.participants[0];
    const hasUnread = conversation.unread_count > 0;

    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left flex items-center gap-3 px-3 py-3 mx-0 rounded-xl cursor-pointer transition-all duration-200 border ${
          isActive
            ? 'bg-accent/10 border-accent/35 shadow-theme-sm'
            : 'border-transparent hover:bg-card-hover hover:border-border/60'
        }`}
      >
        <div className="relative flex-shrink-0">
          <Avatar
            src={participant?.avatar_url || ''}
            alt={participant?.full_name || 'User'}
            size="md"
            userId={participant?.id || ''}
            showOnlineStatus={participant?.show_online_status !== false}
          />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-background">
              <span className="text-[10px] font-bold text-white leading-none">
                {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
              </span>
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-2 mb-0.5">
            <ProfileLink
              username={participant?.username}
              className={`text-sm truncate ${hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'} hover:text-accent`}
            >
              {participant?.full_name || t('messages.unknownUser')}
            </ProfileLink>
            {conversation.latest_message && (
              <span className={`text-[10px] flex-shrink-0 tabular-nums ${hasUnread ? 'text-accent font-medium' : 'text-muted'}`}>
                {formatConversationTime(conversation.latest_message.created_at)}
              </span>
            )}
          </div>
          {conversation.latest_message ? (
            <p className={`text-xs truncate ${hasUnread ? 'text-foreground/80' : 'text-muted'}`}>
              {(() => {
                const raw = conversation.latest_message.content || '';
                if (!raw.trim()) return t('messages.mediaMessage', '📎 Media');
                if (raw.startsWith('🔒')) {
                  return t('messages.newMessage', 'New message');
                }
                return raw;
              })()}
            </p>
          ) : (
            <p className="text-xs text-muted-light italic truncate">No messages yet</p>
          )}
        </div>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 min-h-0 flex relative h-full max-h-full bg-background text-foreground overflow-hidden"
      onClick={handleBackdropClick}
    >
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div
        className={`${showMobileSidebar ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[340px] xl:w-[360px] bg-card/40 border-r border-border z-10 h-full min-h-0 backdrop-blur-sm`}
      >
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border flex-shrink-0">
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{t('messages.title')}</h2>
                <p className="text-[11px] text-muted mt-0.5 truncate">
                  {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <MessageRingtoneSettings />
                <button
                  type="button"
                  onClick={() => void openTrash()}
                  className="p-2.5 bg-card border border-border text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-all touch-manipulation"
                  title={t('messages.trash', 'Trash')}
                  aria-label={t('messages.trash', 'Trash')}
                >
                  <Trash size={17} />
                </button>
                <button
                  onClick={() => {
                    setShowUserList(true);
                    setShowMobileSidebar(false);
                    loadOnlineUsers();
                  }}
                  className="p-2.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-all shadow-theme-sm touch-manipulation"
                  title={t('messages.newConversation')}
                  aria-label={t('messages.newConversation')}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={t('messages.searchConversations')}
                className="w-full bg-input text-foreground rounded-xl pl-10 pr-3 py-2.5 text-sm border border-input-border focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-shadow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-2 py-2 pb-4 scrollbar-hide">
          {loading && conversations.length === 0 && messageableContacts.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {/* Friends & pending — visible immediately, click to write */}
              {messageableContacts.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 pt-2 pb-1.5 flex items-center gap-2">
                    <Users size={12} className="text-muted" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Write to
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {friendContacts.map((contact) => (
                      <div
                        key={`friend-${contact.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleStartConversation(contact)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleStartConversation(contact);
                        }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-card-hover hover:border-border/60"
                      >
                        <ProfileLink username={contact.username} className="rounded-full shrink-0">
                          <Avatar
                            src={contact.avatar_url || ''}
                            alt={contact.full_name}
                            size="md"
                            userId={contact.id}
                            showOnlineStatus={contact.show_online_status !== false}
                          />
                        </ProfileLink>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <ProfileLink username={contact.username} className="text-sm font-medium text-foreground truncate hover:text-accent">
                              {contact.full_name}
                            </ProfileLink>
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Friend
                            </span>
                          </div>
                          <p className="text-xs text-muted truncate">@{contact.username} · Tap to message</p>
                        </div>
                        <MessageSquare size={14} className="text-muted shrink-0" />
                      </div>
                    ))}
                    {pendingContacts.map((contact) => (
                      <div
                        key={`pending-${contact.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleStartConversation(contact)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleStartConversation(contact);
                        }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-card-hover hover:border-border/60"
                      >
                        <ProfileLink username={contact.username} className="rounded-full shrink-0">
                          <Avatar
                            src={contact.avatar_url || ''}
                            alt={contact.full_name}
                            size="md"
                            userId={contact.id}
                            showOnlineStatus={contact.show_online_status !== false}
                          />
                        </ProfileLink>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <ProfileLink username={contact.username} className="text-sm font-medium text-foreground truncate hover:text-accent">
                              {contact.full_name}
                            </ProfileLink>
                            <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <Clock size={9} />
                              Pending
                            </span>
                          </div>
                          <p className="text-xs text-muted truncate">Request sent · Tap to message</p>
                        </div>
                        <MessageSquare size={14} className="text-muted shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing conversations */}
              {filteredConversations.length > 0 && (
                <div>
                  {messageableContacts.length > 0 && (
                    <div className="px-3 pt-1 pb-1.5 flex items-center gap-2">
                      <MessageSquare size={12} className="text-muted" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Conversations
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {filteredConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        onClick={() => handleSelectConversation(conversation)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredConversations.length === 0 && messageableContacts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-theme-sm">
                    <MessageSquare className="w-7 h-7 text-muted" />
                  </div>
                  <p className="text-muted text-sm font-medium">{t('messages.noConversationsYet')}</p>
                  <p className="text-muted-light text-xs mt-1.5 max-w-[220px]">
                    Add a friend — they will appear here so you can message them right away.
                  </p>
                  <button
                    onClick={() => { setShowUserList(true); setShowMobileSidebar(false); loadOnlineUsers(); }}
                    className="mt-4 text-sm font-medium px-4 py-2 rounded-xl border border-border hover:bg-card-hover hover:border-highlight transition-all touch-manipulation"
                  >
                    {t('messages.startConversation')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main Chat ───────────────────────────────────────── */}
      <div
        className={`${
          showMobileSidebar ? 'hidden' : 'flex'
        } lg:flex flex-1 flex-col bg-background relative min-w-0 min-h-0 h-full overflow-hidden`}
      >
        <AnimatePresence>
          {showUserList && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="flex flex-col h-full w-full absolute inset-0 lg:relative lg:inset-auto bg-background z-50 lg:z-auto"
            >
              <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => {
                      setShowUserList(false);
                      setShowMobileSidebar(true);
                    }}
                    className="lg:hidden p-2 -ml-1 text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-colors touch-manipulation"
                    aria-label={t('common.close')}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                    {t('messages.startNewConversation')}
                  </h3>
                </div>
                <button
                  onClick={() => setShowUserList(false)}
                  className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-colors touch-manipulation"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 min-h-0">
                {loading && onlineUsers.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : onlineUsers.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <UserPlus className="w-10 h-10 text-muted mx-auto mb-3" />
                    <p className="text-muted text-sm">{t('messages.noUsersAvailable')}</p>
                    <p className="text-muted-light text-xs mt-1.5">
                      Add friends from profiles — they will show up here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredNewChatFriends.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-1 mb-2">
                          <Users size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Friends ({filteredNewChatFriends.length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {filteredNewChatFriends.map((onlineUser) => (
                            <div
                              key={onlineUser.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleStartConversation(onlineUser)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleStartConversation(onlineUser);
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-card-hover border border-transparent hover:border-border text-left"
                            >
                              <ProfileLink username={onlineUser.username} className="rounded-full shrink-0">
                                <Avatar
                                  src={onlineUser.avatar_url || ''}
                                  alt={onlineUser.full_name}
                                  size="md"
                                  userId={onlineUser.id}
                                  showOnlineStatus={onlineUser.show_online_status !== false}
                                />
                              </ProfileLink>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm truncate flex items-center gap-2">
                                  <ProfileLink username={onlineUser.username} className="hover:text-accent truncate">
                                    {onlineUser.full_name}
                                  </ProfileLink>
                                  {onlineUser.isOnline && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  )}
                                </div>
                                <div className="text-xs text-muted truncate">@{onlineUser.username}</div>
                              </div>
                              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Friend
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredNewChatPending.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-1 mb-2">
                          <Clock size={12} className="text-amber-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Requests sent ({filteredNewChatPending.length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {filteredNewChatPending.map((onlineUser) => (
                            <div
                              key={onlineUser.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleStartConversation(onlineUser)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleStartConversation(onlineUser);
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-card-hover border border-transparent hover:border-border text-left"
                            >
                              <ProfileLink username={onlineUser.username} className="rounded-full shrink-0">
                                <Avatar
                                  src={onlineUser.avatar_url || ''}
                                  alt={onlineUser.full_name}
                                  size="md"
                                  userId={onlineUser.id}
                                  showOnlineStatus={onlineUser.show_online_status !== false}
                                />
                              </ProfileLink>
                              <div className="flex-1 min-w-0">
                                <ProfileLink username={onlineUser.username} className="font-semibold text-foreground text-sm truncate hover:text-accent block">
                                  {onlineUser.full_name}
                                </ProfileLink>
                                <div className="text-xs text-muted truncate">
                                  @{onlineUser.username} · Request pending
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <Clock size={9} />
                                Pending
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredNewChatOthers.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-1 mb-2">
                          <MessageSquare size={12} className="text-muted" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                            More people
                          </span>
                        </div>
                        <div className="space-y-1">
                          {filteredNewChatOthers.map((onlineUser) => (
                            <div
                              key={onlineUser.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleStartConversation(onlineUser)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleStartConversation(onlineUser);
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-card-hover border border-transparent hover:border-border text-left"
                            >
                              <ProfileLink username={onlineUser.username} className="rounded-full shrink-0">
                                <Avatar
                                  src={onlineUser.avatar_url || ''}
                                  alt={onlineUser.full_name}
                                  size="md"
                                  userId={onlineUser.id}
                                  showOnlineStatus={onlineUser.show_online_status !== false}
                                />
                              </ProfileLink>
                              <div className="flex-1 min-w-0">
                                <ProfileLink username={onlineUser.username} className="font-semibold text-foreground text-sm truncate hover:text-accent block">
                                  {onlineUser.full_name}
                                </ProfileLink>
                                <div className="text-xs text-muted truncate">@{onlineUser.username}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredNewChatFriends.length === 0 &&
                      filteredNewChatPending.length === 0 &&
                      filteredNewChatOthers.length === 0 && (
                        <div className="text-center py-10 text-muted text-sm">
                          No matches for “{searchTerm}”
                        </div>
                      )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showUserList && currentConversation ? (
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Chat header */}
            <div className="z-20 h-14 sm:h-[64px] px-2 sm:px-5 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-md flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden p-2 -ml-0.5 text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-colors touch-manipulation flex-shrink-0"
                  aria-label={t('messages.title')}
                >
                  <ChevronLeft size={20} />
                </button>
                <ProfileLink
                  username={currentConversation.participants[0]?.username}
                  className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left flex-1 no-underline"
                >
                  <Avatar
                    src={currentConversation.participants[0]?.avatar_url || ''}
                    alt={currentConversation.participants[0]?.full_name || 'User'}
                    size="md"
                    userId={currentConversation.participants[0]?.id || ''}
                    showOnlineStatus={currentConversation.participants[0]?.show_online_status !== false}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm truncate hover:text-accent transition-colors">
                        {currentConversation.participants[0]?.full_name || 'Unknown User'}
                      </h3>
                      {messages.some((m) => m.is_encrypted && m.content && !m.decrypt_failed) && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500/90 shrink-0"
                          title="Secure conversation"
                        >
                          <Lock size={11} />
                          <span className="hidden sm:inline">Secure</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted truncate">
                      @{currentConversation.participants[0]?.username || 'unknown'}
                    </p>
                  </div>
                </ProfileLink>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => handleStartCall('audio')}
                  className="p-2 sm:p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-colors touch-manipulation"
                  aria-label="Audio call"
                >
                  <Phone size={17} />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  className="p-2 sm:p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-colors touch-manipulation"
                  aria-label="Video call"
                >
                  <Video size={17} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    className="p-2 sm:p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-xl transition-colors touch-manipulation"
                    aria-label="More options"
                  >
                    <MoreVertical size={17} />
                  </button>
                  {showChatMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-xl shadow-theme-lg z-50 py-1 overflow-hidden">
                        <button
                          onClick={() => {
                            const username = currentConversation.participants[0]?.username;
                            if (username) {
                              navigate(`/profile/${username}`);
                              setShowChatMenu(false);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-card-hover transition-colors"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => void openTrash()}
                          className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-foreground hover:bg-card-hover transition-colors"
                        >
                          <Trash size={14} className="text-muted" />
                          {t('messages.trash', 'Trash')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-2.5 sm:px-5 py-3 sm:py-4 min-h-0"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at top, rgb(var(--card) / 0.35) 0%, transparent 55%)',
              }}
            >
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-theme-sm">
                    <MessageSquare className="w-8 h-8 text-muted" />
                  </div>
                  <p className="text-foreground text-sm font-medium">{t('messages.noMessages')}</p>
                  <p className="text-muted text-xs mt-1.5 max-w-xs">{t('messages.startConversationPrompt')}</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full">
                  {messages.map((message, index) => {
                    const prev = messages[index - 1];
                    const next = messages[index + 1];
                    const isFromCurrentUser =
                      typeof message.is_from_current_user === 'boolean'
                        ? message.is_from_current_user
                        : String(message.from_user_id) === String(user?.id);

                    const showDate =
                      index === 0 ||
                      !isSameDay(new Date(prev.created_at), new Date(message.created_at));

                    const sameSenderAsPrev =
                      !!prev &&
                      prev.from_user_id === message.from_user_id &&
                      !showDate;
                    const sameSenderAsNext =
                      !!next &&
                      next.from_user_id === message.from_user_id &&
                      isSameDay(new Date(next.created_at), new Date(message.created_at));

                    const showAvatar = !isFromCurrentUser && !sameSenderAsPrev;
                    const showTime = !sameSenderAsNext;

                    const bubbleRadius = isFromCurrentUser
                      ? `${sameSenderAsPrev ? 'rounded-tr-md' : 'rounded-tr-2xl'} ${sameSenderAsNext ? 'rounded-br-md' : 'rounded-br-2xl'} rounded-tl-2xl rounded-bl-2xl`
                      : `${sameSenderAsPrev ? 'rounded-tl-md' : 'rounded-tl-2xl'} ${sameSenderAsNext ? 'rounded-bl-md' : 'rounded-bl-2xl'} rounded-tr-2xl rounded-br-2xl`;

                    return (
                      <React.Fragment key={message.id}>
                        {showDate && (
                          <DateDivider label={formatMessageDateLabel(message.created_at)} />
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                          className={`flex items-end gap-1.5 sm:gap-2 ${isFromCurrentUser ? 'flex-row-reverse' : ''} ${
                            sameSenderAsPrev ? 'mt-1' : 'mt-2.5 sm:mt-3'
                          }`}
                        >
                          <div className="w-7 sm:w-8 flex-shrink-0 self-end mb-0.5">
                            {showAvatar ? (
                              <ProfileLink username={message.from_user?.username} className="rounded-full block">
                                <Avatar
                                  src={message.from_user?.avatar_url || ''}
                                  alt={message.from_user?.full_name || 'User'}
                                  size="sm"
                                  userId={message.from_user?.id || ''}
                                  showOnlineStatus={false}
                                />
                              </ProfileLink>
                            ) : (
                              <div className="w-7 sm:w-8" />
                            )}
                          </div>

                          <div
                            className={`flex flex-col min-w-0 max-w-[82%] sm:max-w-[70%] ${
                              isFromCurrentUser ? 'items-end' : 'items-start'
                            }`}
                          >
                            {!sameSenderAsPrev && !isFromCurrentUser && (
                              <ProfileLink
                                username={message.from_user?.username}
                                className="text-[11px] font-medium text-muted mb-1 px-1 hover:text-accent"
                              >
                                {message.from_user?.full_name}
                              </ProfileLink>
                            )}

                            <div
                              className={`relative group px-3.5 py-2.5 sm:px-4 sm:py-3 ${bubbleRadius} border shadow-sm break-words ${
                                message.is_deleted
                                  ? 'bg-card/60 text-muted border-border border-dashed italic'
                                  : isFromCurrentUser
                                  ? 'bg-accent text-black border-accent/25 shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                                  : 'bg-card text-foreground border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                              }`}
                            >
                              {!message.is_deleted && (
                                <div
                                  className={`absolute -top-2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
                                    isFromCurrentUser ? 'right-1' : 'left-1'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMessageMenuId(messageMenuId === message.id ? null : message.id)
                                    }
                                    className="p-1 rounded-full bg-card border border-border shadow-sm text-muted hover:text-foreground touch-manipulation"
                                    aria-label="Message options"
                                  >
                                    <MoreVertical size={12} />
                                  </button>
                                  {messageMenuId === message.id && (
                                    <div
                                      className={`absolute top-full mt-1 w-40 rounded-lg bg-card border border-border shadow-lg py-1 z-20 ${
                                        isFromCurrentUser ? 'right-0' : 'left-0'
                                      }`}
                                    >
                                      {isFromCurrentUser && canEditMessage(message.created_at) && (
                                        <button
                                          type="button"
                                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-card-hover"
                                          onClick={() => startEditingMessage(message)}
                                        >
                                          <Pencil size={12} />
                                          {t('messages.edit', 'Edit')}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-card-hover"
                                        onClick={() => handleDeleteMessage(message.id, isFromCurrentUser)}
                                      >
                                        <Trash2 size={12} />
                                        {t('messages.delete', 'Delete')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {message.is_deleted ? (
                                <div className="text-sm leading-relaxed">
                                  {t('messages.messageDeleted', 'Message deleted')}
                                </div>
                              ) : editingMessageId === message.id ? (
                                <div className="space-y-2 min-w-[200px] relative z-10">
                                  {message.is_encrypted && (
                                    <p className="text-[10px] text-muted flex items-center gap-1">
                                      <Lock size={10} />
                                      {t(
                                        'messages.editingEncrypted',
                                        'Editing as plaintext — will re-encrypt on save'
                                      )}
                                    </p>
                                  )}
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full text-sm bg-background text-foreground border border-border rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-accent relative z-10"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelEditingMessage}
                                      className="text-xs px-2 py-1 rounded text-muted hover:text-foreground"
                                    >
                                      {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveEditedMessage}
                                      disabled={editSaving || !editContent.trim()}
                                      className="text-xs px-2 py-1 rounded bg-accent text-black font-medium disabled:opacity-50"
                                    >
                                      {editSaving ? '...' : t('common.save', 'Save')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {message.decrypt_failed && !message.content ? (
                                    <div
                                      className={`flex items-center gap-1.5 text-[12px] ${
                                        isFromCurrentUser ? 'text-black/55' : 'text-muted'
                                      }`}
                                    >
                                      <Lock size={12} className="shrink-0 opacity-70" />
                                      <span>{t('messages.decryptUnavailable', 'Message unavailable on this device')}</span>
                                    </div>
                                  ) : message.content ? (
                                    <div className="text-[13.5px] sm:text-sm leading-relaxed break-words">
                                      {isFromCurrentUser ||
                                      message.content.startsWith('🔒') ? (
                                        <RichText
                                          content={
                                            message.content.startsWith('🔒')
                                              ? t(
                                                  'messages.decryptUnavailable',
                                                  'Message unavailable on this device'
                                                )
                                              : message.content
                                          }
                                          showLinkPreviews={true}
                                          compactLinks={true}
                                          onHashtagClick={(tag) => console.log('Hashtag clicked:', tag)}
                                          onMentionClick={(username) => navigate(`/profile/${username}`)}
                                        />
                                      ) : (
                                        <ContentTranslator
                                          content={message.content}
                                          sourceType="message"
                                          sourceId={message.id}
                                          originalLanguage={message.language || 'en'}
                                          translatedContent={message.translated_content}
                                          translatedLanguage={message.translated_language}
                                          autoTranslate
                                          alwaysShowControls
                                          renderContent={(text) => (
                                            <RichText
                                              content={text}
                                              showLinkPreviews={true}
                                              compactLinks={true}
                                              onHashtagClick={(tag) => console.log('Hashtag clicked:', tag)}
                                              onMentionClick={(username) => navigate(`/profile/${username}`)}
                                            />
                                          )}
                                        />
                                      )}
                                    </div>
                                  ) : null}

                                  {message.images && message.images.length > 0 && (
                                    <div
                                      className={`grid gap-1.5 ${message.content ? 'mt-2' : ''} ${
                                        message.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                                      }`}
                                    >
                                      {message.images.map((mediaUrl: string, mediaIndex: number) => {
                                        const isVideo = mediaUrl
                                          .toLowerCase()
                                          .match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/);
                                        return isVideo ? (
                                          <div key={mediaIndex} className="relative overflow-hidden rounded-xl">
                                            <div
                                              className="cursor-pointer"
                                              onClick={() => handleVideoClick(mediaUrl)}
                                            >
                                              <SupabaseVideo
                                                src={mediaUrl}
                                                controls={playingVideoId === mediaUrl}
                                                muted={playingVideoId !== mediaUrl}
                                                playsInline={true}
                                                autoPlay={playingVideoId === mediaUrl}
                                                className="w-full h-auto max-h-52 object-cover rounded-xl"
                                              />
                                              {playingVideoId !== mediaUrl && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                  <div className="w-11 h-11 bg-black/55 rounded-full flex items-center justify-center backdrop-blur-sm">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                                      <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <img
                                            key={mediaIndex}
                                            src={mediaUrl}
                                            alt={`Message media ${mediaIndex + 1}`}
                                            className="w-full h-auto max-h-52 object-cover rounded-xl cursor-pointer border border-black/5"
                                            onClick={() => window.open(mediaUrl, '_blank')}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}

                              {(showTime || (message.is_edited && !message.is_deleted)) && (
                                <div
                                  className={`flex items-center gap-1 mt-1 ${
                                    isFromCurrentUser ? 'justify-end' : 'justify-start'
                                  }`}
                                >
                                  {message.is_edited && !message.is_deleted && (
                                    <span
                                      className={`text-[10px] italic ${
                                        isFromCurrentUser ? 'text-black/50' : 'text-muted'
                                      }`}
                                    >
                                      {t('messages.edited', 'edited')}
                                    </span>
                                  )}
                                  {showTime && (
                                    <span
                                      className={`text-[10px] tabular-nums ${
                                        message.is_deleted
                                          ? 'text-muted'
                                          : isFromCurrentUser
                                          ? 'text-black/55'
                                          : 'text-muted'
                                      }`}
                                    >
                                      {formatMessageTime(message.created_at)}
                                    </span>
                                  )}
                                  {showTime && isFromCurrentUser && !message.is_deleted && (
                                    message.read ? (
                                      <CheckCheck
                                        size={13}
                                        className="text-sky-600"
                                        strokeWidth={2.5}
                                        aria-label={t('messages.read', 'Read')}
                                      />
                                    ) : (
                                      <Check
                                        size={11}
                                        className="text-black/45"
                                        strokeWidth={2.5}
                                        aria-label={t('messages.sent', 'Sent')}
                                      />
                                    )
                                  )}
                                </div>
                              )}
                            </div>

                            {!message.is_deleted && (
                              <div
                                className={`flex flex-wrap items-center gap-1 mt-1 ${
                                  isFromCurrentUser ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                {Object.entries(message.reactions || {}).map(([emoji, data]) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      currentConversation &&
                                      reactToMessage(currentConversation.id, message.id, emoji)
                                    }
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                                      data.reacted_by_me
                                        ? 'bg-accent/20 border-accent/40 text-foreground'
                                        : 'bg-card border-border text-muted hover:border-accent/30'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="tabular-nums">{data.count}</span>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReactionPickerId(
                                      reactionPickerId === message.id ? null : message.id
                                    )
                                  }
                                  className="opacity-100 text-[11px] px-1.5 py-0.5 rounded-full border border-border text-muted hover:text-foreground hover:border-accent/40 touch-manipulation"
                                  aria-label="Add reaction"
                                >
                                  +
                                </button>
                                {reactionPickerId === message.id && (
                                  <div className="flex gap-0.5 p-1 rounded-full bg-card border border-border shadow-md">
                                    {['❤️', '👍', '🔥', '😂', '😮', '🎉'].map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        className="hover:scale-125 transition-transform text-sm px-0.5"
                                        onClick={() => {
                                          if (currentConversation) {
                                            void reactToMessage(
                                              currentConversation.id,
                                              message.id,
                                              emoji
                                            );
                                          }
                                          setReactionPickerId(null);
                                        }}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </div>

            {/* Typing */}
            {currentConversation && typingUsers[currentConversation.id]?.length > 0 && (
              <div className="px-3 sm:px-5 py-1.5 border-t border-border/40 flex-shrink-0">
                <div className="max-w-3xl mx-auto">
                  {typingDrafts[currentConversation.id]?.text?.trim() ? (
                    <div className="flex items-end gap-2">
                      <div className="w-7 sm:w-8 flex-shrink-0">
                        <Avatar
                          src={currentConversation.participants[0]?.avatar_url || ''}
                          alt={currentConversation.participants[0]?.full_name || 'User'}
                          size="sm"
                          userId={currentConversation.participants[0]?.id || ''}
                          showOnlineStatus={false}
                        />
                      </div>
                      <div className="max-w-[82%] sm:max-w-[70%] rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md border border-dashed border-border/80 bg-card/55 px-3 py-2 shadow-theme-sm backdrop-blur-[2px] opacity-90">
                        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                            <Pencil size={10} />
                            Live draft
                          </span>
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="truncate">
                            {currentConversation.participants[0]?.full_name} {t('messages.isTyping')}
                          </span>
                        </div>
                        <p className="text-sm italic text-foreground/75 whitespace-pre-wrap break-words">
                          {typingDrafts[currentConversation.id]?.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="truncate">
                        {currentConversation.participants[0]?.full_name} {t('messages.isTyping')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Composer — pinned to bottom of chat column (nav hidden while chatting) */}
            <div className="z-30 px-2.5 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-border bg-background/98 backdrop-blur-md flex-shrink-0">
              <div className="max-w-3xl mx-auto">
                {(imagePreviewUrls.length > 0 || videoPreviewUrls.length > 0) && (
                  <div className="mb-2 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-24 overflow-y-auto">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={`img-${index}`} className="relative group aspect-square">
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-xl border border-border" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-background/90 rounded-full text-foreground border border-border opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {videoPreviewUrls.map((url, index) => (
                      <div key={`vid-${index}`} className="relative group aspect-square">
                        <video src={url} muted className="w-full h-full object-cover rounded-xl border border-border" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="absolute top-1 right-1 p-1 bg-background/90 rounded-full text-foreground border border-border opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-1.5 sm:gap-2 p-1 rounded-2xl bg-card border border-border shadow-theme-sm focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-muted hover:text-foreground hover:bg-card-hover rounded-xl flex-shrink-0 touch-manipulation transition-colors"
                    aria-label="Add media"
                    title="Add media"
                  >
                    <Film size={18} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder={t('messages.messageUserPlaceholder', {
                        username: currentConversation.participants[0]?.full_name || t('messages.user'),
                      })}
                      className="w-full bg-transparent text-foreground px-1 py-2.5 text-[15px] sm:text-sm focus:outline-none placeholder:text-muted"
                      enterKeyHint="send"
                      autoComplete="off"
                    />
                    {showMessagePreview && (
                      <div className="mb-2 mt-0.5 p-2.5 bg-background/60 rounded-xl border border-border/60">
                        <div className="text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">
                          Preview
                        </div>
                        <div className="text-sm">
                          <RichText content={newMessage} showLinkPreviews={true} compactLinks={true} />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      isSending ||
                      (!newMessage.trim() && selectedImages.length === 0 && selectedVideos.length === 0)
                    }
                    className="bg-foreground text-background p-2.5 rounded-xl hover:opacity-90 transition-all flex-shrink-0 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed shadow-theme-sm"
                    aria-label={t('messages.sendMessage')}
                  >
                    {isSending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : !showUserList ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-card rounded-2xl border border-border flex items-center justify-center mb-5 shadow-theme-md">
              <MessageSquare size={36} className="text-muted" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 tracking-tight">
              {t('messages.welcomeTitle')}
            </h3>
            <p className="text-muted max-w-sm mb-6 text-sm leading-relaxed">
              {t('messages.welcomePrompt')}
            </p>
            <button
              onClick={() => { setShowUserList(true); setShowMobileSidebar(false); }}
              className="bg-foreground text-background px-6 py-3 rounded-xl hover:opacity-90 transition-all font-medium touch-manipulation shadow-theme-button text-sm"
            >
              {t('messages.startNewConversation')}
            </button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {callRoomId && callType && user && (
          <CallRoom
            roomId={callRoomId}
            callType={callType}
            userId={user.id}
            userName={user.name}
            onLeave={handleEndCall}
          />
        )}
      </AnimatePresence>
      <CallNotification
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        currentCallRoomId={callRoomId}
      />

      {/* Delete scope modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4"
            onClick={() => !deleteBusy && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t('messages.deleteMessage', 'Delete message')}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {t(
                      'messages.deleteMessageHint',
                      'Choose how you want to delete this message.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => setDeleteTarget(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover"
                >
                  <X size={16} />
                </button>
              </div>

              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void confirmDeleteMessage('me')}
                className="w-full flex items-start gap-3 text-left p-3 rounded-xl border border-border hover:bg-card-hover transition-colors disabled:opacity-50"
              >
                <Trash size={18} className="text-muted mt-0.5 shrink-0" />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {t('messages.deleteForMe', 'Delete for me')}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5 leading-snug">
                    {t(
                      'messages.deleteForMeHint',
                      'Removes it from your chat and moves it to your trash. The other person still sees it.'
                    )}
                  </span>
                </span>
              </button>

              {deleteTarget.isOwn && (
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void confirmDeleteMessage('everyone')}
                  className="w-full flex items-start gap-3 text-left p-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Ban size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-red-500">
                      {t('messages.deleteForEveryone', 'Delete for everyone')}
                    </span>
                    <span className="block text-[11px] text-muted mt-0.5 leading-snug">
                      {t(
                        'messages.deleteForEveryoneHint',
                        'Removes the message on both sides. They will only see “Message deleted”. A copy stays in your trash.'
                      )}
                    </span>
                  </span>
                </button>
              )}

              {deleteBusy && (
                <div className="flex justify-center py-1">
                  <Loader2 className="w-5 h-5 animate-spin text-muted" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trash panel */}
      <AnimatePresence>
        {showTrash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4"
            onClick={() => setShowTrash(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <Trash size={16} className="text-muted" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('messages.trash', 'Trash')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTrash(false)}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {trashLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  </div>
                ) : trashItems.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Trash2 className="w-8 h-8 mx-auto text-muted mb-2" />
                    <p className="text-sm text-muted">
                      {t('messages.trashEmpty', 'No deleted messages')}
                    </p>
                    <p className="text-[11px] text-muted mt-2 leading-relaxed">
                      Deleted messages appear here. If trash stays empty after deleting, run
                      migration{' '}
                      <code className="text-[10px]">20260716_message_trash.sql</code> in
                      Supabase SQL editor.
                    </p>
                  </div>
                ) : (
                  trashItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted truncate">
                          {item.is_from_current_user
                            ? t('messages.you', 'You')
                            : item.from_user?.full_name || 'User'}
                          {' · '}
                          {item.scope === 'everyone'
                            ? t('messages.deletedForEveryone', 'Deleted for everyone')
                            : t('messages.deletedForMe', 'Deleted for me')}
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            await permanentlyDeleteFromTrash(item.id);
                            setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
                          }}
                          className="text-[10px] text-red-500 hover:underline shrink-0"
                        >
                          {t('messages.deleteForever', 'Delete forever')}
                        </button>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {item.content ||
                          (item.images?.length
                            ? `📎 ${item.images.length} media`
                            : t('messages.noContent', 'No content'))}
                      </p>
                      {item.deleted_at && (
                        <p className="text-[10px] text-muted">
                          {format(new Date(item.deleted_at), 'dd MMM yyyy · HH:mm')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Messages;
