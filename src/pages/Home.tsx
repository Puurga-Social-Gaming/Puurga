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

      {/* Main feed content with proper top spacing accounting for safe area */}
      <div className="pt-24 sm:pt-28" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top, 0))' }}>
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-0 relative">
          <div className="neo-feed-mask">
            {loading ? (
              <div className="py-20 flex justify-center">
                {/* Empty or minimal loader if desired, but user asked to remove wireframe */}
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-center">
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
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      {/* Floating Create Post Button */}
      <FloatingCreateButton onPostCreated={handlePostCreated} />
    </div>
  );
}