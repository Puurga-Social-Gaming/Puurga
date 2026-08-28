import express from 'express';
import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { getBidirectionalBlockedIds, getMutedIds } from '../utils/friendRelations';

const router = express.Router();

const MAX_QUERY_LEN = 80;
const MIN_QUERY_LEN = 2;
const PEOPLE_LIMIT = 8;
const POSTS_LIMIT = 8;

/** Strip PostgREST filter metacharacters and ILIKE wildcards */
function sanitizeSearchQuery(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .slice(0, MAX_QUERY_LEN)
    .replace(/[%_,.()"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/**
 * GET /api/search?q=
 * Authenticated global search: people (profiles) + visible posts.
 */
router.get('/', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const q = sanitizeSearchQuery(req.query.q);
    if (q.length < MIN_QUERY_LEN) {
      return res.json({ query: q, people: [], posts: [] });
    }

    const pattern = `%${q}%`;

    // Friend IDs for ranking
    const { data: friendships } = await supabaseClient
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    const friendIds = new Set(
      (friendships || []).map((f) =>
        f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1,
      ),
    );

    const [byUsername, byName, postsRes] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .ilike('username', pattern)
        .neq('id', currentUserId)
        .limit(PEOPLE_LIMIT),
      supabaseClient
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .ilike('full_name', pattern)
        .neq('id', currentUserId)
        .limit(PEOPLE_LIMIT),
      supabaseClient
        .from('posts')
        .select('id, content, created_at, user_id, media_url')
        .ilike('content', pattern)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    if (byUsername.error) {
      console.error('Search username error:', byUsername.error);
    }
    if (byName.error) {
      console.error('Search name error:', byName.error);
    }
    if (postsRes.error) {
      console.error('Search posts error:', postsRes.error);
    }

    type ProfileRow = {
      id: string;
      full_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
      bio?: string | null;
    };

    const peopleMap = new Map<string, ProfileRow>();
    for (const row of [...(byUsername.data || []), ...(byName.data || [])] as ProfileRow[]) {
      if (row?.id) peopleMap.set(row.id, row);
    }

    const [blockedIds, mutedIds] = await Promise.all([
      getBidirectionalBlockedIds(currentUserId),
      getMutedIds(currentUserId),
    ]);
    const blockedSet = new Set(blockedIds);
    const mutedSet = new Set(mutedIds);

    const people = Array.from(peopleMap.values())
      .filter((p) => !blockedSet.has(p.id))
      .map((p) => {
        const isFriend = friendIds.has(p.id);
        return {
          id: p.id,
          name: p.full_name || p.username || 'User',
          username: p.username || '',
          avatar: normalizeImageUrl(p.avatar_url),
          bio: p.bio ? snippet(p.bio, 80) : '',
          isFriend,
        };
      })
      .sort((a, b) => {
        if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, PEOPLE_LIMIT);

    type PostRow = {
      id: string;
      content?: string | null;
      created_at?: string;
      user_id: string;
      media_url?: string | null;
      visibility?: string | null;
    };

    // Prefer public / friends-visible posts; schema may omit visibility column
    const rawPosts = (postsRes.data || []) as PostRow[];
    const visiblePosts = rawPosts
      .filter((post) => {
        if (blockedSet.has(post.user_id) || mutedSet.has(post.user_id)) return false;
        const visibility = post.visibility || 'public';
        if (visibility === 'public') return true;
        if (visibility === 'private') return post.user_id === currentUserId;
        if (visibility === 'friends') {
          return post.user_id === currentUserId || friendIds.has(post.user_id);
        }
        return true;
      })
      .slice(0, POSTS_LIMIT);

    const authorIds = Array.from(new Set(visiblePosts.map((p) => p.user_id).filter(Boolean)));
    let authorMap = new Map<string, ProfileRow>();
    if (authorIds.length > 0) {
      const { data: authors } = await supabaseClient
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', authorIds);
      authorMap = new Map((authors || []).map((a: ProfileRow) => [a.id, a]));
    }

    const posts = visiblePosts.map((post) => {
      const author = authorMap.get(post.user_id);
      const media = typeof post.media_url === 'string'
        ? post.media_url.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      return {
        id: post.id,
        content: snippet(post.content || '', 140),
        createdAt: post.created_at || null,
        hasMedia: media.length > 0,
        author: {
          id: post.user_id,
          name: author?.full_name || author?.username || 'User',
          username: author?.username || '',
          avatar: normalizeImageUrl(author?.avatar_url),
        },
      };
    });

    res.set('Cache-Control', 'no-store');
    return res.json({ query: q, people, posts });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
