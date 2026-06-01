import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { logSuperAdminAction } from '../utils/auditLogger';
import { PURGE_THRESHOLD } from '../constants/purgeConstants';
import { CreditService } from '../services/creditService';
import { NotificationService } from '../services/notificationService';
import { validateNotGhosted } from '../middleware/restrictGhosted';

const router = express.Router();

// GET /api/posts/:postId/comments - Get all comments for a post
router.get('/posts/:postId/comments', auth, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;

    // Fetch comments for the post
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('is_purged', false)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    const safeComments = comments || [];
    if (safeComments.length === 0) {
      return res.json([]);
    }

    // Get unique user IDs
    const userIds = Array.from(new Set(safeComments.map(c => c.user_id).filter(Boolean)));

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map();
    (profiles || []).forEach(p => profileMap.set(p.id, p));

    // Map comments with user data
    const mappedComments = safeComments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at || comment.created_at,
      user: {
        id: comment.user_id,
        name: profileMap.get(comment.user_id)?.full_name || 'Unknown User',
        username: profileMap.get(comment.user_id)?.username || 'unknown',
        avatar: normalizeImageUrl(profileMap.get(comment.user_id)?.avatar_url) || '',
      },
    }));

    res.json(mappedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/posts/:postId/comments - Create a new comment
router.post('/posts/:postId/comments', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const isRestricted = await CreditService.checkRestricted(userId);
    if (isRestricted) {
      return res.status(403).json({ error: 'Account restricted. Cannot comment.' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commentError) throw commentError;

    // Award credits for comments
    const canComment = await CreditService.checkAndIncrementCommentCount(userId);
    if (canComment) {
      await CreditService.awardCredits(userId, 2, 'comment', 'Comment on post');
      
      // Award +3 to post owner
      if (post?.user_id && post.user_id !== userId) {
        await CreditService.awardCredits(post.user_id, 3, 'comment', 'Receive comment');
      }
    }

    await CreditService.updateLastActiveAt(userId);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', userId)
      .single();

    // Create notification for post owner (if not commenting on own post)
    if (post.user_id !== userId) {
      await NotificationService.comment(userId, post.user_id, postId, comment.id, content.trim());
    }

    // Return formatted comment
    res.status(201).json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.created_at,
      user: {
        id: userId,
        name: profile?.full_name || 'Unknown User',
        username: profile?.username || 'unknown',
        avatar: normalizeImageUrl(profile?.avatar_url) || '',
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// PUT /api/comments/:id - Update a comment
router.put('/comments/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    console.log('Update comment request:', { id, userId, content });

    if (!userId) {
      console.log('No user ID found');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!content || !content.trim()) {
      console.log('No content provided');
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if comment exists and belongs to user
    console.log('Fetching comment:', id);
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', id)
      .single();

    console.log('Fetch result:', { comment, fetchError });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(404).json({ error: 'Comment not found', details: fetchError.message });
    }

    if (!comment) {
      console.log('Comment not found');
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';

    if (comment.user_id !== userId && !isSuperAdmin) {
      console.log('User ID mismatch:', { commentUserId: comment.user_id, userId, role: req.user.role });
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    if (comment.user_id !== userId && isSuperAdmin) {
      await logSuperAdminAction({
        superadminId: userId,
        action: 'EDIT_COMMENT_BYPASS',
        targetId: id,
        targetType: 'comment',
        details: { original_author: comment.user_id, post_id: comment.post_id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Update the comment
    console.log('Updating comment...');
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
      })
      .eq('id', id)
      .select()
      .single();

    console.log('Update result:', { updatedComment, updateError });

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    res.json(updatedComment);
  } catch (error: any) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      error: 'Failed to update comment',
      details: error?.message || 'Unknown error'
    });
  }
});

// DELETE /api/comments/:id - Delete a comment
router.delete('/comments/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if comment exists and belongs to user
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns the comment OR owns the post
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', comment.post_id)
      .single();

    const isCommentOwner = comment.user_id === userId;
    const isPostOwner = post?.user_id === userId;

    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';

    if (!isCommentOwner && !isPostOwner && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    if (!isCommentOwner && !isPostOwner && isSuperAdmin) {
      await logSuperAdminAction({
        superadminId: userId,
        action: 'DELETE_COMMENT_BYPASS',
        targetId: id,
        targetType: 'comment',
        details: { original_author: comment.user_id, post_id: comment.post_id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/comments/:id/purge - Purge a comment
router.post('/comments/:id/purge', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get comment to find the target user
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', id)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const targetUserId = comment.user_id;

    // Check if user has already purged this comment
    const { data: existingPurge, error: checkError } = await supabase
      .from('purges')
      .select('*')
      .eq('target_type', 'comment')
      .eq('target_id', id)
      .eq('actor_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let purged = false;
    let totalPurges = 0;

    if (existingPurge) {
      // Remove purge
      const { error: deleteError } = await supabase
        .from('purges')
        .delete()
        .eq('id', existingPurge.id);

      if (deleteError) throw deleteError;
      purged = false;
    } else {
      // Add purge
      const { error: insertError } = await supabase
        .from('purges')
        .insert({
          actor_id: userId,
          target_user_id: targetUserId,
          target_type: 'comment',
          target_id: id,
          comment_id: id,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
      purged = true;
    }

    // Get total purge count for this comment
    const { data: purgeCount, error: countError } = await supabase
      .from('purges')
      .select('*', { count: 'exact' })
      .eq('target_type', 'comment')
      .eq('target_id', id);

    if (countError) throw countError;
    totalPurges = purgeCount?.length || 0;

    // Update comment purge count
    const { error: updateError } = await supabase
      .from('comments')
      .update({
        purge_count: totalPurges,
        is_purged: totalPurges >= PURGE_THRESHOLD,
        purged_at: totalPurges >= PURGE_THRESHOLD ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating comment purge count:', updateError);
    }

    // Update user's total purge count
    const { data: userPurgeCount, error: userCountError } = await supabase
      .from('purges')
      .select('*', { count: 'exact' })
      .eq('target_user_id', targetUserId);

    if (!userCountError && userPurgeCount) {
      const userTotalPurges = userPurgeCount.length;

      // Check if user should go into ghost mode (PURGE_THRESHOLD+ total purges)
      if (userTotalPurges >= PURGE_THRESHOLD) {
        await supabase
          .from('profiles')
          .update({
            is_ghost: true,
            ghosted_at: new Date().toISOString(),
            purge_count: userTotalPurges,
            ghost_status: 'ghosted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } else {
        // Update purge count and status
        const ghostStatus = userTotalPurges >= 7 ? 'warning' : 'active';
        await supabase
          .from('profiles')
          .update({
            purge_count: userTotalPurges,
            ghost_status: ghostStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      }
    }

    res.json({
      purged,
      purges: totalPurges,
      commentHidden: totalPurges >= 5,
    });
  } catch (error) {
    console.error('Error handling comment purge:', error);
    res.status(500).json({ error: 'Failed to purge comment' });
  }
});

export default router;
