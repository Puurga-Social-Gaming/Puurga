import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { PurgeEngine } from '../services/survival';

const router = express.Router();

router.post('/validate', auth, async (req: AuthRequest, res) => {
  try {
    const { postId, targetUserId } = req.body;
    const userId = req.user.id;

    if (!postId || !targetUserId) {
      return res.status(400).json({ error: 'postId and targetUserId are required' });
    }

    const validation = await PurgeEngine.validatePurge(userId, postId, targetUserId);
    res.json(validation);
  } catch (error) {
    console.error('Error validating purge:', error);
    res.status(500).json({ error: 'Failed to validate purge' });
  }
});

router.post('/execute', auth, async (req: AuthRequest, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    const purgeWeight = await PurgeEngine.calculatePurgeWeight(userId);
    const consequences = await PurgeEngine.applyConsequences(targetUserId, userId);

    res.json({
      success: true,
      ...consequences,
      purgeWeight: purgeWeight.weight,
    });
  } catch (error) {
    console.error('Error executing purge:', error);
    res.status(500).json({ error: 'Failed to execute purge' });
  }
});

router.get('/cooldowns', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const cooldowns = await PurgeEngine.getCooldowns(userId);
    res.json(cooldowns);
  } catch (error) {
    console.error('Error fetching cooldowns:', error);
    res.status(500).json({ error: 'Failed to fetch cooldowns' });
  }
});

export default router;
