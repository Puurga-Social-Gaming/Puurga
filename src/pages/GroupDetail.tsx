import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Send, ArrowLeft, Settings, UserPlus, LogOut, Crown, Image, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/api';
import toast from 'react-hot-toast';
import { useUser } from '../context/UserContext';

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
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await api.post(`/groups/${id}/messages`, {
        content: newMessage.trim()
      });
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading group...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Group not found</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0a0a0a] flex flex-col"
    >
      {/* Header */}
      <div 
        className="relative h-48 bg-cover bg-center"
        style={{
          backgroundImage: group.cover_image_url ? `url(${group.cover_image_url})` : undefined,
          backgroundColor: '#2d2d2d'
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
            {group.user_role === 'admin' && (
              <button className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-4 border-[#0a0a0a]">
            {group.profile_image_url ? (
              <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <Users size={32} className="text-orange-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <p className="text-gray-300">{group.member_count} members</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col">
          {!group.is_member ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Users size={64} className="text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Join to participate</h2>
              <p className="text-gray-400 mb-6 text-center max-w-md">
                {group.description || 'Join this group to start chatting with other members.'}
              </p>
              <button
                onClick={handleJoinGroup}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
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
                    const isOwnMessage = message.sender_id === user?.id;
                    const showDate = index === 0 || 
                      formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

                    return (
                      <React.Fragment key={message.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-[#1a1a1a] text-gray-400 text-xs rounded-full">
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
                                  <div className="w-full h-full flex items-center justify-center text-orange-500 text-sm font-bold">
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
                                className={`px-4 py-2 rounded-2xl ${
                                  isOwnMessage
                                    ? 'bg-orange-500 text-white rounded-br-md'
                                    : 'bg-[#1a1a1a] text-white rounded-bl-md'
                                }`}
                              >
                                <p className="break-words">{message.content}</p>
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
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-full px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-800 bg-[#0a0a0a] overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Members</h3>
                <span className="text-sm text-gray-400">{group.member_count}</span>
              </div>
              
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2d2d2d] overflow-hidden flex-shrink-0">
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-orange-500 font-bold">
                          {member.profile?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {member.profile?.full_name || member.profile?.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        @{member.profile?.username || 'unknown'}
                      </p>
                    </div>
                    {member.role === 'admin' && (
                      <Crown size={16} className="text-orange-500 flex-shrink-0" />
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
      </div>
    </motion.div>
  );
};

export default GroupDetail;
