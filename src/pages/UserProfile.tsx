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
  Ghost,
  Ban,
  VolumeX,
  Volume2,
} from 'lucide-react';
import api from '../lib/axios';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import FriendRequestButton from '../components/FriendRequestButton/FriendRequestButton';
import { DEFAULT_IMAGES } from '../constants/defaultImages';
import { useUser } from '../context/UserContext';
import { formatBioForDisplay } from '../utils/bioLimits';
import PurgeIcon from '../components/Icons/PurgeIcon';
import CertificationBadges from '../components/Profile/CertificationBadges';

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
  certificationSlug?: string | null;
  logoCertified?: boolean;
}

interface UserPost {
  id: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  likes: number;
  comments: number;
  liked: boolean;
  purges: number;
  purged: boolean;
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [purgingPostId, setPurgingPostId] = useState<string | null>(null);

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
        certificationSlug: data.certification_slug || data.certificationSlug || null,
        logoCertified: Boolean(data.logo_certified ?? data.logoCertified),
      });

      if (data.id && currentUser?.username !== username) {
        try {
          const statusRes = await api.get(`/social/status/${data.id}`);
          setIsBlocked(Boolean(statusRes.data?.isBlocked));
          setBlockedByThem(Boolean(statusRes.data?.blockedByThem));
          setIsMuted(Boolean(statusRes.data?.isMuted));
        } catch {
          setIsBlocked(false);
          setBlockedByThem(false);
          setIsMuted(false);
        }
      }
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
        purges: p.purges || p.purge_count || 0,
        purged: Boolean(p.purged),
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

  const handlePurgePost = async (postId: string) => {
    if (!profile || profile.isOwnProfile) {
      toast.error('You cannot purge your own posts');
      return;
    }
    const target = userPosts.find((p) => p.id === postId);
    if (!target || target.purged || purgingPostId) return;

    setPurgingPostId(postId);
    try {
      const response = await api.post(`/posts/${postId}/purge`);
      const newPurgeCount = response.data?.purges ?? target.purges + 1;
      setUserPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, purges: newPurgeCount, purged: true } : p
        )
      );
      toast.success('Post purged');
      if (newPurgeCount >= 5) {
        toast.error(`Post has been purged ${newPurgeCount} times.`, { duration: 4000 });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to purge post';
      if (String(msg).toLowerCase().includes('already purged')) {
        setUserPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, purged: true } : p))
        );
        toast.error('Already purged this post');
      } else if (String(msg).toLowerCase().includes('own')) {
        toast.error('You cannot purge your own posts');
      } else {
        toast.error(msg);
      }
    } finally {
      setPurgingPostId(null);
    }
  };

  const handleMessage = () => {
    if (profile) {
      navigate(`/messages?user=${profile.username}`);
    }
  };

  const handleBlockToggle = async () => {
    if (!profile) return;
    setSocialBusy(true);
    try {
      if (isBlocked) {
        await api.delete(`/social/block/${profile.id}`);
        setIsBlocked(false);
        setBlockedByThem(false);
        toast.success('User unblocked');
      } else {
        if (!window.confirm(`Block @${profile.username}? They won't be able to message you or interact with your content.`)) {
          setSocialBusy(false);
          return;
        }
        await api.post(`/social/block/${profile.id}`);
        setIsBlocked(true);
        setIsMuted(false);
        setProfile((p) => (p ? { ...p, isFriend: false, hasPendingRequest: false } : p));
        toast.success('User blocked');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update block');
    } finally {
      setSocialBusy(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!profile || isBlocked) return;
    setSocialBusy(true);
    try {
      if (isMuted) {
        await api.delete(`/social/mute/${profile.id}`);
        setIsMuted(false);
        toast.success('User unmuted');
      } else {
        await api.post(`/social/mute/${profile.id}`);
        setIsMuted(true);
        toast.success('User muted — their posts will be hidden');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update mute');
    } finally {
      setSocialBusy(false);
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
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')}
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
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Profile Info */}
      <div className="w-full -mt-16 relative z-10">
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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{profile.name}</h1>
                <CertificationBadges
                  certificationSlug={profile.certificationSlug}
                  logoCertified={profile.logoCertified}
                  size="md"
                />
              </div>
              <p className="text-muted">@{profile.username}</p>
            </div>

            {/* Action Buttons - Only show for other users */}
            {!profile.isOwnProfile && (
              <div className="flex flex-wrap items-center gap-3">
                {blockedByThem && !isBlocked ? (
                  <p className="text-sm text-muted px-3 py-2 rounded-lg border border-border bg-card">
                    You cannot interact with this account.
                  </p>
                ) : null}
                {!blockedByThem && (
                <button
                  onClick={handlePurgeUser}
                  disabled={isPurging || isBlocked}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                  title="Purge User"
                >
                  <PurgeIcon size={18} className={isPurging ? 'animate-pulse' : ''} />
                  {isPurging ? 'Purging…' : 'Purge'}
                </button>
                )}
                {isBlocked ? (
                  <button
                    onClick={handleBlockToggle}
                    disabled={socialBusy}
                    className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-green-500/10 text-muted hover:text-green-500 border border-border rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Ban size={18} />
                    Unblock
                  </button>
                ) : blockedByThem ? null : (
                  <>
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
                    <button
                      onClick={handleMuteToggle}
                      disabled={socialBusy}
                      className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted/40 text-muted border border-border rounded-lg transition-colors disabled:opacity-50"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                      onClick={handleBlockToggle}
                      disabled={socialBusy}
                      className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-red-500/10 text-muted hover:text-red-500 border border-border rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Ban size={18} />
                      Block
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {(isBlocked || blockedByThem) && (
          <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
            {isBlocked
              ? 'You blocked this user. Unblock to interact again.'
              : 'This profile is limited because of a block.'}
          </div>
        )}

        {/* Bio and Details — hide detailed content when blocked either way */}
        {!isBlocked && !blockedByThem && (
        <div className="mt-6 space-y-4">
          {profile.bio && (
            <p className="text-foreground/90 text-base sm:text-lg leading-relaxed break-words max-w-2xl">
              {formatBioForDisplay(profile.bio)}
            </p>
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

          {/* Stats */}
          <div className="pt-5 mt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {[
                {
                  key: 'friends',
                  value: profile.friendsCount,
                  label: 'Friends',
                  icon: Users,
                  tone: 'text-sky-400',
                  ring: 'hover:border-sky-500/35',
                },
                {
                  key: 'posts',
                  value: profile.postsCount,
                  label: 'Posts',
                  icon: MessageSquare,
                  tone: 'text-violet-400',
                  ring: 'hover:border-violet-500/35',
                },
                {
                  key: 'credits',
                  value: profile.credits,
                  label: 'Credits',
                  icon: Zap,
                  tone: 'text-accent',
                  ring: 'hover:border-accent/40',
                  accent: true,
                },
                {
                  key: 'streak',
                  value: profile.purgeStreak,
                  label: 'Streak',
                  icon: Flame,
                  tone: 'text-orange-400',
                  ring: 'hover:border-orange-500/35',
                },
              ].map(({ key, value, label, icon: Icon, tone, ring, accent }) => (
                <div
                  key={key}
                  className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm px-3 py-3.5 sm:px-4 sm:py-4 transition-all duration-200 ${ring}`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/[0.03] to-transparent" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`text-xl sm:text-2xl font-bold tabular-nums leading-none tracking-tight truncate ${
                          accent ? 'text-accent' : 'text-foreground'
                        }`}
                      >
                        {Number(value || 0).toLocaleString()}
                      </p>
                      <p className="mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {label}
                      </p>
                    </div>
                    <div
                      className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-background/70 border border-border/60 ${tone}`}
                    >
                      <Icon size={16} strokeWidth={2.25} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* User Posts */}
        {!isBlocked && !blockedByThem && (
        <div className="mt-8 pb-8">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Posts</h2>
              <p className="text-xs text-muted mt-0.5">
                {profile.postsCount > 0
                  ? `${Number(profile.postsCount).toLocaleString()} published`
                  : 'Nothing published yet'}
              </p>
            </div>
          </div>

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

                  <div className="flex items-center gap-3 sm:gap-6 pt-3 border-t border-border text-muted">
                    <button
                      type="button"
                      className="flex items-center gap-2 hover:text-pink-500 transition-colors"
                    >
                      <Heart size={18} className={post.liked ? 'fill-pink-500 text-pink-500' : ''} />
                      <span>{post.likes}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                      <MessageCircle size={18} />
                      <span>{post.comments}</span>
                    </button>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                        title="Share"
                      >
                        <Share2 size={18} />
                      </button>

                      {!profile.isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => void handlePurgePost(post.id)}
                          disabled={Boolean(purgingPostId) || post.purged || isBlocked}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${
                            post.purged
                              ? 'text-accent bg-accent/10'
                              : 'text-muted hover:text-red-400 hover:bg-red-400/10'
                          } ${purgingPostId === post.id ? 'opacity-50 cursor-not-allowed' : ''} disabled:opacity-50`}
                          title={post.purged ? 'Already purged' : "I don't like this — Purge"}
                        >
                          <PurgeIcon
                            size={16}
                            className={`${purgingPostId === post.id ? 'animate-pulse' : ''} ${
                              post.purged ? '' : 'grayscale'
                            }`}
                          />
                          <span className="text-xs font-medium tabular-nums">{post.purges}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserProfile;