import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Post, ReactionCount } from '../types';
import PostList from '../components/Post/PostList';
import StatusBar from '../components/StatusBar/StatusBar';
import api from '../api/api';
import { supabase } from '../lib/supabaseClient';
import FloatingCreateButton from '../components/Post/FloatingCreateButton';
import PullToRefresh from '../components/PullToRefresh/PullToRefresh';
import Spinner from '../components/Spinner';
import { useWebSocket } from '../hooks/useWebSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';




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

  const handleGameSelect = (gameId: string) => {
    const match = games.find((g) => g.id === gameId);
    navigate(match?.link ?? '/puurga-games');
  };

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
    onCreditUpdate: () => {
      refreshUserStats();
    },
    onProfileUpdate: (payload) => {
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
    if (!supabase) return;

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

  const handleScrollToTop = () => {
    const mainScroll = document.querySelector('.app-main-scroll');
    if (mainScroll) mainScroll.scrollTo({ top: 0, behavior: 'smooth' });
    fetchPosts(1);
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
        <StatusBar onViewerStateChange={setIsStatusViewerOpen} />
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
                {!hasMore && !loading && posts.length > 0 && (
                  <div className="pt-2 pb-6 flex justify-center">
                    <button
                      type="button"
                      onClick={handleScrollToTop}
                      className="px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                    >
                      Check for new posts
                    </button>
                  </div>
                )}
                {!hasMore && posts.length > 0 && <div className="h-1" />}
                {hasMore && <div ref={sentinelRef} className="h-8" />}
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
                     className="fixed right-0 top-0 bottom-0 w-40 z-[55] lg:hidden overflow-hidden"
                   >
                     <div
                       className="h-full overflow-y-auto scrollbar-hide pt-16 pb-4 flex flex-col items-center"
                       style={{ overscrollBehavior: 'contain' }}
                     >
                          {/* Floating Game Bubbles */}
                          <div className="flex flex-col items-center gap-4">
                            {/* Hero Bubble - Judgment */}
                            <div className="flex flex-col items-center">
                              <div
                                className="game-bubble bubble-float-1 w-[80px] h-[80px]"
                                onClick={() => handleGameSelect(games[0].id)}
                              >
                                <div className="game-bubble-img">
                                  <img src={games[0].image} alt={games[0].name} />
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold text-foreground/80 mt-1 bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/40">
                                {games[0].name}
                              </span>
                            </div>

                            {/* Orbit Cluster - 2 bubbles */}
                            <div className="flex justify-center items-center gap-4">
                              <div className="flex flex-col items-center">
                                <div
                                  className="game-bubble bubble-float-2 w-[64px] h-[64px]"
                                  onClick={() => handleGameSelect(games[1].id)}
                                >
                                  <div className="game-bubble-img">
                                    <img src={games[1].image} alt={games[1].name} />
                                  </div>
                                </div>
                                <span className="text-[8px] font-semibold text-foreground/70 mt-1 bg-background/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-border/40">
                                  {games[1].name}
                                </span>
                              </div>
                              <div className="flex flex-col items-center -mt-3">
                                <div
                                  className="game-bubble bubble-float-3 w-[46px] h-[46px]"
                                  onClick={() => handleGameSelect(games[2].id)}
                                >
                                  <div className="game-bubble-img">
                                    <img src={games[2].image} alt={games[2].name} />
                                  </div>
                                </div>
                                <span className="text-[8px] font-semibold text-foreground/70 mt-1 bg-background/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-border/40">
                                  {games[2].name}
                                </span>
                              </div>
                            </div>

                            {/* Purga Rift */}
                            <div className="flex flex-col items-center">
                              <div
                                className="game-bubble bubble-float-1 w-[72px] h-[72px]"
                                onClick={() => handleGameSelect(games[3].id)}
                              >
                                <div className="game-bubble-img">
                                  <img src={games[3].image} alt={games[3].name} />
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold text-foreground/80 mt-1 bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/40">
                                {games[3].name}
                              </span>
                            </div>

                            {/* Cyber Runner */}
                            <div className="flex flex-col items-center">
                              <div
                                className="game-bubble bubble-float-2 w-[52px] h-[52px]"
                                onClick={() => handleGameSelect(games[4].id)}
                              >
                                <div className="game-bubble-img">
                                  <img src={games[4].image} alt={games[4].name} />
                                </div>
                              </div>
                              <span className="text-[8px] font-semibold text-foreground/70 mt-1 bg-background/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-border/40">
                                {games[4].name}
                              </span>
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
                className="fixed right-3 top-[55%] -translate-y-1/2 z-[60] lg:hidden flex flex-col items-center gap-1 w-16 h-16 min-h-[44px] rounded-full bg-transparent border-transparent shadow-none flex items-center justify-center transition-all duration-300 hover:scale-110"
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
              {!hasMore && !loading && posts.length > 0 && (
                <div className="pt-2 pb-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleScrollToTop}
                    className="px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                  >
                    Check for new posts
                  </button>
                </div>
              )}
              {!hasMore && posts.length > 0 && <div className="h-1" />}
              {hasMore && <div ref={sentinelRef} className="h-8" />}
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