import { useEffect, useState } from 'react';
import { Post, ReactionCount } from '../types';
import CreatePost from '../components/Post/CreatePost';
import PostList from '../components/Post/PostList';
import StatusBar from '../components/StatusBar/StatusBar';
import api from '../api/api';
import { toast } from 'react-hot-toast';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Removed JS-driven fade; using CSS top mask for per-post fade at boundary.

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // api has baseURL '/api', try root posts feed first, then fallback to users namespace
      const tryEndpoints = ['/posts/feed', '/users/posts/feed'];
      let data: unknown = [] as unknown[];

      for (const ep of tryEndpoints) {
        try {
          const response = await api.get(ep);
          data = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
          if (Array.isArray(data) && data.length >= 0) {
            console.log(`Feed fetched from ${ep}. Count:`, data.length);
            break;
          }
        } catch (e) {
          console.warn(`Feed fetch failed at ${ep}`, e);
        }
      }

      const mappedPosts = (Array.isArray(data) ? data : []).map(mapBackendPost);
      setPosts(mappedPosts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to fetch posts');
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = async (newPost: unknown) => {
    const mapped = mapBackendPost(newPost);
    setPosts(prevPosts => [mapped, ...prevPosts]);
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
          <div className="mt-2">
            <CreatePost onPostCreated={handlePostCreated} />
          </div>
        </div>
      </div>
      
      {/* Top fade to prevent content showing underneath fixed header */}
      <div className="neo-top-fade" />
      
      {/* Main feed content with proper top spacing accounting for safe area */}
      <div className="pt-40 sm:pt-44" style={{ paddingTop: 'calc(10rem + env(safe-area-inset-top, 0))' }}>
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-0 relative">
          <div className="neo-feed-mask">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="neo-skel p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#222] rounded-full" />
                      <div className="flex-1">
                        <div className="w-1/4 h-4 bg-[#222] rounded mb-2" />
                        <div className="w-1/3 h-3 bg-[#222] rounded" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full h-24 bg-[#222] rounded" />
                    </div>
                  </div>
                ))}
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
          </div>
        </div>
      </div>
    </div>
  );
}