import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
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
import { Post, User, Comment, Reaction, UserSurvivalState, Profile, PostPurge } from '../models';
import { supabase } from '../config/supabase';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';


const router = express.Router();

// --- GET /api/posts/feed ---
router.get('/feed', auth, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const requestedLimit = parseInt(req.query.limit as string) || 10;
    const limit = Math.min(requestedLimit, 50);
    const offset = (page - 1) * limit;

    console.log(`Fetching feed page ${page} (limit ${limit}, offset ${offset})`);

    // Fetch posts with pagination using raw query to avoid timestamp aliasing issues
    const posts = await sequelize.query(
      `SELECT id, user_id, content, media_url, created_at, updated_at,
             last_edited, purge_count, visibility, background_index
      FROM posts
      ORDER BY created_at DESC
      LIMIT ? OFFSET 0`,
      {
        replacements: [limit * 3],
        type: QueryTypes.SELECT
      }
    );

    if (!posts || posts.length === 0) {
      return res.json([]);
    }

    // Get user IDs for fetching user data
    const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));
    const postIds = posts.map((p: any) => p.id).filter(Boolean);

    // Fetch user profiles
    const profiles = await Profile.findAll({
      where: { id: userIds }
    });

    const users = await User.findAll({
      where: { id: userIds }
    });

    // Fetch comment counts
    const commentCounts = await Comment.findAll({
      where: { post_id: postIds },
      attributes: ['post_id'],
      group: ['post_id']
    });

    // Fetch survival states for visibility scoring
    const survivalStates = await UserSurvivalState.findAll({
      where: { user_id: userIds }
    });

    // Build maps for quick lookup
    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const usersMap = new Map(users.map((u: any) => [u.id, u]));
    const commentCountMap = new Map(commentCounts.map((c: any) => [c.post_id, (c as any).count || 0]));
    const visibilityMap = new Map(survivalStates.map((s: any) => [s.user_id, s.visibility_score || 100]));

    // Friends for visibility filtering
    const friendIdList = await getAcceptedFriendIds(currentUserId);
    const friendIds = new Set(friendIdList);

    // Hide muted / blocked authors
    const [mutedIds, blockedIds] = await Promise.all([
      getMutedIds(currentUserId),
      getBidirectionalBlockedIds(currentUserId),
    ]);
    const hiddenAuthors = new Set([...mutedIds, ...blockedIds]);

    // Filter and process posts
    let safePosts = posts.filter((post: any) => {
      // Filter by hidden authors
      if (hiddenAuthors.has(post.user_id)) return false;

      // Filter by visibility (if we have visibility field)
      const visibility = post.visibility || 'public';
      if (visibility === 'private') return post.user_id === currentUserId;
      if (visibility === 'friends') {
        return post.user_id === currentUserId || friendIds.has(post.user_id);
      }
      return true;
    });

    // Sort by visibility score and time
    safePosts.sort((a: any, b: any) => {
      const visA = visibilityMap.get(a.user_id) ?? 100;
      const visB = visibilityMap.get(b.user_id) ?? 100;
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      const rankA = timeA * (visA >= 80 ? 1.5 : visA >= 50 ? 1.0 : visA >= 20 ? 0.5 : 0.2);
      const rankB = timeB * (visB >= 80 ? 1.5 : visB >= 50 ? 1.0 : visB >= 20 ? 0.5 : 0.2);
      return rankB - rankA;
    });

    // Trim to requested page size
    safePosts = safePosts.slice(0, limit);

    if (safePosts.length === 0) {
      return res.json([]);
    }

    // Map posts to response format
    const mapped = safePosts.map((post: any) => {
      const prof = profileMap.get(post.user_id);
      const urow = usersMap.get(post.user_id);
      const rawAvatar = prof?.avatar_url || urow?.avatar || '';
      const avatar = normalizeImageUrl(rawAvatar);
      const name = prof?.full_name || urow?.name || '';
      const username = prof?.username || urow?.username || '';

      const images = parseMediaUrls(post.media_url)
        .map((url) => normalizeImageUrl(url))
        .filter(Boolean);

      const commentCount = commentCountMap.get(post.id) || 0;

      return {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        media_url: post.media_url,
        created_at: post.created_at,
        createdAt: post.created_at,
        updated_at: post.updated_at || post.last_edited || post.created_at,
        updatedAt: post.updated_at || post.last_edited || post.created_at,
        purges: post.purge_count || 0,
        likes: 0,
        dislikes: 0,
        visibility: post.visibility || 'public',
        comments: commentCount,
        comment_count: commentCount,
        images,
        user: {
          id: post.user_id,
          name,
          username,
          avatar,
          certificationSlug: prof?.certification_slug || null,
          logoCertified: Boolean(prof?.logo_certified),
        },
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching posts:', error);
    // Return empty array instead of 503 to prevent frontend errors
    res.json([]);
  }
});

// --- GET /api/posts/purges/my-activity ---
// Get purges the user has given and received
router.get('/purges/my-activity', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Fetch purges given by the user (purges they made on other people's posts)
    const purgesGiven = await PostPurge.findAll({
      where: { user_id: userId },
      attributes: ['id', 'post_id', 'user_id', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // Fetch posts that the user authored to find purges received
    const userPosts = await sequelize.query(
      `SELECT id FROM posts WHERE user_id = ?`,
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    const userPostIds = (userPosts as any[]).map((p: any) => p.id);

    // Fetch purges on user's posts (purges received)
    let purgesReceived: any[] = [];
    if (userPostIds.length > 0) {
      purgesReceived = await PostPurge.findAll({
        where: {
          post_id: userPostIds,
          user_id: { [require('sequelize').Op.ne]: userId } // Exclude self-purges if any
        },
        attributes: ['id', 'post_id', 'user_id', 'created_at'],
        order: [['created_at', 'DESC']]
      });
    }

    // Get post details for purges given
    const givenPostIds = Array.from(new Set((purgesGiven || []).map((p: any) => p.post_id).filter(Boolean)));
    const postsGivenMap = new Map();
    if (givenPostIds.length > 0) {
      const postsData = await sequelize.query(
        `SELECT id, content, created_at, user_id FROM posts WHERE id = ANY($1)`,
        {
          replacements: [givenPostIds],
          type: QueryTypes.SELECT
        }
      );
      (postsData as any[]).forEach((p: any) => postsGivenMap.set(p.id, p));
    }

    // Get user IDs for profiles
    const givenUserIds = Array.from(new Set(
      (purgesGiven || []).map((p: any) => postsGivenMap.get(p.post_id)?.user_id).filter(Boolean)
    ));
    const receivedUserIds = Array.from(new Set((purgesReceived || []).map(p => p.user_id).filter(Boolean)));
    const allUserIds = Array.from(new Set([...givenUserIds, ...receivedUserIds]));

    // Fetch profile information for all users
    const profileMap = new Map();
    if (allUserIds.length > 0) {
      const profiles = await Profile.findAll({
        where: { id: allUserIds },
        attributes: ['id', 'full_name', 'username', 'avatar_url']
      });

      profiles.forEach((profile: any) => {
        profileMap.set(profile.id, {
          id: profile.id,
          name: profile.full_name,
          username: profile.username,
          avatar: normalizeImageUrl(profile.avatar_url)
        });
      });
    }

    // Format purges given with profile info
    const formattedPurgesGiven = (purgesGiven || []).map((purge: any) => {
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

    const [postResults] = await sequelize.query(
      `SELECT * FROM posts WHERE id = ? LIMIT 1`,
      {
        replacements: [postId],
        type: QueryTypes.SELECT
      }
    );
    const post = (postResults as any)[0];

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [profile, userRow, commentCount] = await Promise.all([
      Profile.findByPk((post as any).user_id),
      User.findByPk((post as any).user_id),
      Comment.count({ where: { post_id: postId } })
    ]);

    const avatar = normalizeImageUrl(profile?.avatar_url || userRow?.avatar || '');
    const images = parseMediaUrls((post as any).media_url)
      .map((url) => normalizeImageUrl(url))
      .filter(Boolean);

    res.json({
      id: post.id,
      user_id: (post as any).user_id,
      content: (post as any).content,
      media_url: (post as any).media_url,
      created_at: (post as any).created_at,
      createdAt: (post as any).created_at,
      updated_at: (post as any).updated_at || (post as any).last_edited || (post as any).created_at,
      updatedAt: (post as any).updated_at || (post as any).last_edited || (post as any).created_at,
      images,
      comments: commentCount || 0,
      comment_count: commentCount || 0,
      user: {
        id: (post as any).user_id,
        name: profile?.full_name || userRow?.name || 'User',
        username: profile?.username || userRow?.username || 'user',
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

    const [postResults] = await sequelize.query(
      `SELECT * FROM posts WHERE id = ? LIMIT 1`,
      {
        replacements: [postId],
        type: QueryTypes.SELECT
      }
    );
    const post = (postResults as any)[0];

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const targetUserId = (post as any).user_id;
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

    // Check if already purged
    const existingPurge = await PostPurge.findOne({
      where: {
        post_id: postId,
        user_id: userId
      }
    });

    if (existingPurge) {
      return res.status(400).json({
        error: 'Already purged this post',
        code: 'ALREADY_PURGED',
      });
    }

    // Insert purge record
    await PostPurge.create({
      post_id: postId,
      user_id: userId,
      created_at: new Date()
    });

    // Count total purges for this post
    const totalPurges = await PostPurge.count({
      where: { post_id: postId }
    });

    // Update post purge count
    await Post.update(
      { purge_count: totalPurges },
      { where: { id: postId } }
    );

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
    const existingPuurga = await Reaction.findOne({
      where: {
        post_id: postId,
        user_id: userId,
        type: 'puurga'
      }
    });

    let puurged = false;
    let totalPuurgas = 0;

    if (existingPuurga) {
      // Remove puurga
      await Reaction.destroy({
        where: { id: (existingPuurga as any).id }
      });
      puurged = false;
    } else {
      // Add puurga
      await Reaction.create({
        post_id: postId,
        user_id: userId,
        type: 'puurga',
        created_at: new Date()
      });
      puurged = true;
    }

    // Get total puurga count for this post
    totalPuurgas = await Reaction.count({
      where: {
        post_id: postId,
        type: 'puurga'
      }
    });

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
    const [editPostResults] = await sequelize.query(
      `SELECT id, user_id FROM posts WHERE id = ? LIMIT 1`,
      {
        replacements: [postId],
        type: QueryTypes.SELECT
      }
    );
    const existingPost = (editPostResults as any)[0];

    if (!existingPost) {
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
    await Post.update(updateData, { where: { id: postId } });
    const [postResults2] = await sequelize.query(
      `SELECT * FROM posts WHERE id = ? LIMIT 1`,
      {
        replacements: [postId],
        type: QueryTypes.SELECT
      }
    );
    const updatedPost = (postResults2 as any)[0];

    if (!updatedPost) {
      return res.status(500).json({ error: 'Failed to update post' });
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
    const [editPostResults] = await sequelize.query(
      `SELECT id, user_id FROM posts WHERE id = ? LIMIT 1`,
      {
        replacements: [postId],
        type: QueryTypes.SELECT
      }
    );
    const existingPost = (editPostResults as any)[0];

    if (!existingPost) {
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
    await Reaction.destroy({ where: { post_id: postId } });

    // Delete related purges
    await PostPurge.destroy({ where: { post_id: postId } });

    // Delete the post
    await Post.destroy({ where: { id: postId } });

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
    const existingReaction = await Reaction.findOne({
      where: { post_id: postId, user_id: userId }
    });

    if (existingReaction) {
      // If same type, remove it (toggle off)
      if (existingReaction.type === type) {
        await Reaction.destroy({ where: { id: existingReaction.id } });
      } else {
        // Different type, update it
        await Reaction.update({ type }, { where: { id: existingReaction.id } });
      }
    } else {
      // No existing reaction, create new one
      await Reaction.create({
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
          const [postResults3] = await sequelize.query(
            `SELECT user_id FROM posts WHERE id = ? LIMIT 1`,
            {
              replacements: [postId],
              type: QueryTypes.SELECT
            }
          );
          const post = (postResults3 as any)[0];
          if (!post) {
            console.warn('Post not found for like credit');
          } else if (post.user_id && post.user_id !== userId) {
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
    const allReactions = await Reaction.findAll({
      where: { post_id: postId },
      attributes: ['type', 'user_id']
    });

    // Get user profiles for all reactors
    const userIds = Array.from(new Set((allReactions || []).map((r: any) => r.user_id)));
    const profiles = await Profile.findAll({
      where: { id: userIds },
      attributes: ['id', 'full_name', 'username', 'avatar_url']
    });

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    // Group reactions by type
    const reactionsByType: { [key: string]: { count: number; users: any[] } } = {};

    (allReactions || []).forEach((reaction: any) => {
      if (!reactionsByType[reaction.type]) {
        reactionsByType[reaction.type] = { count: 0, users: [] };
      }
      reactionsByType[reaction.type].count++;

      const profile = profileMap.get(reaction.user_id);
      if (profile) {
        reactionsByType[reaction.type].users.push({
          id: (profile as any).id,
          name: (profile as any).full_name || 'Unknown User',
          username: (profile as any).username || 'unknown',
          avatar: normalizeImageUrl((profile as any).avatar_url) || ''
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
