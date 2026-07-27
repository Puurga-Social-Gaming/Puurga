import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';
import { createNotification } from './createNotification';
import { CreditService } from '../services/creditService';
import { areFriends } from '../utils/friendRelations';

const router = express.Router();

const TRANSFER_MIN = 1;
const TRANSFER_MAX = 500;
const TRANSFER_COOLDOWN_MS = 60_000;
const lastTransferAt = new Map<string, number>();

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

// GET /api/credits/transactions - Paginated transaction history
router.get('/transactions', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const type = req.query.type as string | undefined;
    const source = req.query.source as string | undefined;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('credit_transactions')
      .select('id, amount, type, source, description, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (type === 'earn' || type === 'penalty') {
      query = query.eq('type', type);
    }
    if (source && typeof source === 'string') {
      query = query.eq('source', source);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === '42P01') {
        return res.json({ transactions: [], page, limit, total: 0, hasMore: false });
      }
      console.error('Error fetching credit transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    const total = count ?? 0;
    res.json({
      transactions: data || [],
      page,
      limit,
      total,
      hasMore: from + (data?.length || 0) < total,
    });
  } catch (error) {
    console.error('Error in credit transactions route:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
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

// GET /api/credits/packages — in-app packages (no Stripe)
router.get('/packages', auth, async (_req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('id, slug, title, description, cost, reward_label, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error listing packages:', error);
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

// POST /api/credits/packages/:slug/redeem — spend points on an in-app package
router.post('/packages/:slug/redeem', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { slug } = req.params;

    const { data: pkg, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (error || !pkg) return res.status(404).json({ error: 'Package not found' });

    const deducted = await CreditService.deductCredits(
      userId,
      pkg.cost,
      'package',
      `Redeemed package: ${pkg.title}`
    );
    if (!deducted.success) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    res.json({
      success: true,
      package: pkg,
      newBalance: deducted.newBalance,
      reward: pkg.reward_label,
    });
  } catch (error) {
    console.error('Error redeeming package:', error);
    res.status(500).json({ error: 'Failed to redeem package' });
  }
});

// POST /api/credits/transfer — P2P transfer (friends only)
router.post('/transfer', auth, async (req: AuthRequest, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, amount, note } = req.body || {};

    if (!toUserId || typeof toUserId !== 'string') {
      return res.status(400).json({ error: 'toUserId is required' });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt < TRANSFER_MIN || amt > TRANSFER_MAX) {
      return res.status(400).json({
        error: `Amount must be an integer between ${TRANSFER_MIN} and ${TRANSFER_MAX}`,
      });
    }

    const last = lastTransferAt.get(fromUserId) || 0;
    if (Date.now() - last < TRANSFER_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Please wait before sending another transfer' });
    }

    if (!(await areFriends(fromUserId, toUserId))) {
      return res.status(403).json({ error: 'You can only transfer credits to friends' });
    }

    const deducted = await CreditService.deductCredits(
      fromUserId,
      amt,
      'transfer',
      note || `Transfer to ${toUserId}`
    );
    if (!deducted.success) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    const awarded = await CreditService.awardCredits(
      toUserId,
      amt,
      'transfer',
      note || `Transfer from ${fromUserId}`
    );

    const { data: transfer, error: transferErr } = await supabase
      .from('credit_transfers')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: amt,
        note: typeof note === 'string' ? note.slice(0, 200) : null,
      })
      .select()
      .single();

    if (transferErr && transferErr.code !== '42P01') {
      console.warn('credit_transfers insert:', transferErr.message);
    }

    lastTransferAt.set(fromUserId, Date.now());

    await createNotification({
      type: 'reward_reminder',
      senderId: fromUserId,
      receiverId: toUserId,
    }).catch(() => undefined);

    res.json({
      success: true,
      transfer: transfer || { from_user_id: fromUserId, to_user_id: toUserId, amount: amt },
      newBalance: deducted.newBalance,
      recipientBalance: awarded.newBalance,
    });
  } catch (error) {
    console.error('Error transferring credits:', error);
    res.status(500).json({ error: 'Failed to transfer credits' });
  }
});

// GET /api/credits/transfers — transfer history for current user
router.get('/transfers', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('credit_transfers')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error listing transfers:', error);
    res.status(500).json({ error: 'Failed to list transfers' });
  }
});

export default router;
