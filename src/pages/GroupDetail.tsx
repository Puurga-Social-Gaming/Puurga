import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Send, ArrowLeft, Settings, UserPlus, LogOut, Crown, Shield, X, Copy, RefreshCw, Link as LinkIcon, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import SupabaseVideo from '../components/UI/SupabaseVideo';
import RichText from '../components/RichText/RichText';
import { extractUrls } from '../utils/linkParser';

interface GroupMember {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  profile?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  media?: string[];
  sender?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  profile_image_url?: string;
  cover_image_url?: string;
  is_private: boolean;
  credits: number;
  member_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: GroupMember[];
  is_member: boolean;
  user_role: string | null;
  creator?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [showGroupMessagePreview, setShowGroupMessagePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copyingLink, setCopyingLink] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
      fetchMessages();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!id || !group?.is_member) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [id, group?.is_member]);

  // Detect URLs in group message for live preview
  useEffect(() => {
    if (newMessage) {
      const urls = extractUrls(newMessage);
      setShowGroupMessagePreview(urls.length > 0);
    } else {
      setShowGroupMessagePreview(false);
    }
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroupDetails = async () => {
    try {
      const response = await api.get(`/groups/${id}`);
      setGroup(response.data);
    } catch (error) {
      toast.error('Failed to load group');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/groups/${id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length + selectedVideos.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    const newImages = files.filter(file => file.type.startsWith('image/'));
    const newVideos = files.filter(file => file.type.startsWith('video/'));

    if (newImages.length > 0) {
      setSelectedImages(prev => [...prev, ...newImages]);
      const newPreviewUrls = newImages.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
      toast.success(`${newImages.length} image(s) added`);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedImages.length === 0 && selectedVideos.length === 0) || sendingMessage) return;

    setSendingMessage(true);
    try {
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

      const response = await api.post(`/groups/${id}/messages`, {
        content: newMessage.trim(),
        media: mediaUrls
      });
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      setSelectedImages([]);
      setSelectedVideos([]);
      setImagePreviewUrls([]);
      setVideoPreviewUrls([]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await api.post(`/groups/${id}/join`);
      toast.success('Successfully joined group!');
      fetchGroupDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      await api.post(`/groups/${id}/leave`);
      toast.success('Left group successfully');
      navigate('/groups');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to leave group');
    }
  };

  const fetchInviteLink = async () => {
    try {
      const response = await api.get(`/groups/${id}/invite`);
      setInviteLink(response.data.invite_link);
    } catch (error) {
      console.error('Failed to fetch invite link:', error);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) {
      await fetchInviteLink();
      return;
    }
    setCopyingLink(true);
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    } finally {
      setCopyingLink(false);
    }
  };

  const handleRegenerateInvite = async () => {
    if (!confirm('Generate a new invite link? The old one will stop working.')) return;
    try {
      const response = await api.post(`/groups/${id}/invite/regenerate`);
      setInviteLink(response.data.inviteLink);
      toast.success('New invite link generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Dismiss keyboard on mobile when clicking outside input areas
    if (e.target === e.currentTarget) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.blur();
      }
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/groups/${id}`);
      toast.success('Group deleted successfully');
      navigate('/groups');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete group');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/groups/${id}/members/${memberId}`);
      toast.success('Member removed successfully');
      fetchGroupDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleMuteMember = async (memberId: string) => {
    try {
      await api.post(`/groups/${id}/members/${memberId}/mute`, { duration: 60 });
      toast.success('Member muted for 1 hour');
      fetchGroupDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mute member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await api.put(`/groups/${id}/members/${memberId}/role`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      fetchGroupDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading group...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Group not found</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 h-full bg-background"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div
        className="relative h-48 bg-cover bg-center"
        style={{
          backgroundImage: group.cover_image_url 
            ? `url(${group.cover_image_url})` 
            : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          backgroundColor: group.cover_image_url ? undefined : 'var(--accent)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/groups')}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <Users size={20} />
            </button>
            {(group.user_role === 'admin' || group.user_role === 'moderator') && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full text-white transition-colors ${showSettings ? 'bg-accent text-foreground' : 'bg-black/50 hover:bg-white/20'}`}
              >
                <Settings size={20} />
              </button>
            )}
            <button
              onClick={handleCopyInviteLink}
              disabled={copyingLink}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"
              title="Copy invite link"
            >
              {copyingLink ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <LinkIcon size={20} />
              )}
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-card flex items-center justify-center overflow-hidden border-4 border-[#0a0a0a]">
            {group.profile_image_url ? (
              <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <Users size={32} className="text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <p className="text-gray-300">{group.member_count} members</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0">
          {!group.is_member ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Users size={64} className="text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Join to participate</h2>
              <p className="text-gray-400 mb-6 text-center max-w-md">
                {group.description || 'Join this group to start chatting with other members.'}
              </p>
              <button
                onClick={handleJoinGroup}
                className="px-6 py-3 bg-[var(--accent)] text-[var(--fg)] rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
              >
                <UserPlus size={20} />
                Join Group
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Send size={48} className="mb-4 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    // Use String() comparison to handle potential type mismatches (UUID vs string)
                    const isOwnMessage = String(message.sender_id) === String(user?.id);
                    const showDate = index === 0 ||
                      formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

                    // Debug logging (remove after fixing)
                    if (index === 0) {
                      console.log('Message ownership check:', {
                        messageSenderId: message.sender_id,
                        currentUserId: user?.id,
                        isOwnMessage,
                        senderType: typeof message.sender_id,
                        userIdType: typeof user?.id
                      });
                    }

                    return (
                      <React.Fragment key={message.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-card text-gray-400 text-xs rounded-full">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            {!isOwnMessage && (
                              <div className="w-8 h-8 rounded-full bg-[#2d2d2d] flex-shrink-0 overflow-hidden">
                                {message.sender?.avatar_url ? (
                                  <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                    {message.sender?.username?.[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              {!isOwnMessage && (
                                <p className="text-xs text-gray-400 mb-1">
                                  {message.sender?.full_name || message.sender?.username || 'Unknown'}
                                </p>
                              )}
                              <div
                                className={`px-4 py-2 rounded-2xl ${isOwnMessage
                                    ? 'bg-white text-black dark:bg-card dark:text-foreground rounded-br-md'
                                    : 'bg-card text-foreground rounded-bl-md'
                                  }`}
                              >
                                <p className="break-words">{message.content}</p>
                                {message.media && message.media.length > 0 && (
                                  <div className={`mt-2 grid gap-1 ${message.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {message.media.map((mediaUrl: string, mediaIndex: number) => {
                                      const isVideo = mediaUrl.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/);
                                      return isVideo ? (
                                        <div key={mediaIndex} className="relative">
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
                                              className="w-full h-auto max-h-48 object-cover rounded-lg"
                                            />
                                            {playingVideoId !== mediaUrl && (
                                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8 5v14l11-7z"/>
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
                                          className="w-full h-auto max-h-48 object-cover rounded-lg cursor-pointer"
                                          onClick={() => {
                                            window.open(mediaUrl, '_blank');
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : ''}`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                {/* Media Previews */}
                {(imagePreviewUrls.length > 0 || videoPreviewUrls.length > 0) && (
                  <div className="mb-3">
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-background/80 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {videoPreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <video
                            src={url}
                            muted
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVideo(index)}
                            className="absolute top-1 right-1 p-1 bg-background/80 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-muted hover:text-accent rounded-full hover:bg-accent/10"
                    aria-label="Add media (images or videos)"
                    title="Add media (images or videos)"
                  >
                    <Film size={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaSelect}
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                  />
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-card border border-border rounded-full px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {/* Live Preview for Group Message */}
                  {showGroupMessagePreview && (
                    <div className="mt-2 p-2 bg-card/50 rounded-lg">
                      <div className="text-xs text-muted mb-1 font-medium">
                        Message Preview
                      </div>
                      <div className="text-sm">
                        <RichText 
                          content={newMessage}
                          showLinkPreviews={true}
                          compactLinks={true}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!newMessage.trim() && selectedImages.length === 0 && selectedVideos.length === 0}
                    className="p-3 bg-[var(--accent)] text-[var(--fg)] rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Members Sidebar */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-background overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">Members</h3>
                  <span className="text-sm text-gray-400">{group.member_count}</span>
                </div>

                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2d2d2d] overflow-hidden flex-shrink-0">
                        {member.profile?.avatar_url ? (
                          <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                              <div className="w-full h-full flex items-center justify-center text-foreground font-bold">
                            {member.profile?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">
                          {member.profile?.full_name || member.profile?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          @{member.profile?.username || 'unknown'}
                        </p>
                      </div>
                      {member.role === 'admin' && (
                        <Crown size={16} className="text-muted flex-shrink-0" />
                      )}
                      {member.role === 'moderator' && (
                        <Shield size={16} className="text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {group.is_member && (
                  <button
                    onClick={handleLeaveGroup}
                    className="w-full mt-6 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    Leave Group
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Settings Panel */}
        <AnimatePresence>
          {showSettings && (group.user_role === 'admin' || group.user_role === 'moderator') && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-background overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Settings size={20} className="text-white" />
                    <h3 className="text-lg font-bold text-foreground">Group Settings</h3>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 text-gray-400 hover:text-foreground hover:bg-card-hover rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Group Info */}
                <div className="mb-6 p-4 bg-card rounded-xl">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">GROUP INFO</h4>
                  <p className="text-foreground font-medium">{group.name}</p>
                  <p className="text-sm text-gray-400 mt-1">{group.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-gray-400">{group.member_count} members</span>
                    <span className="text-gray-400">{group.is_private ? '🔒 Private' : '🌐 Public'}</span>
                  </div>
                </div>

                {/* Invite Link */}
                <div className="mb-6 p-4 bg-card rounded-xl">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">INVITE LINK</h4>
                  <p className="text-xs text-gray-400 mb-3">Share this link to invite others</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink || 'Click copy to generate link'}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className="p-2 bg-accent text-foreground rounded-lg hover:opacity-90 transition-opacity"
                      title="Copy link"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  {group.user_role === 'admin' && (
                    <button
                      onClick={handleRegenerateInvite}
                      className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-red-400 border border-border rounded-lg hover:border-red-500/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Regenerate Link
                    </button>
                  )}
                </div>

                {/* Members Management */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">MEMBERS ({group.members.length})</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {group.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2d2d2d] overflow-hidden flex-shrink-0">
                            {member.profile?.avatar_url ? (
                              <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                          <div className="w-full h-full flex items-center justify-center text-foreground font-bold">
                                {member.profile?.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-medium">
                              {member.profile?.full_name || member.profile?.username || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${member.role === 'admin' ? 'bg-accent/20 text-accent' :
                                  member.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Admin controls for non-admin members */}
                        {group.user_role === 'admin' && member.role !== 'admin' && member.user_id !== user?.id && (
                          <div className="flex items-center gap-1">
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                              className="text-xs bg-input text-foreground rounded px-2 py-1 border border-border focus:outline-none focus:border-white"
                            >
                              <option value="member">Member</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Remove member"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Moderator controls for regular members */}
                        {group.user_role === 'moderator' && member.role === 'member' && member.user_id !== user?.id && (
                          <button
                            onClick={() => handleMuteMember(member.user_id)}
                            className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
                          >
                            Mute
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone - Admin Only */}
                {group.user_role === 'admin' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <h4 className="text-sm font-semibold text-red-400 mb-3">DANGER ZONE</h4>
                    <p className="text-xs text-gray-400 mb-4">
                      Deleting this group will permanently remove all messages and members. This action cannot be undone.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                          handleDeleteGroup();
                        }
                      }}
                      className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Delete Group
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GroupDetail;
