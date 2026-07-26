import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Post, ReactionCount } from '../types';
import PostList from '../components/Post/PostList';
import StatusBar from '../components/StatusBar/StatusBar';
import NewGamePromoBanner from '../components/Games/NewGamePromoBanner';
import api from '../api/api';
import { supabase } from '../lib/supabaseClient';
import FloatingCreateButton from '../components/Post/FloatingCreateButton';
import PullToRefresh from '../components/PullToRefresh/PullToRefresh';
import Spinner from '../components/Spinner';
import { useWebSocket } from '../hooks/useWebSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import RedeemUserButton from '../components/GhostMode/RedeemUserButton';
import { DEFAULT_IMAGES } from '../constants/defaultImages';
import ProfileLink from '../components/Profile/ProfileLink';


import { parseMediaUrls } from '../utils/mediaUrls';

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
        certificationSlug:
          ((userObj as any).certificationSlug as string) ||
          ((userObj as any).certification_slug as string) ||
          null,
        logoCertified: Boolean(
          (userObj as any).logoCertified ?? (userObj as any).logo_certified
        ),
      } : {
        id: (p.user_id as string) || (p.userId as string) || '',
        name: '',
        username: '',
        avatar: '',
        certificationSlug: null,
        logoCertified: false,
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
      background_index: (p.background_index as number) || 0,
      // Ensure images array is clean and valid
      images: Array.isArray(p.images) && (p.images as unknown[]).length > 0
        ? (p.images as string[]).map((s) => (typeof s === 'string' ? s.trim() : '')).filter((s) => !!s)
        : parseMediaUrls(
            typeof p.media_url === 'string'
              ? (p.media_url as string)
              : Array.isArray(p.media_url)
                ? (p.media_url as string[])
                : null
          ),
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
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ghostedFriends, setGhostedFriends] = useState<any[]>([]);
  const [ghostedFriendsLoading, setGhostedFriendsLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const feedFetchGen = useRef(0);
  const feedRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Games data
  const games = [
    {
      id: 'judgment',
      name: 'Judgment',
      description: 'Wield divine precision to cleanse corruption',
      image: '/images/games/judgment.jpg',
      color: 'orange',
      players: '1.2K',
      rating: 4.8,
      available: true,
      link: '/puurga-games'
    },
    {
      id: 'redemption',
      name: 'Redemption',
      description: 'Path of Restoration: Make moral choices to redeem your soul.',
      image: '/images/games/redemption.jpg',
      color: 'orange',
      players: '2.4K',
      rating: 4.9,
      available: true,
      link: '/new-game'
    },
    {
      id: 'watchman',
      name: 'The Watchman',
      description: 'Navigate the chaos. Use your light to strike down corruption.',
      image: '/images/games/watchman.jpg',
      color: 'blue',
      players: '150',
      rating: 5.0,
      available: true,
      link: '/next-game'
    },
    {
      id: 'purga-rift',
      name: 'Purga Rift',
      description: 'Decode dimension patterns and survive the rift storms.',
      image: '/images/games/purga-rift-cover.svg',
      color: 'purple',
      players: '480',
      rating: 4.9,
      available: true,
      link: '/puurga-games?play=purga-rift'
    },
    {
      id: 'puurga-slot-2',
      name: 'Cyber Runner',
      description: 'Run, slash, and survive through five network phases.',
      image: '/images/games/cyber-runner-cover.svg',
      color: 'orange',
      players: '1.2K',
      rating: 4.8,
      available: true,
      link: '/puurga-games?play=puurga-slot-2'
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
      if (!user?.id) return;
      try {
        const response = await api.get('/users/points');
        if (response.data.supported && response.data.points !== null) {
          setUserPoints(response.data.points);
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
      }
    };

    fetchUserPoints();
  }, [user?.id]);

  // Rotate game tips every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % gameTips.length);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleGameSelect = (gameId: string) => {
    const match = games.find((g) => g.id === gameId);
    navigate(match?.link ?? '/puurga-games');
  };

  const fetchGhostedFriends = async () => {
    if (!user) return;
    setGhostedFriendsLoading(true);
    try {
      const response = await api.get('/redeem/ghosted-friends');
      setGhostedFriends(response.data || []);
    } catch {
      setGhostedFriends([]);
    } finally {
      setGhostedFriendsLoading(false);
    }
  };

  // Fetch ghosted friends
  useEffect(() => {
    fetchGhostedFriends();
  }, [user?.id]);

  // Refresh user stats from API
  const refreshUserStats = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/users/profile');
      if (data.stats) {
        updateUser({
          stats: {
            followers: data.stats.followers || 0,
            following: data.stats.following || 0,
            posts: data.stats.posts || 0,
            puurgas: data.stats.puurgas || 0,
            purges: data.stats.purges || 0,
            credits: data.stats.credits || user.credits
          }
        });
      }
    } catch (error) {
      console.error('Error refreshing user stats:', error);
    }
  };

  // Real-time updates
  useWebSocket({
    onCreditUpdate: (payload) => {
      if (user && payload.userId === user.id) {
        setUserPoints(payload.credits);
        refreshUserStats();
      }
    },
    onProfileUpdate: (payload) => {
      // Refresh list if ANY friend was updated
      fetchGhostedFriends();
      // If the current user was redeemed/ghosted, they might need to know too
      if (user && payload.userId === user.id) {
        refreshUserStats();
      }
    }
  });

  const fetchPosts = async (pageNum: number, attempt = 0) => {
    const gen = ++feedFetchGen.current;
    const limit = 10;
    const maxAttempts = 6;

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadMoreError(false);
    }

    try {
      const response = await api.get(`/posts/feed?page=${pageNum}&limit=${limit}`);
      if (gen !== feedFetchGen.current) return;

      const data = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
      const mappedPosts = (Array.isArray(data) ? data : []).map(mapBackendPost);

      setHasMore(mappedPosts.length >= limit);

      setPosts((prev) => {
        if (pageNum === 1) return mappedPosts;
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueNewPosts = mappedPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...uniqueNewPosts];
      });

      setPage(pageNum);
      setLoadMoreError(false);
      setLoading(false);
      setIsLoadingMore(false);
    } catch {
      if (gen !== feedFetchGen.current) return;

      if (pageNum === 1) {
        // Never show "Failed to fetch posts" — keep spinner and retry quietly
        setLoading(true);
        if (attempt < maxAttempts - 1) {
          const delay = Math.min(800 * Math.pow(2, attempt), 8000);
          feedRetryTimer.current = setTimeout(() => {
            void fetchPosts(1, attempt + 1);
          }, delay);
          return;
        }
        // Keep trying in background without surfacing an error banner
        feedRetryTimer.current = setTimeout(() => {
          void fetchPosts(1, 0);
        }, 10000);
        return;
      }

      setLoadMoreError(true);
      setIsLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchPosts(1);
    return () => {
      feedFetchGen.current += 1;
      if (feedRetryTimer.current) {
        clearTimeout(feedRetryTimer.current);
        feedRetryTimer.current = null;
      }
    };
  }, []);

  // Subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async () => {
          void fetchPosts(1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !loadMoreError) {
      setIsLoadingMore(true);
      fetchPosts(page + 1);
    }
  };

  const handleRetryLoadMore = () => {
    setLoadMoreError(false);
    setIsLoadingMore(true);
    fetchPosts(page + 1);
  };

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading && !loadMoreError) {
          handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, isLoadingMore, loading, page, loadMoreError]);

  const handlePostCreated = async (newPost: unknown) => {
    const mapped = mapBackendPost(newPost);
    setPosts(prevPosts => [mapped, ...prevPosts]);

    // Invalidate cache so next reload fetches fresh data
    sessionStorage.removeItem('home_feed_cache');

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

  const handlePostUpdate = async (updatedPost: Post & { deleted?: boolean; hidden?: boolean }) => {
    if (updatedPost.deleted || updatedPost.hidden) {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== updatedPost.id));
      return;
    }
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      )
    );
  };

  return (
    <>
    <PullToRefresh onRefresh={() => fetchPosts(1)}>
    <div className="relative w-full">
      {/* Status Bar — scrolls with content, hides under the fixed header */}
      <div className="w-full pb-2">
        <NewGamePromoBanner className="mb-3" />
        <StatusBar onViewerStateChange={setIsStatusViewerOpen} />

        {/* Smart Bar — swipeable mini carousel */}
        <div className="mt-2 flex justify-center">
          {(() => {
            const userPurges = user?.stats?.purges || 0;
            const dangerLevel = userPurges >= 15 ? 'CRITICAL' : userPurges >= 10 ? 'HIGH' : userPurges >= 5 ? 'MED' : 'LOW';
            const dangerColor = userPurges >= 15 ? 'text-red-500' : userPurges >= 10 ? 'text-orange-500' : userPurges >= 5 ? 'text-yellow-500' : 'text-green-500';
            const ghostedCount = ghostedFriends.length;
            const rank = (user?.credits || 0) > 500 ? 'Elite' : (user?.credits || 0) > 200 ? 'Survivor' : 'Initiate';
            const atRiskCount = ghostedFriends.filter((f: any) => (f.purgeCount || 0) < 20 && (f.purgeCount || 0) >= 10).length;

            const items = [
              {
                label: 'Danger',
                value: dangerLevel,
                color: dangerColor,
                icon: (
                  <svg key="danger" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={dangerColor}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ),
              },
              {
                label: 'Ghosted',
                value: `${ghostedCount}`,
                color: ghostedCount > 0 ? 'text-red-400' : 'text-muted',
                icon: (
                  <svg key="ghosted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={ghostedCount > 0 ? 'text-red-400' : 'text-muted'}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                ),
              },
              {
                label: 'At Risk',
                value: `${atRiskCount}`,
                color: atRiskCount > 0 ? 'text-orange-400' : 'text-muted',
                icon: (
                  <svg key="risk" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={atRiskCount > 0 ? 'text-orange-400' : 'text-muted'}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                ),
              },
              {
                label: 'Purges',
                value: `${userPurges}/20`,
                color: 'text-red-500',
                icon: (
                  <svg key="purges" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
                  </svg>
                ),
              },
              {
                label: 'Rank',
                value: rank,
                color: 'text-accent',
                icon: (
                  <svg key="rank" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                  </svg>
                ),
              },
            ];

            const [slideIdx, setSlideIdx] = useState(0);
            const [isDragging, setIsDragging] = useState(false);
            const autoPlayDelay = 3200;
            const totalSlides = items.length;
            const carouselRef = useRef<HTMLDivElement>(null);

            useEffect(() => {
              const timer = setInterval(() => {
                if (!isDragging) setSlideIdx(prev => (prev + 1) % totalSlides);
              }, autoPlayDelay);
              return () => clearInterval(timer);
            }, [isDragging, totalSlides]);

            return (
              <div
                className="w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setTimeout(() => setIsDragging(false), 500)}
                onMouseLeave={() => setIsDragging(false)}
                ref={carouselRef}
              >
                <motion.div
                  className="flex"
                  animate={{ x: `-${slideIdx * 100}%` }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                  drag="x"
                  dragConstraints={carouselRef}
                  dragElastic={0.1}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={(_, info) => {
                    const threshold = 30;
                    if (info.offset.x < -threshold && slideIdx < totalSlides - 1) {
                      setSlideIdx(slideIdx + 1);
                    } else if (info.offset.x > threshold && slideIdx > 0) {
                      setSlideIdx(slideIdx - 1);
                    }
                    setTimeout(() => setIsDragging(false), 800);
                  }}
                >
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="min-w-full flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 rounded-lg border border-orange-500/20 text-xs font-semibold text-foreground shadow-theme-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <span className="hidden sm:inline ml-1.5">Smart Arena</span>
                      <span className="text-accent font-bold ml-1.5">{userPoints}</span>
                      <span className="text-muted-foreground text-[10px] ml-0.5">pts</span>
                      <span className="mx-1.5 text-muted-foreground/30">|</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider mr-1">{item.label}:</span>
                      <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Dots */}
                <div className="flex items-center justify-center gap-1 mt-1">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setSlideIdx(i); setIsDragging(true); setTimeout(() => setIsDragging(false), 1500); }}
                      className={`transition-all duration-300 rounded-full ${
                        i === slideIdx ? 'w-3 h-1 bg-foreground/60' : 'w-1 h-1 bg-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main content — fills column (20px side padding from Layout) */}
      <div className="w-full relative">
        <div className="w-full">
          {/* Mobile Layout */}
          <div className="lg:hidden">
            {loading && posts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Spinner size="md" className="text-accent" />
                <p className="text-xs text-muted">Loading posts…</p>
              </div>
            ) : (
              <>
                <PostList
                  posts={posts}
                  onPostUpdate={handlePostUpdate}
                />
                {isLoadingMore && hasMore && (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 pb-24">
                    <Spinner size="sm" className="text-accent" />
                    <p className="text-[11px] text-muted font-medium tracking-wide">
                      Loading more posts…
                    </p>
                  </div>
                )}
                {!isLoadingMore && hasMore && !loadMoreError && (
                  <div className="py-3 flex justify-center pb-16">
                    <p className="text-[10px] text-muted/70 uppercase tracking-wider">
                      Scroll for more
                    </p>
                  </div>
                )}
                {loadMoreError && (
                  <div className="py-4 flex justify-center pb-16">
                    <button
                      type="button"
                      onClick={handleRetryLoadMore}
                      className="px-4 py-2 rounded-full bg-accent text-black text-sm font-medium hover:bg-accent/90"
                    >
                      Retry loading posts
                    </button>
                  </div>
                )}
                <div ref={sentinelRef} className="h-8" />
              </>
            )}

            {/* Mobile Sidebar Drawer */}
            {createPortal(
              <>
              <AnimatePresence>
                {sidebarOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/30 z-[54] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                  />
                   {/* Sidebar Drawer */}
                   <motion.div
                     initial={{ x: '100%' }}
                     animate={{ x: 0 }}
                     exit={{ x: '100%' }}
                     transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                     className="fixed right-0 top-0 bottom-0 w-40 z-[55] lg:hidden overflow-hidden bg-background"
                   >
                     <div
                       className="h-full overflow-y-auto scrollbar-hide pt-14 pb-4"
                       style={{ overscrollBehavior: 'contain' }}
                     >
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

                                {/* Game Card - Compact for mobile */}
                                <div className="relative bg-gradient-to-br from-background/80 to-background/60 dark:from-background/80 dark:to-background/60 backdrop-blur-sm border border-gray-200/20 dark:border-transparent rounded-lg p-1.5 group-hover:border-gray-300/30 dark:group-hover:border-transparent transition-all duration-300">
                                  <div className={`w-full aspect-square mb-1 rounded overflow-hidden shadow-sm relative group-hover:scale-105 transition-transform duration-300`}>
                                    <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                  </div>
                                  <h4 className="font-bold text-gray-800 dark:text-foreground text-[9px] leading-tight text-center bg-gradient-to-r from-gray-700 to-gray-900 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
                                    {game.name}
                                  </h4>
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <span className="text-yellow-600 dark:text-yellow-400 text-[7px]">⚡</span>
                                    <span className="text-yellow-700 dark:text-yellow-300 text-[7px]">{game.rating}</span>
                                  </div>
                                </div>
                              </div>

                              {expandedGame === game.id && (
                                <div className="px-1 pb-2 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                  <p className="text-[10px] text-gray-600 dark:text-muted/80 text-center italic leading-tight">{game.description}</p>
                                  <button
                                    onClick={() => handleGameSelect(game.id)}
                                    className="w-full px-2 py-1 bg-gradient-to-r from-white to-gray-200 text-black text-[10px] rounded-full font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md hover:shadow-white/25 dark:from-gray-200 dark:to-gray-300 dark:text-black"
                                  >
                                    PLAY
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
                                <div key={friend.id} className="flex flex-col items-center p-2 hover:bg-gray-100/10 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
                                  <ProfileLink username={friend.username} className="relative rounded-full">
                                    <img
                                      src={friend.avatarUrl || friend.avatar || DEFAULT_IMAGES.avatar}
                                      alt={friend.name || friend.fullName}
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/30"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = DEFAULT_IMAGES.avatar;
                                      }}
                                    />
                                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-lg border border-background">
                                      {friend.purgeCount || 0}
                                    </div>
                                  </ProfileLink>
                                  <ProfileLink username={friend.username} className="text-[10px] font-bold text-foreground mt-1 text-center truncate w-full hover:text-accent">
                                    {friend.name || friend.fullName}
                                  </ProfileLink>
                                  <ProfileLink username={friend.username} className="text-[9px] text-muted text-center truncate w-full hover:text-accent">
                                    @{friend.username}
                                  </ProfileLink>
                                  <div className="mt-2 w-full">
                                    <RedeemUserButton
                                      userId={friend.id}
                                      userName={friend.name || friend.fullName}
                                      isGhost={friend.isGhost ?? friend.is_ghost ?? true}
                                      onRedeemed={fetchGhostedFriends}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Floating Toggle Button - Always visible on mobile */}
            {!isStatusViewerOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed right-3 top-1/2 -translate-y-1/2 z-[60] lg:hidden flex flex-col items-center gap-1 w-16 h-16 min-h-[44px] rounded-full bg-transparent border-transparent shadow-none flex items-center justify-center transition-all duration-300 hover:scale-110"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-foreground" />
                )}
                <span className="text-[10px] font-medium text-foreground uppercase tracking-wide leading-none">
                  Games
                </span>
              </button>
            )}
            </>,
            document.body
          )}
          </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          {loading && posts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Spinner size="md" className="text-accent" />
              <p className="text-xs text-muted">Loading posts…</p>
            </div>
          ) : (
            <>
              <PostList
                posts={posts}
                onPostUpdate={handlePostUpdate}
              />
              {isLoadingMore && hasMore && (
                <div className="py-8 flex flex-col items-center justify-center gap-2 pb-24">
                  <Spinner size="sm" className="text-accent" />
                  <p className="text-[11px] text-muted font-medium tracking-wide">
                    Loading more posts…
                  </p>
                </div>
              )}
              {!isLoadingMore && hasMore && !loadMoreError && (
                <div className="py-3 flex justify-center pb-16">
                  <p className="text-[10px] text-muted/70 uppercase tracking-wider">
                    Scroll for more
                  </p>
                </div>
              )}
              {loadMoreError && (
                <div className="py-4 flex justify-center pb-16">
                  <button
                    type="button"
                    onClick={handleRetryLoadMore}
                    className="px-4 py-2 rounded-full bg-accent text-black text-sm font-medium hover:bg-accent/90"
                  >
                    Retry loading posts
                  </button>
                </div>
              )}
              <div ref={sentinelRef} className="h-8" />
            </>
          )}
        </div>
        </div>
      </div>

      </div>
    </PullToRefresh>

      {/* Floating Create Post Button */}
      {!isStatusViewerOpen && (
        <FloatingCreateButton onPostCreated={handlePostCreated} />
      )}
    </>
  );
}