import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { logSuperAdminAction } from '../utils/auditLogger';
import { NotificationService } from '../services/notificationService';
import { CreditService } from '../services/creditService';
import { PurgeEngine } from '../services/survival';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import { getMutedIds, getBidirectionalBlockedIds, getAcceptedFriendIds } from '../utils/friendRelations';
import { isTransientError } from '../utils/transientError';
import { parseMediaUrls } from '../utils/mediaUrls';
import { progressionEngine } from '../services/progressionEngine';
import { DailyMissionService } from '../services/dailyMissionService';
import { POST_PURGE_THRESHOLD } from '../constants/purgeConstants';

const router = express.Router();

// --- GET /api/posts/feed ---
router.get('/feed', auth, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const requestedLimit = parseInt(req.query.limit as string) || 10;
    const limit = Math.min(requestedLimit, 50);
    const from = (page - 1) * limit;

    console.log(`Fetching feed page ${page} (limit ${limit}, from ${from})`);

    // Over-fetch a bit so visibility/mute filters don't leave pages half-empty
    const fetchTo = from + Math.min(limit * 3, 60) - 1;

    type FeedPost = {
      id: string;
      user_id: string;
      content?: string | null;
      media_url?: string | null;
      created_at: string;
      updated_at?: string | null;
      likes?: number | null;
      dislikes?: number | null;
      purges?: number | null;
      visibility?: string | null;
      background_color?: string | null;
      background_type?: string | null;
      [key: string]: unknown;
    };

    const CORE_SELECT =
      'id, user_id, content, media_url, created_at, last_edited, purge_count, background_index, layout, media_layout, language, location_name';
    const LEGACY_SELECT =
      'id, user_id, content, media_url, created_at, updated_at, likes, dislikes, purges, visibility, background_color, background_type';
    const MIN_SELECT = 'id, user_id, content, media_url, created_at';

    const fetchPostsPage = async (select: string) =>
      supabase
        .from('posts')
        .select(select)
        .eq('is_hidden_from_feed', false)
        .order('created_at', { ascending: false })
        .range(from, fetchTo);

    let posts: FeedPost[] | null = null;
    let postsError: { message?: string; code?: string; details?: string } | null = null;

    // Prefer current schema; fall back to minimal, then legacy shapes
    const selectChain = [CORE_SELECT, MIN_SELECT, LEGACY_SELECT];
    let selectIdx = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
      const select = selectChain[selectIdx];
      const result = await fetchPostsPage(select);
      posts = (result.data as FeedPost[] | null) || null;
      postsError = result.error;

      if (!postsError) break;

      const msg = String(postsError.message || postsError.details || '');
      const missingCol = postsError.code === '42703' || /column .* does not exist/i.test(msg);

      if (missingCol) {
        if (selectIdx < selectChain.length - 1) {
          selectIdx += 1;
          continue;
        }
        break;
      }

      if (isTransientError(postsError) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }

      break;
    }

    if (postsError) {
      if (isTransientError(postsError) || postsError.code === '42703') {
        console.warn('Feed temporarily unavailable:', postsError.message);
        return res.status(503).json({ error: 'Feed temporarily unavailable', retry: true });
      }
      throw postsError;
    }

    // Normalize legacy / current column names
    if (posts) {
      posts = posts.map((p) => ({
        ...p,
        updated_at: (p as any).updated_at ?? (p as any).last_edited ?? p.created_at,
        purges: (p as any).purges ?? (p as any).purge_count ?? 0,
        likes: (p as any).likes ?? 0,
        dislikes: (p as any).dislikes ?? 0,
        visibility: (p as any).visibility ?? 'public',
      }));
    }

    let safePosts: FeedPost[] = posts || [];
    if (safePosts.length === 0) {
      return res.json([]);
    }

    // Friends for visibility filtering (all schemas)
    const friendIdList = await getAcceptedFriendIds(currentUserId);
    const friendIds = new Set(friendIdList);

    safePosts = safePosts.filter((post) => {
      const visibility = (post as any).visibility || 'public';
      if (visibility === 'public') return true;
      if (visibility === 'private') return post.user_id === currentUserId;
      if (visibility === 'friends') {
        return post.user_id === currentUserId || friendIds.has(post.user_id);
      }
      return true;
    });

    // Hide muted / blocked authors
    const [mutedIds, blockedIds] = await Promise.all([
      getMutedIds(currentUserId),
      getBidirectionalBlockedIds(currentUserId),
    ]);
    const hiddenAuthors = new Set([...mutedIds, ...blockedIds]);
    if (hiddenAuthors.size > 0) {
      safePosts = safePosts.filter((post) => !hiddenAuthors.has(post.user_id));
    }

    // Trim to requested page size after filters
    safePosts = safePosts.slice(0, limit);

    if (safePosts.length === 0) {
      return res.json([]);
    }

    // Visibility scores for ranking (best-effort)
    const uniqueUserIds = Array.from(new Set(safePosts.map((p) => p.user_id).filter(Boolean)));
    const { data: survivalStates } = await supabase
      .from('user_survival_state')
      .select('user_id, visibility_score')
      .in('user_id', uniqueUserIds);

    const visibilityMap = new Map<string, number>();
    (survivalStates || []).forEach((s) => {
      visibilityMap.set(s.user_id, s.visibility_score ?? 100);
    });

    safePosts.sort((a, b) => {
      const visA = visibilityMap.get(a.user_id) ?? 100;
      const visB = visibilityMap.get(b.user_id) ?? 100;
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      const rankA = timeA * (visA >= 80 ? 1.5 : visA >= 50 ? 1.0 : visA >= 20 ? 0.5 : 0.2);
      const rankB = timeB * (visB >= 80 ? 1.5 : visB >= 50 ? 1.0 : visB >= 20 ? 0.5 : 0.2);
      return rankB - rankA;
    });

    const userIds = Array.from(new Set(safePosts.map((p) => p.user_id).filter(Boolean)));
    const postIds = safePosts.map((p) => p.id).filter(Boolean);

    const [profilesRes, usersRes, commentsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, certification_slug, logo_certified')
        .in('id', userIds),
      supabase.from('users').select('id, avatar_url').in('id', userIds),
      postIds.length
        ? supabase.from('comments').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as Array<{ post_id: string }>, error: null }),
    ]);

    let profiles = (profilesRes.data || []) as Array<{
      id: string;
      full_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
      certification_slug?: string | null;
      logo_certified?: boolean | null;
    }>;

    // Soft fallback if certification columns not migrated yet
    if (profilesRes.error && /certification_slug|logo_certified|42703/i.test(String(profilesRes.error.message || ''))) {
      const retry = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);
      profiles = (retry.data || []) as typeof profiles;
    }
    const usersTbl = Array.isArray(usersRes.data)
      ? (usersRes.data as Array<{ id: string; avatar_url?: string | null }>)
      : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const usersMap = new Map(usersTbl.map((u) => [u.id, u]));

    const commentCountMap = new Map<string, number>();
    for (const row of commentsRes.data || []) {
      const pid = (row as any).post_id as string;
      commentCountMap.set(pid, (commentCountMap.get(pid) || 0) + 1);
    }

    const mapped = safePosts.map((post) => {
      const prof = profileMap.get(post.user_id as string);
      const urow = usersMap.get(post.user_id as string);
      const rawAvatar = prof?.avatar_url ?? urow?.avatar_url ?? '';
      const avatar = normalizeImageUrl(rawAvatar);
      const name = prof?.full_name ?? '';
      const username = prof?.username ?? '';

      const images = parseMediaUrls(post.media_url)
        .map((url) => normalizeImageUrl(url))
        .filter(Boolean);

      const commentCount = commentCountMap.get(post.id) ?? 0;

      return {
        ...post,
        comments: commentCount,
        comment_count: commentCount,
        images,
        user: {
          id: post.user_id,
          name,
          username,
          avatar,
          certificationSlug: (prof as any)?.certification_slug || null,
          logoCertified: Boolean((prof as any)?.logo_certified),
        },
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching posts:', error);
    if (isTransientError(error)) {
      return res.status(503).json({ error: 'Feed temporarily unavailable', retry: true });
    }
    // Soft-fail: keep the home shell usable; client will retry
    return res.status(503).json({ error: 'Feed temporarily unavailable', retry: true });
  }
});

// --- GET /api/posts/purges/my-activity ---
// Get purges the user has given and received
router.get('/purges/my-activity', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Fetch purges given by the user (purges they made on other people's posts)
    const { data: purgesGiven, error: givenError } = await supabase
      .from('post_purges')
      .select(`
        id,
        post_id,
        user_id,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (givenError) throw givenError;

    // Fetch posts that the user authored to find purges received
    const { data: userPosts, error: userPostsError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId);

    if (userPostsError) throw userPostsError;

    const userPostIds = (userPosts || []).map(p => p.id);

    // Fetch purges on user's posts (purges received)
    let purgesReceived: any[] = [];
    if (userPostIds.length > 0) {
      const { data: received, error: receivedError } = await supabase
        .from('post_purges')
        .select(`
          id,
          post_id,
          user_id,
          created_at
        `)
        .in('post_id', userPostIds)
        .neq('user_id', userId) // Exclude self-purges if any
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;
      purgesReceived = received || [];
    }

    // Get post details for purges given
    const givenPostIds = Array.from(new Set((purgesGiven || []).map(p => p.post_id).filter(Boolean)));
    const postsGivenMap = new Map();
    if (givenPostIds.length > 0) {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .in('id', givenPostIds);
      (postsData || []).forEach(p => postsGivenMap.set(p.id, p));
    }

    // Get user IDs for profiles
    const givenUserIds = Array.from(new Set(
      (purgesGiven || []).map(p => postsGivenMap.get(p.post_id)?.user_id).filter(Boolean)
    ));
    const receivedUserIds = Array.from(new Set((purgesReceived || []).map(p => p.user_id).filter(Boolean)));
    const allUserIds = Array.from(new Set([...givenUserIds, ...receivedUserIds]));

    // Fetch profile information for all users
    const profileMap = new Map();
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', allUserIds);

      (profiles || []).forEach(profile => {
        profileMap.set(profile.id, {
          id: profile.id,
          name: profile.full_name,
          username: profile.username,
          avatar: normalizeImageUrl(profile.avatar_url)
        });
      });
    }

    // Format purges given with profile info
    const formattedPurgesGiven = (purgesGiven || []).map(purge => {
      const post = postsGivenMap.get(purge.post_id);
      return {
        id: purge.id,
        postId: purge.post_id,
        post: post ? { id: post.id, content: post.content, created_at: post.created_at } : null,
        targetUser: post ? profileMap.get(post.user_id) || null : null,
        createdAt: purge.created_at,
        type: 'given'
      };
    });

    // Format purges received with profile info
    const formattedPurgesReceived = (purgesReceived || []).map(purge => ({
      id: purge.id,
      postId: purge.post_id,
      post: null, // Can add post details if needed
      actor: profileMap.get(purge.user_id) || null,
      createdAt: purge.created_at,
      type: 'received'
    }));

    res.json({
      given: formattedPurgesGiven,
      received: formattedPurgesReceived,
      stats: {
        totalGiven: formattedPurgesGiven.length,
        totalReceived: formattedPurgesReceived.length
      }
    });

  } catch (error) {
    console.error('Error fetching purge activity:', error);
    res.status(500).json({ error: 'Failed to fetch purge activity' });
  }
});

// --- GET /api/posts/:id ---
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user?.id;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (error) throw error;
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [{ data: profile }, { data: userRow }, { count: commentCount }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', post.user_id).maybeSingle(),
      supabase.from('users').select('id, avatar_url').eq('id', post.user_id).maybeSingle(),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
    ]);

    const avatar = normalizeImageUrl(profile?.avatar_url || userRow?.avatar_url || '');
    const images = parseMediaUrls(post.media_url)
      .map((url) => normalizeImageUrl(url))
      .filter(Boolean);

    res.json({
      ...post,
      images,
      comments: commentCount || 0,
      comment_count: commentCount || 0,
      user: {
        id: post.user_id,
        name: profile?.full_name || 'User',
        username: profile?.username || 'user',
        avatar,
      },
      viewer_id: currentUserId || null,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// --- POST /api/posts/:id/purge ---
router.post('/:id/purge', auth, validateNotGhosted, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const targetUserId = post.user_id;
    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';

    if (!isSuperAdmin) {
      const validation = await PurgeEngine.validatePurge(userId, postId, targetUserId);
      if (!validation.valid) {
        const status =
          validation.code === 'ALREADY_PURGED' || validation.code === 'COOLDOWN_ACTIVE'
            ? 400
            : validation.code === 'OWN_POST'
              ? 403
              : 403;
        return res.status(status).json({
          error: validation.error,
          code: validation.code,
        });
      }
    }

    if (String(userId) === String(targetUserId) && isSuperAdmin) {
      await logSuperAdminAction({
        superadminId: userId,
        action: 'PURGE_OWN_POST_OVERRIDE',
        targetId: postId,
        targetType: 'post',
        details: { note: 'Super Admin purged their own post' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    let purgeWeight = { weight: 1.0, reputation: 100, threatLevel: 0 };
    try {
      purgeWeight = await PurgeEngine.calculatePurgeWeight(userId);
    } catch (e) {
      console.warn('Purge weight calc skipped:', e);
    }

    const { error: insertError } = await supabase.from('post_purges').insert({
      post_id: postId,
      user_id: userId,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      // Unique violation → already purged
      if ((insertError as any).code === '23505') {
        return res.status(400).json({
          error: 'Already purged this post',
          code: 'ALREADY_PURGED',
        });
      }
      console.error('post_purges insert failed:', insertError);
      return res.status(500).json({
        error: insertError.message || 'Failed to record purge',
        code: 'PURGE_INSERT_FAILED',
      });
    }

    const { count, error: countError } = await supabase
      .from('post_purges')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      console.warn('Purge count query warning:', countError.message);
    }

    const totalPurges = typeof count === 'number' ? count : 1;

    const postUpdate: Record<string, any> = { purge_count: totalPurges };
    if (totalPurges >= POST_PURGE_THRESHOLD) {
      postUpdate.is_hidden_from_feed = true;
    }

    const { error: updatePostError } = await supabase
      .from('posts')
      .update(postUpdate)
      .eq('id', postId);

    if (updatePostError) {
      // Column may be missing on older DBs — purge still counts
      console.warn('posts.purge_count update skipped:', updatePostError.message);
    }

    let consequences = {
      ghostTriggered: false,
      tier: 'STABLE',
      visibilityScore: 100,
    };
    try {
      consequences = await PurgeEngine.applyConsequences(targetUserId, userId);
    } catch (e) {
      console.warn('Purge consequences skipped (post still purged):', e);
    }

    try {
      await PurgeEngine.recordCooldown(userId, postId);
    } catch (e) {
      console.warn('Purge cooldown skipped:', e);
    }

    try {
      await PurgeEngine.updateRateLimits(userId);
    } catch (e) {
      console.warn('Purge rate limits skipped:', e);
    }

    return res.json({
      purged: true,
      purges: totalPurges,
      ghostModeTriggered: consequences.ghostTriggered,
      tier: consequences.tier,
      visibilityScore: consequences.visibilityScore,
      purgeWeight: purgeWeight.weight,
    });
  } catch (error: any) {
    console.error('Error handling post purge:', error);
    res.status(500).json({
      error: error?.message || 'Failed to purge post',
      code: 'PURGE_FAILED',
    });
  }
});

// --- POST /api/posts/:id/puurga ---
router.post('/:id/puurga', auth, validateNotGhosted, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if user has already puurga'd this post
    const { data: existingPuurga, error: checkError } = await supabase
      .from('reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('type', 'puurga')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let puurged = false;
    let totalPuurgas = 0;

    if (existingPuurga) {
      // Remove puurga
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existingPuurga.id);

      if (deleteError) throw deleteError;
      puurged = false;
    } else {
      // Add puurga
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({
          post_id: postId,
          user_id: userId,
          type: 'puurga',
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
      puurged = true;
    }

    // Get total puurga count for this post
    const { data: puurgas, error: countError } = await supabase
      .from('reactions')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
      .eq('type', 'puurga');

    if (countError) throw countError;
    totalPuurgas = puurgas?.length || 0;

    res.json({
      puurged,
      puurgas: totalPuurgas
    });

  } catch (error) {
    console.error('Error handling puurga:', error);
    res.status(500).json({ error: 'Failed to puurga post' });
  }
});

// --- PUT /api/posts/:id ---
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, background_index } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if the post exists and belongs to the user
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';

    if (existingPost.user_id !== userId && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    if (existingPost.user_id !== userId && isSuperAdmin) {
      await logSuperAdminAction({
        superadminId: userId,
        action: 'EDIT_POST_BYPASS',
        targetId: postId,
        targetType: 'post',
        details: { original_author: existingPost.user_id, content_length: content.length },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Build update payload
    const updateData: any = {
      content,
      last_edited: new Date().toISOString()
    };
    if (typeof background_index === 'number') {
      updateData.background_index = background_index;
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      return res.status(500).json({ error: 'Failed to update post: ' + updateError.message });
    }

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// --- DELETE /api/posts/:id ---
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if the post exists and belongs to the user
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';

    if (existingPost.user_id !== userId && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    if (existingPost.user_id !== userId && isSuperAdmin) {
      await logSuperAdminAction({
        superadminId: userId,
        action: 'DELETE_POST_BYPASS',
        targetId: postId,
        targetType: 'post',
        details: { original_author: existingPost.user_id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Delete related reactions first
    await supabase
      .from('reactions')
      .delete()
      .eq('post_id', postId);

    // Delete related purges
    await supabase
      .from('post_purges')
      .delete()
      .eq('post_id', postId);

    // Delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/posts/:postId/react - Add or toggle a reaction
router.post('/:postId/react', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { type } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Reaction type is required' });
    }

    const allowedReactions = ['puurga', 'like', 'laugh', 'fire', 'heart', 'joy', 'party', 'wow', 'thumbsup'];
    if (!allowedReactions.includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type', allowed: allowedReactions });
    }

    // Check if user already has a reaction on this post
    const { data: existingReaction, error: checkError } = await supabase
      .from('reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingReaction) {
      // If same type, remove it (toggle off)
      if (existingReaction.type === type) {
        await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Different type, update it
        await supabase
          .from('reactions')
          .update({ type })
          .eq('id', existingReaction.id);
      }
    } else {
      // No existing reaction, create new one
      await supabase
        .from('reactions')
        .insert({
          post_id: postId,
          user_id: userId,
          type,
          created_at: new Date().toISOString(),
        });

      // Award credits for likes
      if (type === 'like') {
        const canLike = await CreditService.checkAndIncrementLikeCount(userId);
        if (canLike) {
          await CreditService.awardCredits(userId, 1, 'like', 'Like post');
          
          // Award +2 to post owner
          const { data: post, error: postError } = await supabase.from('posts').select('user_id').eq('id', postId).single();
          if (postError) {
            console.warn('Post not found for like credit:', postError.message);
          } else if (post?.user_id && post.user_id !== userId) {
            await CreditService.awardCredits(post.user_id, 2, 'like', 'Receive like');

            // Send like notification to post owner
            await NotificationService.like(userId, post.user_id, postId);

            // Emit progression event (XP for both users)
            progressionEngine.safeEmit('PostLiked', {
              userId,
              postId,
              authorId: post.user_id,
            });

            // Track daily mission progress
            DailyMissionService.trackProgress(userId, 'like').catch(() => {});
          }
        }
      }

      await CreditService.updateLastActiveAt(userId);
    }

    // Fetch all reactions for this post grouped by type
    const { data: allReactions, error: fetchError } = await supabase
      .from('reactions')
      .select('type, user_id')
      .eq('post_id', postId);

    if (fetchError) throw fetchError;

    // Get user profiles for all reactors
    const userIds = Array.from(new Set((allReactions || []).map(r => r.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Group reactions by type
    const reactionsByType: { [key: string]: { count: number; users: any[] } } = {};

    (allReactions || []).forEach(reaction => {
      if (!reactionsByType[reaction.type]) {
        reactionsByType[reaction.type] = { count: 0, users: [] };
      }
      reactionsByType[reaction.type].count++;

      const profile = profileMap.get(reaction.user_id);
      if (profile) {
        reactionsByType[reaction.type].users.push({
          id: profile.id,
          name: profile.full_name || 'Unknown User',
          username: profile.username || 'unknown',
          avatar: normalizeImageUrl(profile.avatar_url) || ''
        });
      }
    });

    res.json(reactionsByType);
  } catch (error) {
    console.error('Error handling reaction:', error);
    res.status(500).json({ error: 'Failed to process reaction' });
  }
});

export default router;
