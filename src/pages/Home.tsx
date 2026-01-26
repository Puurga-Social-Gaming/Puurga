import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { Post, ReactionCount } from '../types';
import PostList from '../components/Post/PostList';
import StatusBar from '../components/StatusBar/StatusBar';
import api from '../api/api';
import { toast } from 'react-hot-toast';
import FloatingCreateButton from '../components/Post/FloatingCreateButton';
import '../styles/neo-home.css';
import RedeemUserButton from '../components/GhostMode/RedeemUserButton';
import { 
  Gamepad2, 
  Ghost, 
  Zap,
  Shield,
  Eye
} from 'lucide-react';

// Safe helpers to coerce unknown values without using 'any'
const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v == null ? fallback : String(v);
const asNumber = (v: unknown, fallback = 0): number =>
  typeof v === 'number' ? v : Number.isFinite(Number(v)) ? Number(v) : fallback;

type BackendUser = Partial<{
  id: string;
  full_name: string;
  name: string;
  username: string;
  avatar_url: string;
  avatar: string;
}>;

function mapBackendPost(post: unknown): Post {
  if (typeof post === 'object' && post !== null) {
    const p = post as Record<string, unknown>;
    const userObj = (p.user as BackendUser) || {};
    return {
      id: p.id as string,
      userId: (p.user_id as string) || (p.userId as string) || '',
      content: (p.content as string) || '',
      createdAt: (p.created_at as string) || '',
      lastEdited: p.last_edited as string | undefined,
      user: p.user ? {
        id: (userObj.id as string) || ((p.user_id as string) || (p.userId as string) || ''),
        name: (userObj.full_name as string) || (userObj.name as string) || '',
        username: (userObj.username as string) || '',
        avatar: (userObj.avatar_url as string) || (userObj.avatar as string) || '',
      } : {
        id: (p.user_id as string) || (p.userId as string) || '',
        name: '',
        username: '',
        avatar: '',
      },
      likes: (p.likes as number) || 0,
      liked: (p.liked as boolean) || false,
      puurgas: (p.puurgas as number) || 0,
      puurged: (p.puurged as boolean) || false,
      purges: (p.purges as number) || (p.purge_count as number) || 0,
      purged: (p.purged as boolean) || false,
      comments: (p.comments as number) || 0,
      Comments: Array.isArray(p.Comments)
        ? (p.Comments as Array<Record<string, unknown>>).map((c) => {
          const cu = (c.user as Record<string, unknown> | undefined) || undefined;
          return {
            id: asString(c.id),
            content: asString((c as Record<string, unknown>).content),
            createdAt: asString((c as Record<string, unknown>).created_at ?? (c as Record<string, unknown>).createdAt),
            updatedAt: asString((c as Record<string, unknown>).updated_at ?? (c as Record<string, unknown>).updatedAt),
            user: {
              id: asString(cu?.id),
              name: asString((cu?.full_name as unknown) ?? cu?.name),
              username: asString(cu?.username),
              avatar: asString((cu?.avatar_url as unknown) ?? cu?.avatar),
            },
          };
        })
        : [],
      visibility: (p.visibility as 'friends' | 'public' | 'private') || 'public',
      // Ensure images array is clean and valid
      images: typeof p.media_url === 'string'
        ? (p.media_url as string)
          .split(',')
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter((s) => !!s)
        : Array.isArray(p.images)
          ? (p.images as string[]).map((s) => (typeof s === 'string' ? s.trim() : '')).filter((s) => !!s)
          : [],
      location:
        typeof p.location === 'object' && p.location !== null
          ? {
            lat: asNumber((p.location as Record<string, unknown>).lat),
            lng: asNumber((p.location as Record<string, unknown>).lng),
            name: asString((p.location as Record<string, unknown>).name),
          }
          : undefined,
      reactions:
        typeof p.reactions === 'object' && p.reactions !== null
          ? Object.entries(p.reactions as Record<string, unknown>).reduce<{
            [key: string]: ReactionCount;
          }>((acc, [key, val]) => {
            const v = (val as Record<string, unknown>) || {};
            const count = asNumber(v.count);
            const users = Array.isArray(v.users)
              ? (v.users as Array<Record<string, unknown>>).map((u) => ({
                id: asString(u.id),
                name: asString(u.full_name ?? u.name),
                username: asString(u.username),
                avatar: asString((u.avatar_url as unknown) ?? u.avatar, ''),
              }))
              : [];
            acc[key] = { count, users };
            return acc;
          }, {})
          : {},
    };
  }
  // fallback
  return {
    id: '',
    userId: '',
    content: '',
    createdAt: '',
    user: { id: '', name: '', username: '', avatar: '' },
    likes: 0,
    puurgas: 0,
    purges: 0,
    comments: 0,
    visibility: 'public',
    reactions: {},
  };
}

export default function Home() {
  const { t } = useTranslation();
  const { user, updateUser } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ghostedFriends, setGhostedFriends] = useState<any[]>([]);
  const [ghostedFriendsLoading, setGhostedFriendsLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [userPoints, setUserPoints] = useState(0);

  // Games data
  const games = [
    {
      id: 'purgaslicer',
      name: 'Judgment',
      description: 'Wield divine precision to cleanse corruption',
      icon: Zap,
      color: 'orange',
      players: '1.2K',
      rating: 4.8,
      available: true
    },
    {
      id: 'redemption',
      name: 'Redemption',
      description: 'Path of Restoration: Make moral choices to redeem your soul.',
      icon: Shield,
      color: 'orange',
      players: '2.4K',
      rating: 4.9,
      available: true
    },
    {
      id: 'watchman',
      name: 'Part of the Watchmen',
      description: 'Navigate the chaos. Use your light to strike down corruption.',
      icon: Eye,
      color: 'blue',
      players: '150',
      rating: 5.0,
      available: true
    }
  ];

  // Game tips that rotate every 30 seconds
  const gameTips = [
    "⚡ Quick reflexes win in Judgment",
    "🛡️ Defense is key in Redemption", 
    "👁️ Watch for patterns in Watchmen",
    "🎯 Aim for the weak spots",
    "⚔️ Timing beats strength",
    "🔥 Stay calm under pressure",
    "💎 Collect power-ups wisely",
    "🌟 Master the special moves"
  ];

  // Fetch user points
  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user) return;
      try {
        const response = await api.get('/api/users/points');
        if (response.data.supported && response.data.points !== null) {
          setUserPoints(response.data.points);
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
      }
    };

    fetchUserPoints();
  }, [user]);

  // Rotate game tips every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % gameTips.length);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleGameSelect = (gameId: string) => {
    if (gameId === 'purgaslicer') {
      window.open('/puurga-games', '_blank');
    } else if (gameId === 'redemption') {
      window.open('/new-game', '_blank');
    } else if (gameId === 'watchman') {
      window.open('/next-game', '_blank');
    }
  };

  // Fetch ghosted friends
  useEffect(() => {
    const fetchGhostedFriends = async () => {
      if (!user) return;
      setGhostedFriendsLoading(true);
      try {
        const response = await api.get('/api/redeem/ghosted-friends');
        setGhostedFriends(response.data || []);
      } catch (error) {
        console.error('Error fetching ghosted friends:', error);
        setGhostedFriends([]);
      } finally {
        setGhostedFriendsLoading(false);
      }
    };

    fetchGhostedFriends();
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchPosts(1);
  }, []);

  // Removed JS-driven fade; using CSS top mask for per-post fade at boundary.
  const fetchPosts = async (pageNum: number) => {
    try {
      setLoading(true);
      const limit = 10;
      const response = await api.get(`/posts/feed?page=${pageNum}&limit=${limit}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);

      const mappedPosts = (Array.isArray(data) ? data : []).map(mapBackendPost);

      if (mappedPosts.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setPosts(prev => pageNum === 1 ? mappedPosts : [...prev, ...mappedPosts]);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      if (pageNum === 1) {
        setError(t('posts.failedToFetch'));
      } else {
        toast.error(t('posts.failedToLoadMore'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore) {
      fetchPosts(page + 1);
    }
  };

  const handlePostCreated = async (newPost: unknown) => {
    const mapped = mapBackendPost(newPost);
    setPosts(prevPosts => [mapped, ...prevPosts]);

    // Update the user's post count in the global context
    if (user && user.stats) {
      updateUser({
        stats: {
          ...user.stats,
          posts: (user.stats.posts || 0) + 1,
        },
      });
    }
  };

  const handlePostUpdate = async (updatedPost: Post) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      )
    );
  };

  return (
    <div className="neo-home relative w-full min-h-screen overflow-x-hidden">
      {/* Background orbs */}
      <div className="neo-orb neo-orb--1" />
      <div className="neo-orb neo-orb--2" />

      {/* Fixed header covering full top area */}
      <div className="neo-sticky">
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-0">
          <StatusBar />
        </div>
      </div>

      {/* Top fade to prevent content showing underneath fixed header */}
      <div className="neo-top-fade" />

      {/* Main content with mobile two-column layout */}
      <div className="pt-24 sm:pt-28" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top, 0))' }}>
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-0 relative">
          {/* Mobile Two-Column Layout with Independent Scrolling */}
          <div className="lg:hidden flex h-[calc(100vh-6rem-env(safe-area-inset-top,0))]">
            {/* Left Column - Posts Feed (Wider) */}
            <div className="flex-1 min-w-0 pr-2 overflow-y-auto scrollbar-hide">
              <div className="neo-feed-mask">
                {loading ? (
                  <div className="py-20 flex justify-center">
                    {/* Empty or minimal loader */}
                  </div>
                ) : error ? (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-center shadow-[0_4px_16px_rgba(156,163,175,0.3),0_2px_8px_rgba(156,163,175,0.2)] dark:shadow-none">
                    {error}
                  </div>
                ) : (
                  <PostList
                    posts={posts}
                    onPostUpdate={handlePostUpdate}
                  />
                )}

                {hasMore && !loading && !error && (
                  <div className="py-6 flex justify-center pb-20">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_4px_12px_rgba(156,163,175,0.25),0_2px_6px_rgba(156,163,175,0.15)] dark:shadow-none"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                          {t('posts.loading')}
                        </>
                      ) : (
                        t('posts.loadMore')
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Separator Line */}
            <div className="w-px bg-border/50" />

            {/* Right Column - Games & Ghosted Friends (Responsive, Completely Sticky) */}
            <div className="flex-shrink-0 pl-2 lg:w-1/3 xl:w-1/4">
              <div className="sticky top-0 h-[calc(100vh-6rem-env(safe-area-inset-top,0))] space-y-4 pb-20 overflow-hidden pt-12">
                {/* PUURGA GAMES Section - Enhanced with Professional Gradients */}
                <div className="relative">
                  {/* Subtle Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-gray-600/15 to-slate-800/20 dark:from-slate-800/30 dark:via-gray-700/25 dark:to-slate-900/30 rounded-xl blur-sm" />
                  <div className="relative space-y-2 p-2 rounded-xl">
                    {/* Creative Games Title with Points */}
                    <div className="text-center mb-3">
                      <h3 className="bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 dark:from-orange-400/90 dark:via-purple-500/90 dark:to-blue-500/90 bg-clip-text text-transparent font-bold text-xs tracking-wider uppercase">
                        ARENA
                      </h3>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs">⭐</span>
                        <span className="text-yellow-700 dark:text-yellow-300 text-xs font-bold">{userPoints}</span>
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs">PTS</span>
                      </div>
                    </div>
                    
                    {games.map((game) => (
                      <div key={game.id} className="space-y-1">
                        <div
                          onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                          className="relative group cursor-pointer transition-all duration-300"
                        >
                          {/* Subtle Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 dark:from-orange-500/30 to-purple-500/30 dark:to-purple-500/30 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Game Card */}
                          <div className="relative bg-gradient-to-br from-background/80 to-background/60 dark:from-background/80 dark:to-background/60 backdrop-blur-sm border border-gray-200/20 dark:border-transparent rounded-lg p-2 group-hover:border-gray-300/30 dark:group-hover:border-transparent transition-all duration-300">
                            <div className={`p-1.5 rounded ${game.color === 'orange' ? 'bg-gradient-to-br from-orange-400/20 to-orange-500/15 dark:from-orange-500/30 dark:to-orange-600/20' : 'bg-gradient-to-br from-blue-400/20 to-blue-500/15 dark:from-blue-500/30 dark:to-blue-600/20'} mb-1`}>
                              <game.icon className={`w-3 h-3 ${game.color === 'orange' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'} drop-shadow-sm`} />
                            </div>
                            <h4 className="font-bold text-gray-800 dark:text-foreground text-xs text-center bg-gradient-to-r from-gray-700 to-gray-900 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                              {game.name}
                            </h4>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className="text-yellow-600 dark:text-yellow-400 text-[8px]">⚡</span>
                              <span className="text-yellow-700 dark:text-yellow-300 text-[8px]">{game.rating}</span>
                            </div>
                          </div>
                        </div>
                        
                        {expandedGame === game.id && (
                          <div className="px-1 pb-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <p className="text-xs text-gray-600 dark:text-muted/80 text-center italic">{game.description}</p>
                            <button 
                              onClick={() => handleGameSelect(game.id)}
                              className="w-full px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs rounded-full font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-orange-500/25"
                            >
                              PLAY NOW
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Game Tips Section - Rotating */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-600/20 via-gray-500/15 to-slate-700/20 dark:from-green-600/20 dark:to-blue-600/20 rounded-xl blur-sm" />
                  <div className="relative p-2 rounded-xl">
                    <div className="text-center mb-2">
                      <h3 className="bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 dark:from-green-400/90 dark:to-blue-500/90 bg-clip-text text-transparent font-bold text-xs tracking-wider uppercase">
                        TIPS
                      </h3>
                    </div>
                    <div className="bg-gradient-to-r from-background/60 to-background/40 dark:from-background/60 dark:to-background/40 backdrop-blur-sm border border-gray-200/10 dark:border-white/10 rounded-lg p-2">
                      <p className="text-xs text-center text-gray-700 dark:text-muted/90 animate-in fade-in duration-1000">
                        {gameTips[currentTipIndex]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* GHOSTED Section - Enhanced */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-600/20 via-gray-500/15 to-slate-700/20 dark:from-red-600/20 dark:to-orange-600/20 rounded-xl blur-sm" />
                  <div className="relative space-y-2 p-2 rounded-xl">
                    <div className="text-center mb-2">
                      <h3 className="bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 dark:from-red-400/90 dark:to-orange-500/90 bg-clip-text text-transparent font-bold text-xs tracking-wider uppercase">
                        GHOSTED
                      </h3>
                    </div>
                    
                    {ghostedFriendsLoading ? (
                      <div className="text-gray-600 dark:text-muted text-xs text-center py-2 animate-pulse">
                        Loading...
                      </div>
                    ) : ghostedFriends.length === 0 ? (
                      <div className="text-gray-600 dark:text-muted text-xs text-center py-2">
                        None
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {ghostedFriends.map((friend) => (
                          <div key={friend.id} className="flex flex-col items-center p-1 hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-lg transition-colors">
                            <div className="relative">
                              <img 
                                src={friend.avatar || '/default-avatar.png'} 
                                alt={friend.name}
                                className="w-4 h-4 rounded-full object-cover ring-1 ring-red-500/30"
                              />
                              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold text-[8px] shadow-lg">
                                {friend.ghostingPercentage || Math.floor(Math.random() * 100)}%
                              </div>
                            </div>
                            <p className="text-xs font-medium text-gray-800 dark:text-foreground mt-1 text-center truncate w-full">{friend.name}</p>
                            <p className="text-xs text-red-600 dark:text-red-400 text-center animate-pulse">{friend.ghostingPercentage || Math.floor(Math.random() * 100)}% ghosted</p>
                            <RedeemUserButton
                              userId={friend.id}
                              userName={friend.name}
                              isGhost={true}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Original Single Column */}
          <div className="hidden lg:block">
            <div className="neo-feed-mask">
              {loading ? (
                <div className="py-20 flex justify-center">
                  {/* Empty or minimal loader */}
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-center shadow-[0_4px_16px_rgba(156,163,175,0.3),0_2px_8px_rgba(156,163,175,0.2)] dark:shadow-none">
                  {error}
                </div>
              ) : (
                <PostList
                  posts={posts}
                  onPostUpdate={handlePostUpdate}
                />
              )}

              {hasMore && !loading && !error && (
                <div className="py-6 flex justify-center pb-20">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_4px_12px_rgba(156,163,175,0.25),0_2px_6px_rgba(156,163,175,0.15)] dark:shadow-none"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        {t('posts.loading')}
                      </>
                    ) : (
                      t('posts.loadMore')
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Create Post Button */}
      <FloatingCreateButton onPostCreated={handlePostCreated} />
    </div>
  );
}