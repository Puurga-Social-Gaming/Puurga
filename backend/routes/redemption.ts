import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

// POST /api/redeem/:userId - Redeem a user from ghost mode using credits
router.post('/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const redeemerUserId = req.user?.id;

    if (!redeemerUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Cannot redeem yourself
    if (redeemerUserId === targetUserId) {
      return res.status(400).json({ error: 'You cannot redeem yourself' });
    }

    // Check if target user is in ghost mode
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, full_name')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!targetProfile.is_ghost) {
      return res.status(400).json({ error: 'User is not in ghost mode' });
    }

    // Check if redeemer has enough credits (need at least 100 credits to redeem)
    const { data: redeemerUser, error: redeemerError } = await supabase
      .from('users')
      .select('perga_points')
      .eq('id', redeemerUserId)
      .single();

    if (redeemerError || !redeemerUser) {
      return res.status(404).json({ error: 'Redeemer not found' });
    }

    const redemptionCost = 100;
    const currentCredits = redeemerUser.perga_points || 0;

    if (currentCredits < redemptionCost) {
      return res.status(400).json({ 
        error: 'Insufficient credits',
        required: redemptionCost,
        current: currentCredits
      });
    }

    // Deduct credits from redeemer
    const { error: deductError } = await supabase
      .from('users')
      .update({ 
        perga_points: currentCredits - redemptionCost,
        updated_at: new Date().toISOString()
      })
      .eq('id', redeemerUserId);

    if (deductError) {
      throw deductError;
    }

    // Remove ghost mode from target user
    const { error: restoreError } = await supabase
      .from('profiles')
      .update({ 
        is_ghost: false,
        purge_count: 0,
        ghosted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    if (restoreError) {
      // Rollback credit deduction
      await supabase
        .from('users')
        .update({ perga_points: currentCredits })
        .eq('id', redeemerUserId);
      throw restoreError;
    }

    // Clear all purges for the target user
    await supabase
      .from('purges')
      .delete()
      .eq('target_user_id', targetUserId);

    // Log the redemption
    await supabase
      .from('redemptions')
      .insert({
        redeemer_id: redeemerUserId,
        redeemed_user_id: targetUserId,
        credits_spent: redemptionCost,
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      message: `Successfully redeemed ${targetProfile.full_name || 'user'} from ghost mode`,
      creditsSpent: redemptionCost,
      remainingCredits: currentCredits - redemptionCost
    });

  } catch (error) {
    console.error('Error redeeming user:', error);
    res.status(500).json({ error: 'Failed to redeem user' });
  }
});

// GET /api/redeem/status/:userId - Check if a user is in ghost mode
router.get('/status/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, ghosted_at, full_name')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isGhost: profile.is_ghost || false,
      purgeCount: profile.purge_count || 0,
      ghostedAt: profile.ghosted_at,
      userName: profile.full_name,
      redemptionCost: 100
    });

  } catch (error) {
    console.error('Error checking ghost status:', error);
    res.status(500).json({ error: 'Failed to check ghost status' });
  }
});

export default router;
