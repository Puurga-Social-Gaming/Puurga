import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { SurvivalEngine, ReputationEngine, InactivityEngine, PurgeEngine } from '../services/survival';
import { wsManager } from '../websocketManager';

const router = express.Router();

router.get('/state', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    let state = await SurvivalEngine.getState(userId);

    if (!state) {
      // New accounts / missing trigger rows — create SAFE defaults
      state = await SurvivalEngine.ensureState(userId);
    }

    if (!state) {
      return res.status(500).json({ error: 'Failed to initialize survival state' });
    }

    res.json(state);
  } catch (error) {
    console.error('Error fetching survival state:', error);
    res.status(500).json({ error: 'Failed to fetch survival state' });
  }
});

router.post('/update', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const state = await SurvivalEngine.recalculate(userId);

    if (!state) {
      return res.status(500).json({ error: 'Failed to recalculate survival state' });
    }

    res.json(state);
  } catch (error) {
    console.error('Error updating survival state:', error);
    res.status(500).json({ error: 'Failed to update survival state' });
  }
});

router.get('/history', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 30;
    const history = await SurvivalEngine.getHistory(userId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching survival history:', error);
    res.status(500).json({ error: 'Failed to fetch survival history' });
  }
});

router.get('/notifications', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const notifications = await SurvivalEngine.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching survival notifications:', error);
    res.status(500).json({ error: 'Failed to fetch survival notifications' });
  }
});

router.post('/activity', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { eventType, eventValue, metadata } = req.body;

    await SurvivalEngine.recordEvent(userId, eventType, eventValue || 0, metadata);
    await InactivityEngine.recordActivity(userId);

    const state = await SurvivalEngine.recalculate(userId);

    res.json({ success: true, state });
  } catch (error) {
    console.error('Error recording survival activity:', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

router.post('/reputation/apply', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { effectKey, metadata } = req.body;

    const newScore = await ReputationEngine.applyReputationChange(userId, effectKey, metadata);
    const state = await SurvivalEngine.recalculate(userId);

    wsManager.sendToUser(userId, {
      type: 'credit_update',
      payload: {
        userId,
        credits: newScore,
        change: 0,
        source: 'reputation',
      },
    });

    res.json({ success: true, reputation_score: newScore, state });
  } catch (error) {
    console.error('Error applying reputation change:', error);
    res.status(500).json({ error: 'Failed to apply reputation change' });
  }
});

router.get('/public/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('reputation_score, survival_score, threat_level, purge_count, survived_purges, social_rank, current_survival_state, ghost_status')
      .eq('user_id', userId)
      .single();

    if (!state) {
      return res.status(404).json({ error: 'Survival state not found' });
    }

    res.json(state);
  } catch (error) {
    console.error('Error fetching public survival state:', error);
    res.status(500).json({ error: 'Failed to fetch public survival state' });
  }
});

router.get('/visibility', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const visibilityScore = await PurgeEngine.getVisibilityScore(userId);
    res.json({ visibility_score: visibilityScore });
  } catch (error) {
    console.error('Error fetching visibility:', error);
    res.status(500).json({ error: 'Failed to fetch visibility score' });
  }
});

export default router;
