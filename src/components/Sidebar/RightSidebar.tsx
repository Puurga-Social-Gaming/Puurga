import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { getFriendRequests, getAcceptedFriends, rejectFriendRequest, acceptFriendRequest, getFriendSuggestions, sendFriendRequest } from '../../services/friendService';
import { User, Users, UserPlus, UserX, MessageSquare } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import { supabase } from '../../lib/supabaseClient';
import QuickActions from './QuickActions';

interface UserStats {
  posts: number;
  following: number;
  followers: number;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_username?: string;
  sender_avatar: string;
}

interface OnlineUser {
  id: string;
  username: string;
  avatar: string;
  name?: string;
  online?: boolean;
}

const RightSidebar: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const [stats, setStats] = useState<UserStats>({
    posts: 0,
    following: 0,
    followers: 0
  });
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(true);
  const [onlineFriends, setOnlineFriends] = useState<OnlineUser[]>([]);
  const [onlineFriendsLoading, setOnlineFriendsLoading] = useState(true);
  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([]);
  const [friendSuggestionsLoading, setFriendSuggestionsLoading] = useState(true);
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      try {
        // axios baseURL is '/api', so we call without extra '/api'
        const response = await api.get(`/users/${user.id}/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserStats();
  }, [user]);

  useEffect(() => {
    const fetchRequests = async () => {
      setFriendRequestsLoading(true);
      try {
        const data = await getFriendRequests();
        setFriendRequests(data);
      } catch (error) {
        setFriendRequests([]);
        console.error('Error fetching friend requests:', error);
      } finally {
        setFriendRequestsLoading(false);
      }
    };
    fetchRequests();

    // Live updates: subscribe to friend_requests changes for this user
    if (!user) return;
    const channel = supabase.channel('friend-requests-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const fetchOnlineFriends = async () => {
      setOnlineFriendsLoading(true);
      try {
        const data = await getAcceptedFriends();
        setOnlineFriends(data);
      } catch (error) {
        setOnlineFriends([]);
        console.error('Error fetching online friends:', error);
      } finally {
        setOnlineFriendsLoading(false);
      }
    };
    fetchOnlineFriends();

    const fetchFriendSuggestions = async () => {
      if (!user) return;
      setFriendSuggestionsLoading(true);
      try {
        // Fetch pending sent requests first
        const { data: sentRequests, error: sentRequestsError } = await supabase
          .from('friend_requests')
          .select('receiver_id')
          .eq('sender_id', user.id)
          .eq('status', 'pending');

        const pendingIds = sentRequestsError
          ? new Set<string>()
          : new Set(sentRequests.map((req: any) => req.receiver_id));

        if (sentRequestsError) {
          console.error('Error fetching sent friend requests:', sentRequestsError);
        }

        setPendingRequestIds(pendingIds);

        const suggestions = await getFriendSuggestions();
        // Set initial status based on pending requests
        const suggestionsWithStatus = suggestions.map((s: any) => ({
          ...s,
          status: pendingIds.has(s.id) ? 'pending' : 'none',
        }));
        setFriendSuggestions(suggestionsWithStatus);

      } catch (error) {
        console.error('Error fetching friend suggestions:', error);
      } finally {
        setFriendSuggestionsLoading(false);
      }
    };

    fetchFriendSuggestions();
  }, [user]);




  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Quick Actions Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <h2 className="text-xl font-bold text-foreground">{t('rightSidebar.quickActions')}</h2>
        <QuickActions />
      </div>

      {/* Quick Action Buttons */}
      <div className="px-6 -mt-2">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/home" className="px-3 py-2 rounded-lg bg-accent/10 text-foreground hover:opacity-90 transition-all shadow-theme-sm hover:shadow-theme-md text-sm text-center">
            {t('rightSidebar.createPost')}
          </Link>
          <Link to="/groups" className="px-3 py-2 rounded-lg bg-background-secondary text-foreground/90 hover:opacity-90 transition-all shadow-theme-sm hover:shadow-theme-md text-sm text-center">
            {t('rightSidebar.exploreGroups')}
          </Link>
          <Link to="/notifications" className="px-3 py-2 rounded-lg bg-background-secondary text-foreground/90 hover:opacity-90 transition-all shadow-theme-sm hover:shadow-theme-md text-sm text-center">
            {t('rightSidebar.notifications')}
          </Link>
          <Link to="/settings" className="px-3 py-2 rounded-lg bg-background-secondary text-foreground/90 hover:opacity-90 transition-all shadow-theme-sm hover:shadow-theme-md text-sm text-center">
            {t('rightSidebar.settings')}
          </Link>
        </div>
      </div>
      {/* User Profile Summary */}
      <div className="card-gradient p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('rightSidebar.myProfile')}</h2>
        <Link
          to="/profile"
          className="flex items-center space-x-3 hover:bg-background-secondary p-2 rounded-lg transition-colors"
        >
          <img
            src={user.avatar || DEFAULT_IMAGES.avatar}
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="text-muted text-sm">@{user.username}</p>
          </div>
        </Link>

        {loading ? (
          <div className="flex justify-between text-sm text-muted animate-pulse mt-4">
            <div className="h-4 w-16 bg-background-secondary rounded"></div>
            <div className="h-4 w-16 bg-background-secondary rounded"></div>
            <div className="h-4 w-16 bg-background-secondary rounded"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-sm mt-4">
            <div className="text-center p-2 bg-background-secondary rounded-lg">
              <p className="text-muted">{t('rightSidebar.stats.posts')}</p>
              <p className="text-foreground font-semibold">{stats.posts}</p>
            </div>
            <div className="text-center p-2 bg-background-secondary rounded-lg">
              <p className="text-muted">{t('rightSidebar.stats.following')}</p>
              <p className="text-foreground font-semibold">{stats.following}</p>
            </div>
            <div className="text-center p-2 bg-background-secondary rounded-lg">
              <p className="text-muted">{t('rightSidebar.stats.followers')}</p>
              <p className="text-foreground font-semibold">{stats.followers}</p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
          >
            <User size={18} />
            <span>{t('rightSidebar.viewFullProfile')}</span>
          </Link>
          <Link
            to="/connections"
            className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
          >
            <Users size={18} />
            <span>{t('rightSidebar.myConnections')}</span>
          </Link>
        </div>
      </div>

      {/* Friend Requests */}
      <div className="card-gradient p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('rightSidebar.friendRequests')}</h2>
        {friendRequestsLoading ? (
          <div className="text-muted">{t('rightSidebar.loadingText')}</div>
        ) : friendRequests.length === 0 ? (
          <div className="text-muted text-sm">{t('rightSidebar.noFriendRequests')}</div>
        ) : (
          <div className="space-y-3">
            {friendRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={request.sender_avatar || DEFAULT_IMAGES.avatar} alt={request.sender_name} className="w-10 h-10 rounded-full object-cover" />
                  <Link to={`/profile/${request.sender_id}`} className="text-foreground font-medium hover:underline">
                    {request.sender_name}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        await acceptFriendRequest(request.id);
                        toast.success('Friend request accepted');
                        setFriendRequests(prev => prev.filter(r => r.id !== request.id));
                      } catch (error) {
                        console.error('Error accepting friend request:', error);
                        toast.error('Failed to accept friend request');
                      }
                    }}
                    className="bg-[var(--accent)] text-white rounded-full p-2 hover:opacity-90 transition-colors"
                    title={t('rightSidebar.accept')}
                  >
                    <UserPlus size={18} />
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await rejectFriendRequest(request.id);
                        toast.success('Friend request rejected');
                        setFriendRequests(prev => prev.filter(r => r.id !== request.id));
                      } catch (error) {
                        console.error('Error rejecting friend request:', error);
                        toast.error('Failed to reject friend request');
                      }
                    }}
                    className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    title={t('rightSidebar.reject')}
                  >
                    <UserX size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online Friends */}
      <div className="card-gradient p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('rightSidebar.onlineFriends')}</h2>
        <div className="space-y-3">
          {onlineFriendsLoading ? (
            <div className="text-muted">{t('rightSidebar.loadingText')}</div>
          ) : onlineFriends.length > 0 ? (
            onlineFriends.map(onlineUser => (
              <div key={onlineUser.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={onlineUser.avatar || DEFAULT_IMAGES.avatar} alt={onlineUser.username} className="w-10 h-10 rounded-full object-cover" />
                    {onlineUser.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" title="Online" />}
                  </div>
                  <Link to={`/profile/${onlineUser.username}`} className="text-foreground font-medium hover:underline">
                    {onlineUser.name || onlineUser.username}
                  </Link>
                </div>
                <Link to={`/messages/${onlineUser.id}`} className="bg-background-secondary text-accent rounded-full p-2 hover:bg-accent/10 transition-colors">
                  <MessageSquare size={18} />
                </Link>
              </div>
            ))
          ) : (
            <p className="text-muted text-sm">{t('rightSidebar.noFriendsOnline')}</p>
          )}
        </div>
      </div>

      {/* Friend Suggestions */}
      <div className="card-gradient p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('rightSidebar.peopleYouMayKnow')}</h2>
        {friendSuggestionsLoading ? (
          <div className="text-muted">{t('rightSidebar.loadingText')}</div>
        ) : friendSuggestions.length > 0 ? (
          <div className="space-y-3">
            {friendSuggestions.map(suggestion => (
              <div key={suggestion.id} className="flex items-center justify-between gap-3">
                <Link to={`/profile/${suggestion.username}`} className="flex items-center gap-3 group">
                  <img src={suggestion.avatar || DEFAULT_IMAGES.avatar} alt={suggestion.name} className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-foreground font-medium group-hover:underline">{suggestion.name}</span>
                </Link>
                {pendingRequestIds.has(suggestion.id) || suggestion.status === 'pending' ? (
                  <div className="px-3 py-1.5 text-xs text-yellow-400 font-semibold">
                    Pending
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setPendingRequestIds(prev => new Set(prev).add(suggestion.id));
                      try {
                        await sendFriendRequest(suggestion.id);
                        toast.success(`Friend request sent to ${suggestion.name}`);
                      } catch (error: any) {
                        console.error('Error sending friend request:', error);
                        setPendingRequestIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(suggestion.id);
                          return newSet;
                        });
                        if (error.response && error.response.data && error.response.data.message) {
                          toast.error(error.response.data.message);
                        } else {
                          toast.error('Failed to send friend request');
                        }
                      }
                    }}
                    className="bg-accent text-white rounded-full p-2 hover:opacity-90 transition-colors"
                    title={`Send friend request to ${suggestion.name}`}
                  >
                    <UserPlus size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">{t('rightSidebar.noSuggestions')}</p>
        )}
      </div>

    </motion.div>
  );
};

export default RightSidebar;