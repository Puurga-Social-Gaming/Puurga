import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  AlertCircle, 
  MapPin, 
  Link2, 
  Calendar, 
  UserPlus, 
  UserMinus, 
  MessageCircle,
  Users,
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2
} from 'lucide-react';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import { DEFAULT_IMAGES } from '../constants/defaultImages';
import { useUser } from '../context/UserContext';

interface UserProfileData {
  id: string;
  username: string;
  name: string;
  avatar: string;
  coverPhoto?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedAt?: string;
  friendsCount: number;
  postsCount: number;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isOwnProfile: boolean;
}

interface UserPost {
  id: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  likes: number;
  comments: number;
  liked: boolean;
}

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfile();
      loadUserPosts();
    }
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/users/profile/${username}`);
      const data = response.data;
      
      setProfile({
        id: data.id,
        username: data.username,
        name: data.full_name || data.name || data.username,
        avatar: data.avatar_url || data.avatar || DEFAULT_IMAGES.avatar,
        coverPhoto: data.cover_photo || data.coverPhoto,
        bio: data.bio,
        location: data.location,
        website: data.website,
        joinedAt: data.created_at || data.createdAt,
        friendsCount: data.friends_count || data.friendsCount || 0,
        postsCount: data.posts_count || data.postsCount || 0,
        isFriend: data.is_friend || data.isFriend || false,
        hasPendingRequest: data.has_pending_request || data.hasPendingRequest || false,
        isOwnProfile: currentUser?.username === username,
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      if (err.response?.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await api.get(`/api/users/${username}/posts`);
      const posts = Array.isArray(response.data) ? response.data : response.data.posts || [];
      setUserPosts(posts.map((p: any) => ({
        id: p.id,
        content: p.content,
        mediaUrl: p.media_url || p.mediaUrl,
        createdAt: p.created_at || p.createdAt,
        likes: p.likes || p.like_count || 0,
        comments: p.comments || p.comment_count || 0,
        liked: p.liked || false,
      })));
    } catch (err) {
      console.error('Failed to load user posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    try {
      setSendingRequest(true);
      await api.post('/api/friend-requests', { toUserId: profile.id });
      toast.success('Friend request sent!');
      setProfile(prev => prev ? { ...prev, hasPendingRequest: true } : null);
    } catch (err: any) {
      console.error('Failed to send friend request:', err);
      toast.error(err.response?.data?.error || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile) return;
    try {
      setSendingRequest(true);
      await api.delete(`/api/friends/${profile.id}`);
      toast.success('Friend removed');
      setProfile(prev => prev ? { ...prev, isFriend: false } : null);
    } catch (err) {
      console.error('Failed to remove friend:', err);
      toast.error('Failed to remove friend');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleMessage = () => {
    if (profile) {
      navigate(`/messages?user=${profile.username}`);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatPostDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0a0a0a]">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-400">{error || 'Profile not found'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#252525] transition-colors"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0a0a0a]"
    >
      {/* Cover Photo */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-orange-500/20 via-[#1a1a1a] to-purple-500/20">
        {profile.coverPhoto && (
          <img 
            src={profile.coverPhoto} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Profile Info */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar 
              src={profile.avatar} 
              alt={profile.name} 
              size="lg"
              className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-[#0a0a0a] rounded-full"
            />
            {profile.isFriend && (
              <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Friend
              </div>
            )}
          </div>

          {/* Name and Actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.name}</h1>
              <p className="text-gray-400">@{profile.username}</p>
            </div>

            {/* Action Buttons - Only show for other users */}
            {!profile.isOwnProfile && (
              <div className="flex items-center gap-3">
                {profile.isFriend ? (
                  <>
                    <button
                      onClick={handleMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                      <MessageCircle size={18} />
                      Message
                    </button>
                    <button
                      onClick={handleRemoveFriend}
                      disabled={sendingRequest}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50 rounded-lg transition-colors"
                    >
                      <UserMinus size={18} />
                      Unfriend
                    </button>
                  </>
                ) : profile.hasPendingRequest ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-gray-400 border border-gray-700 rounded-lg cursor-not-allowed"
                  >
                    <UserPlus size={18} />
                    Request Pending
                  </button>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={sendingRequest}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingRequest ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <UserPlus size={18} />
                    )}
                    Add Friend
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio and Details */}
        <div className="mt-6 space-y-4">
          {profile.bio && (
            <p className="text-gray-300 text-lg">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-gray-400 text-sm">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a 
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-orange-400 hover:underline"
              >
                <Link2 size={16} />
                <span>{profile.website}</span>
              </a>
            )}
            {profile.joinedAt && (
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>Joined {formatDate(profile.joinedAt)}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 py-4 border-t border-b border-gray-800">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{profile.friendsCount}</p>
              <p className="text-gray-400 text-sm flex items-center gap-1">
                <Users size={14} /> Friends
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{profile.postsCount}</p>
              <p className="text-gray-400 text-sm">Posts</p>
            </div>
          </div>
        </div>

        {/* User Posts */}
        <div className="mt-6 pb-8">
          <h2 className="text-xl font-bold text-white mb-4">Posts</h2>
          
          {loadingPosts ? (
            <div className="flex items-center justify-center text-gray-400 py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading posts...
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center text-gray-400 py-12 bg-[#1a1a1a] rounded-xl">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={profile.avatar} alt={profile.name} size="sm" />
                    <div>
                      <p className="text-white font-medium">{profile.name}</p>
                      <p className="text-gray-500 text-xs">{formatPostDate(post.createdAt)}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-200 mb-3">{post.content}</p>
                  
                  {post.mediaUrl && (
                    <img 
                      src={post.mediaUrl} 
                      alt="Post media" 
                      className="w-full rounded-lg mb-3 max-h-96 object-cover"
                    />
                  )}

                  <div className="flex items-center gap-6 pt-3 border-t border-gray-800 text-gray-400">
                    <button className="flex items-center gap-2 hover:text-pink-500 transition-colors">
                      <Heart size={18} className={post.liked ? 'fill-pink-500 text-pink-500' : ''} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-orange-500 transition-colors">
                      <MessageCircle size={18} />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-blue-500 transition-colors ml-auto">
                      <Share2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfile; 