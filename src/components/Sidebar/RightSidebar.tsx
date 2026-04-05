import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { getFriendRequests, getAcceptedFriends, rejectFriendRequest, acceptFriendRequest, getFriendSuggestions, sendFriendRequest } from '../../services/friendService';
import { User, Users, UserPlus, UserX, MessageSquare } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useMessages } from '../../context/MessagesContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import { supabase } from '../../lib/supabaseClient';
import QuickActions from './QuickActions';
import GamingDashboard from './GamingDashboard';
import PurgeDashboard from './PurgeDashboard';

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
  console.log('🔥 RightSidebar component MOUNTING!');
  const { user } = useUser();
  const { t } = useTranslation();
  const { onlineUsers: liveOnlineUsers, loadOnlineUsers } = useMessages(); // Get real-time online users and load function

  console.log('RightSidebar: Current user:', user);
  console.log('RightSidebar: Live online users:', liveOnlineUsers);

  const [stats, setStats] = useState<UserStats>({
    posts: 0,
    following: 0,
    followers: 0
  });
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(true);

  // Store all friends locally, then filter by live status
  const [allFriends, setAllFriends] = useState<OnlineUser[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<OnlineUser[]>([]);
  const [onlineFriendsLoading, setOnlineFriendsLoading] = useState(true);

  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([]);
  const [friendSuggestionsLoading, setFriendSuggestionsLoading] = useState(true);
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());

  // Load online users when component mounts
  useEffect(() => {
    if (user) {
      console.log('RightSidebar: Loading online users...');
      loadOnlineUsers();
    }
  }, [user, loadOnlineUsers]);

  // Effect to update online friends whenever liveOnlineUsers or allFriends changes
  useEffect(() => {
    console.log('RightSidebar: Updating online friends...');
    console.log('RightSidebar: allFriends:', allFriends);
    console.log('RightSidebar: liveOnlineUsers:', liveOnlineUsers);
    
    if (allFriends.length > 0) {
      // Filter friends who are currently online
      const liveFriends = allFriends.map(friend => ({
        ...friend,
        online: liveOnlineUsers.some(online => online.id === friend.id)
      })).filter(friend => friend.online);

      console.log('RightSidebar: Friends who are online:', liveFriends);
      setOnlineFriends(liveFriends);
    } else {
      console.log('RightSidebar: No friends to check for online status');
      setOnlineFriends([]);
    }
  }, [allFriends, liveOnlineUsers]);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      try {
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
      console.log('RightSidebar: Starting to fetch friend requests...');
      setFriendRequestsLoading(true);
      try {
        const data = await getFriendRequests();
        console.log('RightSidebar: Friend requests fetched:', data);
        setFriendRequests(data);
      } catch (error) {
        console.error('RightSidebar: Error fetching friend requests:', error);
        setFriendRequests([]);
      } finally {
        setFriendRequestsLoading(false);
      }
    };
    fetchRequests();

    if (!user) return;

    // Use a unique channel for this user's friend requests
    const channel = supabase.channel(`friend-requests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Friend request update received:', payload);
          fetchRequests();
          // Also fetch suggestions as they might change
          // fetchFriendSuggestions(); 
        }
      )
      .subscribe((status) => {
        console.log(`Friend requests subscription status for ${user.id}:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const fetchFriends = async () => {
      console.log('RightSidebar: Starting to fetch accepted friends...');
      setOnlineFriendsLoading(true);
      try {
        const data = await getAcceptedFriends();
        console.log('RightSidebar: Accepted friends fetched:', data);
        setAllFriends(data || []);
      } catch (error) {
        console.error('RightSidebar: Error fetching friends:', error);
        setAllFriends([]);
      } finally {
        setOnlineFriendsLoading(false);
      }
    };
    fetchFriends();

    const fetchFriendSuggestions = async () => {
      if (!user) return;
      console.log('RightSidebar: Starting to fetch friend suggestions...');
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
        console.log('RightSidebar: Friend suggestions fetched:', suggestions);
        // Filter out current user (safety check) and set initial status based on pending requests
        const suggestionsWithStatus = suggestions
          .filter((s: any) => s.id !== user.id) // Exclude current user
          .map((s: any) => ({
            ...s,
            status: pendingIds.has(s.id) ? 'pending' : 'none',
          }));
        setFriendSuggestions(suggestionsWithStatus);

      } catch (error) {
        console.error('RightSidebar: Error fetching friend suggestions:', error);
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
      className="flex flex-col overflow-hidden"
    >
      {/* Quick Actions Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-bold text-foreground">{t('rightSidebar.quickActions')}</h2>
          <QuickActions />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Link to="/home" className="px-3 py-2.5 rounded-lg bg-accent/10 text-foreground hover:bg-accent/20 transition-all text-xs font-medium text-center truncate">
            {t('rightSidebar.createPost')}
          </Link>
          <Link to="/groups" className="px-3 py-2.5 rounded-lg hover:bg-card-hover text-foreground/90 transition-all text-xs font-medium text-center truncate">
            {t('rightSidebar.exploreGroups')}
          </Link>
          <Link to="/notifications" className="px-3 py-2.5 rounded-lg hover:bg-card-hover text-foreground/90 transition-all text-xs font-medium text-center truncate">
            {t('rightSidebar.notifications')}
          </Link>
          <Link to="/settings" className="px-3 py-2.5 rounded-lg hover:bg-card-hover text-foreground/90 transition-all text-xs font-medium text-center truncate">
            {t('rightSidebar.settings')}
          </Link>
        </div>
      </div>

      {/* User Profile Summary */}
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground mb-3 px-1">{t('rightSidebar.myProfile')}</h2>
        <Link
          to="/profile"
          className="flex items-center space-x-3 hover:bg-card-hover p-2 rounded-lg transition-colors group"
        >
          <img
            src={user.avatar || DEFAULT_IMAGES.avatar}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            onError={(e) => { e.currentTarget.src = DEFAULT_IMAGES.avatar; }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">{user.name}</p>
            <p className="text-muted text-xs truncate">@{user.username}</p>
          </div>
        </Link>

        {/* Stats Section */}
        {loading ? (
          <div className="flex justify-between text-sm text-muted animate-pulse mt-4">
            <div className="h-4 w-16 bg-card-hover rounded"></div>
            <div className="h-4 w-16 bg-card-hover rounded"></div>
            <div className="h-4 w-16 bg-card-hover rounded"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-xs mt-3">
            <div className="text-center p-2 bg-card-hover rounded-lg">
              <p className="text-muted text-[10px] uppercase tracking-wide">{t('rightSidebar.stats.posts')}</p>
              <p className="text-foreground font-bold">{stats.posts}</p>
            </div>
            <div className="text-center p-2 bg-card-hover rounded-lg">
              <p className="text-muted text-[10px] uppercase tracking-wide">{t('rightSidebar.stats.following')}</p>
              <p className="text-foreground font-bold">{stats.following}</p>
            </div>
            <div className="text-center p-2 bg-card-hover rounded-lg">
              <p className="text-muted text-[10px] uppercase tracking-wide">{t('rightSidebar.stats.followers')}</p>
              <p className="text-foreground font-bold">{stats.followers}</p>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-1">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-card-hover rounded-lg transition-colors text-sm"
          >
            <User size={16} />
            <span>{t('rightSidebar.viewFullProfile')}</span>
          </Link>
          <Link
            to="/connections"
            className="flex items-center gap-2 px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-card-hover rounded-lg transition-colors text-sm"
          >
            <Users size={16} />
            <span>{t('rightSidebar.myConnections')}</span>
          </Link>
        </div>
      </div>

      {/* Gaming Dashboard */}
      <GamingDashboard />

      {/* Purge Dashboard */}
      <PurgeDashboard />

      {/* Friend Requests */}
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground mb-3 px-1">{t('rightSidebar.friendRequests')}</h2>
        {friendRequestsLoading ? (
          <div className="flex justify-center p-4">
            <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friendRequests.length === 0 ? (
          <div className="text-muted text-sm text-center py-2">{t('rightSidebar.noFriendRequests')}</div>
        ) : (
          <div className="space-y-2">
            {friendRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between gap-2 hover:bg-card-hover p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img src={request.sender_avatar || DEFAULT_IMAGES.avatar} alt={request.sender_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { e.currentTarget.src = DEFAULT_IMAGES.avatar; }} />
                  <Link to={`/profile/${request.sender_username}`} className="text-foreground text-sm font-medium hover:text-accent truncate block">
                    {request.sender_name}
                  </Link>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        await acceptFriendRequest(request.id);
                        toast.success('Accepted');
                        setFriendRequests(prev => prev.filter(r => r.id !== request.id));
                      } catch (error) {
                        toast.error('Failed');
                      }
                    }}
                    className="bg-accent/10 text-accent rounded-full p-1.5 hover:bg-accent hover:text-[#111] transition-colors"
                    title={t('rightSidebar.accept')}
                  >
                    <UserPlus size={14} />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await rejectFriendRequest(request.id);
                        toast.success('Rejected');
                        setFriendRequests(prev => prev.filter(r => r.id !== request.id));
                      } catch (error) {
                        toast.error('Failed');
                      }
                    }}
                    className="bg-red-500/10 text-red-500 rounded-full p-1.5 hover:bg-red-500 hover:text-white transition-colors"
                    title={t('rightSidebar.reject')}
                  >
                    <UserX size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online Friends */}
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground mb-3 px-1">{t('rightSidebar.onlineFriends')}</h2>
        <div className="space-y-1">
          {onlineFriendsLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-8 h-8 bg-card-hover rounded-full"></div>
                  <div className="h-3 w-20 bg-card-hover rounded"></div>
                </div>
              ))}
            </div>
          ) : onlineFriends.length > 0 ? (
            onlineFriends.map(onlineUser => (
              <div key={onlineUser.id} className="flex items-center justify-between gap-2 group hover:bg-card-hover p-2 rounded-lg transition-colors -mx-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img src={onlineUser.avatar || DEFAULT_IMAGES.avatar} alt={onlineUser.username} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_IMAGES.avatar; }} />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" title="Online" />
                  </div>
                  <Link to={`/profile/${onlineUser.username}`} className="text-foreground text-sm font-medium hover:text-accent truncate block">
                    {onlineUser.name || onlineUser.username}
                  </Link>
                </div>
                <Link to={`/messages/${onlineUser.id}`} className="text-muted hover:text-accent p-1.5 rounded-full hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100">
                  <MessageSquare size={16} />
                </Link>
              </div>
            ))
          ) : (
            <p className="text-muted text-xs text-center py-2">{t('rightSidebar.noFriendsOnline')}</p>
          )}
        </div>
      </div>

      {/* Friend Suggestions */}
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground mb-3 px-1">{t('rightSidebar.peopleYouMayKnow')}</h2>
        {friendSuggestionsLoading ? (
          <div className="flex justify-center p-4">
            <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friendSuggestions.length > 0 ? (
          <div className="space-y-2">
            {friendSuggestions.map(suggestion => (
              <div key={suggestion.id} className="flex items-center justify-between gap-2 hover:bg-card-hover p-2 rounded-lg transition-colors">
                <Link to={`/profile/${suggestion.username}`} className="flex items-center gap-2 group min-w-0 flex-1">
                  <img src={suggestion.avatar || DEFAULT_IMAGES.avatar} alt={suggestion.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { e.currentTarget.src = DEFAULT_IMAGES.avatar; }} />
                  <div className="min-w-0">
                    <span className="text-foreground text-sm font-medium group-hover:text-accent truncate block">{suggestion.name}</span>
                    <span className="text-muted text-xs truncate block">@{suggestion.username}</span>
                  </div>
                </Link>
                <div className="flex-shrink-0">
                  {pendingRequestIds.has(suggestion.id) || suggestion.status === 'pending' ? (
                    <span className="text-xs text-yellow-500 font-medium px-2">Pending</span>
                  ) : (
                    <button
                      onClick={async () => {
                        setPendingRequestIds(prev => new Set(prev).add(suggestion.id));
                        try {
                          await sendFriendRequest(suggestion.id);
                          toast.success('Sent');
                        } catch (error: any) {
                          setPendingRequestIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(suggestion.id);
                            return newSet;
                          });
                          toast.error('Failed');
                        }
                      }}
                      className="bg-accent/10 text-accent rounded-full p-1.5 hover:bg-accent hover:text-[#111] transition-colors"
                      title="Add Friend"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-xs text-center py-2">{t('rightSidebar.noSuggestions')}</p>
        )}
      </div>

    </motion.div>
  );
};

export default RightSidebar;