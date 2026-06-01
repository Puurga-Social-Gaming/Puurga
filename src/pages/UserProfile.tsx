import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  MapPin,
  Link2,
  Calendar,
  UserMinus,
  MessageCircle,
  Users,
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  Flame,
  Zap,
  Ghost
} from 'lucide-react';
import api from '../lib/axios';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import FriendRequestButton from '../components/FriendRequestButton/FriendRequestButton';
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
  credits: number;
  purgeStreak: number;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isOwnProfile: boolean;
  isGhosted?: boolean;
  redemptionProgress?: number;
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
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfile();
      loadUserPosts();
    }
  }, [username]);

  // Real-time subscription for profile status updates
  useEffect(() => {
    if (!profile?.id || !currentUser?.id) return;

    const channel = supabase.channel(`profile-status:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${currentUser.id}` },
        () => loadProfile()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${currentUser.id}` },
        () => loadProfile()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${currentUser.id}` },
        () => loadProfile()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `friend_id=eq.${currentUser.id}` },
        () => loadProfile()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, currentUser?.id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/users/profile/${username}`);
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
        credits: data.credits || 0,
        purgeStreak: data.purge_streak || data.purgeStreak || 0,
        isFriend: data.is_friend || data.isFriend || false,
        hasPendingRequest: data.has_pending_request || data.hasPendingRequest || false,
        isOwnProfile: currentUser?.username === username,
        isGhosted: data.is_ghost || data.purgatory_status || false,
        redemptionProgress: data.redemption_progress || 0,
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
      const response = await api.get(`/users/${username}/posts`);
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

  const handleRemoveFriend = async () => {
    if (!profile) return;
    try {
      setSendingRequest(true);
      await api.delete(`/friends/${profile.id}`);
      toast.success('Friend removed');
      setProfile(prev => prev ? { ...prev, isFriend: false } : null);
    } catch (err) {
      console.error('Failed to remove friend:', err);
      toast.error('Failed to remove friend');
    } finally {
      setSendingRequest(false);
    }
  };

  const handlePurgeUser = async () => {
    if (!profile) return;
    try {
      setIsPurging(true);
      const response = await api.post(`/users/${profile.id}/purge`);
      toast.success('User purged successfully!');
      if (response.data.ghostModeTriggered) {
        toast.error('User has been sent to purgatory!');
      }
      loadProfile();
    } catch (err: any) {
      console.error('Failed to purge user:', err);
      toast.error(err.response?.data?.error || 'Failed to purge user');
    } finally {
      setIsPurging(false);
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-muted">{error || 'Profile not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-card text-foreground rounded-lg hover:bg-card/80 transition-colors"
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
      className="min-h-screen bg-background"
    >
      {/* Cover Photo */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-gray-500/20 via-background-secondary to-gray-600/20">
        {profile.coverPhoto && (
          <img
            src={profile.coverPhoto}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

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
              className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background rounded-full"
            />
            {profile.isFriend && (
              <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full border-2 border-background">
                Friend
              </div>
            )}
          </div>

          {/* Name and Actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{profile.name}</h1>
              <p className="text-muted">@{profile.username}</p>
            </div>

            {/* Action Buttons - Only show for other users */}
            {!profile.isOwnProfile && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePurgeUser}
                  disabled={isPurging}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                  title="Purge User"
                >
                  <Flame size={18} />
                  Purge
                </button>
                {profile.isFriend ? (
                  <>
                    <button
                      onClick={handleMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--fg)] rounded-lg transition-colors"
                    >
                      <MessageCircle size={18} />
                      Message
                    </button>
                    <button
                      onClick={handleRemoveFriend}
                      disabled={sendingRequest}
                      className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-red-500/10 text-muted hover:text-red-500 border border-border hover:border-red-500/50 rounded-lg transition-colors"
                    >
                      <UserMinus size={18} />
                      Unfriend
                    </button>
                  </>
                ) : (
                  <FriendRequestButton
                    targetUserId={profile.id}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio and Details */}
        <div className="mt-6 space-y-4">
          {profile.bio && (
            <p className="text-foreground/90 text-lg">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-muted text-sm">
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
                className="flex items-center gap-1 text-gray-300 hover:underline"
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

          {profile.isGhosted && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/30 border border-gray-800 rounded-lg text-xs text-gray-400">
              <Ghost size={14} className="text-gray-500" />
              <span>Ghosted</span>
              {profile.redemptionProgress !== undefined && profile.redemptionProgress > 0 && (
                <span className="text-gray-600">({profile.redemptionProgress}% redeemed)</span>
              )}
            </div>
          )}

          {/* Stats - Compact horizontal layout */}
          <div className="flex items-center justify-center gap-6 py-4 border-t border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{profile.friendsCount}</p>
                <p className="text-xs text-muted font-medium">Friends</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{profile.postsCount}</p>
                <p className="text-xs text-muted font-medium">Posts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{profile.credits}</p>
                <p className="text-xs text-muted font-medium">Credits</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{profile.purgeStreak}</p>
                <p className="text-xs text-muted font-medium">Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Posts */}
        <div className="mt-6 pb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Posts</h2>

          {loadingPosts ? (
            <div className="flex items-center justify-center text-muted py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading posts...
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center text-muted py-12 bg-card rounded-xl border border-border">
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
                  className="bg-card rounded-xl p-4 border border-border hover:border-border-hover transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={profile.avatar} alt={profile.name} size="sm" />
                    <div>
                      <p className="text-foreground font-medium">{profile.name}</p>
                      <p className="text-muted text-xs">{formatPostDate(post.createdAt)}</p>
                    </div>
                  </div>

                  <p className="text-foreground/90 mb-3 whitespace-pre-wrap">{post.content}</p>

                  {post.mediaUrl && (
                    <img
                      src={post.mediaUrl}
                      alt="Post media"
                      className="w-full rounded-lg mb-3 max-h-96 object-cover"
                    />
                  )}

                  <div className="flex items-center gap-6 pt-3 border-t border-border text-muted">
                    <button className="flex items-center gap-2 hover:text-pink-500 transition-colors">
                      <Heart size={18} className={post.liked ? 'fill-pink-500 text-pink-500' : ''} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 hover:text-white transition-colors">
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