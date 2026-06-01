import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { logSuperAdminAction } from '../utils/auditLogger';
import { NotificationService } from '../services/notificationService';
import { CreditService } from '../services/creditService';
import { PurgeEngine } from '../services/survival';
import { validateNotGhosted } from '../middleware/restrictGhosted';

const router = express.Router();

// --- GET /api/posts/feed ---
router.get('/feed', auth, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const requestedLimit = parseInt(req.query.limit as string) || 10;
    const limit = Math.min(requestedLimit, 50);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log(`Fetching feed page ${page} (limit ${limit}, range ${from}-${to})`);

    // 1) Fetch posts with pagination
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (postsError) throw postsError;

    let safePosts = posts || [];
    if (safePosts.length === 0) {
      return res.json([]);
    }

    // 2) Get current user's friends for visibility filtering
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    const friendIds = new Set(
      (friendships || []).map(f =>
        f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1
      )
    );

    // 3) Filter posts by visibility
    safePosts = safePosts.filter(post => {
      const visibility = post.visibility || 'public';

      if (visibility === 'public') return true;
      if (visibility === 'private') return post.user_id === currentUserId;
      if (visibility === 'friends') {
        return post.user_id === currentUserId || friendIds.has(post.user_id);
      }
      return true;
    });

    if (safePosts.length === 0) {
      return res.json([]);
    }

    // 4) Fetch visibility scores for ranking
    const uniqueUserIds = Array.from(new Set(safePosts.map(p => p.user_id).filter(Boolean)));
    const { data: survivalStates } = await supabase
      .from('user_survival_state')
      .select('user_id, visibility_score')
      .in('user_id', uniqueUserIds);

    const visibilityMap = new Map<string, number>();
    (survivalStates || []).forEach(s => {
      visibilityMap.set(s.user_id, s.visibility_score ?? 100);
    });

    // 5) Apply visibility-based ranking
    safePosts.sort((a, b) => {
      const visA = visibilityMap.get(a.user_id) ?? 100;
      const visB = visibilityMap.get(b.user_id) ?? 100;
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();

      const rankA = timeA * (visA >= 80 ? 1.5 : visA >= 50 ? 1.0 : visA >= 20 ? 0.5 : 0.2);
      const rankB = timeB * (visB >= 80 ? 1.5 : visB >= 50 ? 1.0 : visB >= 20 ? 0.5 : 0.2);

      return rankB - rankA;
    });

    // 7) Collect unique user_ids
    const userIds = Array.from(new Set(safePosts.map(p => p.user_id).filter(Boolean)));

    // 8) Fetch profile data from profiles and avatar from users (if table exists)
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
      supabase.from('users').select('id, avatar_url').in('id', userIds),
    ]);

    const profiles = (profilesRes.data || []) as Array<{ id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>;
    const usersTbl = Array.isArray(usersRes.data) ? (usersRes.data as Array<{ id: string; avatar_url?: string | null }>) : [];

    const profileMap = new Map<string, { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>();
    for (const p of profiles) profileMap.set(p.id, p);
    const usersMap = new Map<string, { id: string; avatar_url?: string | null }>();
    for (const u of usersTbl) usersMap.set(u.id, u);


    // 9) Fetch comment counts for these posts
    const postIds = safePosts.map(p => p.id).filter(Boolean);
    const commentCounts = await Promise.all(
      postIds.map(async (postId) => {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        return { postId, count: count || 0 };
      })
    );
    const commentCountMap = new Map<string, number>();
    for (const cc of commentCounts) commentCountMap.set(cc.postId, cc.count);


    // 10) Map posts with images and merged user object
    const mapped = safePosts.map(post => {
      const prof = profileMap.get(post.user_id as string);
      const urow = usersMap.get(post.user_id as string);
      // Check profiles first since that's where new avatars are saved
      // Fallback to users table for backwards compatibility
      const rawAvatar = (prof?.avatar_url) ?? (urow?.avatar_url) ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      const name = prof?.full_name ?? '';
      const username = prof?.username ?? '';

      // Process images with URL normalization
      let images: string[] = [];
      if (typeof post.media_url === 'string' && post.media_url.length > 0) {
        try {
          // Try to parse as JSON array first
          const parsed = JSON.parse(post.media_url);
          if (Array.isArray(parsed)) {
            images = parsed
              .map((url: string) => normalizeImageUrl(url))
              .filter(Boolean);
          } else {
            // Fallback to comma-separated parsing
            images = post.media_url
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
              .map(normalizeImageUrl)
              .filter(Boolean);
          }
        } catch {
          // If JSON parsing fails, try comma-separated parsing
          images = post.media_url
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map(normalizeImageUrl)
            .filter(Boolean);
        }
      }

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
        },
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
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
        return res.status(403).json({
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
        userAgent: req.headers['user-agent']
      });
    }

    const purgeWeight = await PurgeEngine.calculatePurgeWeight(userId);

    const { error: insertError } = await supabase
      .from('post_purges')
      .insert({
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    const { data: purgeCount } = await supabase
      .from('post_purges')
      .select('*', { count: 'exact' })
      .eq('post_id', postId);

    const totalPurges = purgeCount?.length || 0;

    await supabase
      .from('posts')
      .update({ purge_count: totalPurges })
      .eq('id', postId);

    const consequences = await PurgeEngine.applyConsequences(targetUserId, userId);

    await PurgeEngine.recordCooldown(userId, postId);
    await PurgeEngine.updateRateLimits(userId);

    res.json({
      purged: true,
      purges: totalPurges,
      ghostModeTriggered: consequences.ghostTriggered,
      tier: consequences.tier,
      visibilityScore: consequences.visibilityScore,
      purgeWeight: purgeWeight.weight,
    });

  } catch (error) {
    console.error('Error handling post purge:', error);
    res.status(500).json({ error: 'Failed to purge post' });
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
        });

      // Award credits for likes
      if (type === 'like') {
        const canLike = await CreditService.checkAndIncrementLikeCount(userId);
        if (canLike) {
          await CreditService.awardCredits(userId, 1, 'like', 'Like post');
          
          // Award +2 to post owner
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
          if (post?.user_id && post.user_id !== userId) {
            await CreditService.awardCredits(post.user_id, 2, 'like', 'Receive like');

            // Send like notification to post owner
            await NotificationService.like(userId, post.user_id, postId);
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
