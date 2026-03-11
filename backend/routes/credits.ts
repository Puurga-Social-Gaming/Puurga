import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';
import { createNotification } from './createNotification';

const router = express.Router();

// GET /api/credits - Get user's credit balance
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('purga_points, credits, purge_streak')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching credits:', error);
      return res.status(500).json({ error: 'Failed to fetch credits' });
    }

    // Prefer purga_points, fallback to legacy credits
    res.json({
      credits: Number(profile?.purga_points ?? profile?.credits ?? 0),
      purgeStreak: profile?.purge_streak || 0
    });
  } catch (error) {
    console.error('Error in credits route:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

// POST /api/credits/update - Update user's credit balance
router.post('/update', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { credits } = req.body;

    if (typeof credits !== 'number' || credits < 0) {
      return res.status(400).json({ error: 'Invalid credits value' });
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ purga_points: credits, credits: credits, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('purga_points, credits')
      .single();

    if (error) {
      console.error('Error updating credits:', error);
      return res.status(500).json({ error: 'Failed to update credits' });
    }

    const finalCredits = Number(updatedProfile?.purga_points ?? updatedProfile?.credits ?? credits);

    // Emit credit update via WebSocket
    wsManager.sendToUser(userId, {
      type: 'credit_update',
      payload: { userId, credits: finalCredits }
    });

    res.json({
      success: true,
      credits: finalCredits
    });
  } catch (error) {
    console.error('Error in credits update route:', error);
    res.status(500).json({ error: 'Failed to update credits' });
  }
});

// POST /api/credits/activity - Track redemption activity
router.post('/activity', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { ghostUserId, activityType } = req.body;

    if (!ghostUserId || !activityType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate activity type
    const validTypes = ['game_play', 'group_chat', 'post', 'purge'];
    if (!validTypes.includes(activityType)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    // Check if ghost user is actually in ghost mode
    const { data: ghostProfile, error: ghostError } = await supabase
      .from('profiles')
      .select('is_ghost')
      .eq('id', ghostUserId)
      .single();

    if (ghostError || !ghostProfile?.is_ghost) {
      return res.status(400).json({ error: 'User is not in ghost mode' });
    }

    // Record the activity
    const { error: insertError } = await supabase
      .from('redemption_activities')
      .insert({
        ghost_user_id: ghostUserId,
        helper_user_id: userId,
        activity_type: activityType,
        points_earned: 1,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error recording activity:', insertError);
      return res.status(500).json({ error: 'Failed to record activity' });
    }

    // Create notification for the ghost user
    await createNotification({
      type: 'redemption_contribution',
      senderId: userId,
      receiverId: ghostUserId
    });

    // Get total redemption progress
    const { data: activities, error: countError } = await supabase
      .from('redemption_activities')
      .select('*', { count: 'exact' })
      .eq('ghost_user_id', ghostUserId);

    const totalPoints = activities?.length || 0;

    res.json({
      success: true,
      totalPoints,
      message: `Activity recorded. ${totalPoints}/100 points towards redemption`
    });
  } catch (error) {
    console.error('Error in activity route:', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

export default router;
