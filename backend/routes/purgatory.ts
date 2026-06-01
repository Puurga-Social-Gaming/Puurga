import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { PurgatoryEngine } from '../services/survival/purgatory-engine';
import { CreditService } from '../services/creditService';

const router = express.Router();

router.get('/status', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const status = await PurgatoryEngine.getStatus(userId);

    if (!status) {
      return res.status(404).json({ error: 'Purgatory status not found' });
    }

    const progress = await PurgatoryEngine.calculateRedemptionProgress(userId);

    res.json({ ...status, progressBreakdown: progress });
  } catch (error) {
    console.error('Error fetching purgatory status:', error);
    res.status(500).json({ error: 'Failed to fetch purgatory status' });
  }
});

router.post('/request-redemption', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const result = await PurgatoryEngine.requestRedemption(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error requesting redemption:', error);
    res.status(500).json({ error: 'Failed to request redemption' });
  }
});

router.get('/requests', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, purga_points')
      .eq('id', userId)
      .single();

    const credits = Number(profile?.credits ?? profile?.purga_points ?? 0);

    if (credits < 100) {
      return res.status(403).json({
        error: 'Insufficient credits',
        message: 'You need at least 100 credits to view and support redemption requests.',
        credits,
        creditsNeeded: 100 - credits,
      });
    }

    const requests = await PurgatoryEngine.getPendingRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching redemption requests:', error);
    res.status(500).json({ error: 'Failed to fetch redemption requests' });
  }
});

router.post('/approve-request/:id', auth, async (req: AuthRequest, res) => {
  try {
    const requestId = req.params.id;
    const supporterId = req.user.id;

    const result = await PurgatoryEngine.approveRequest(requestId, supporterId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error approving redemption request:', error);
    res.status(500).json({ error: 'Failed to approve redemption request' });
  }
});

router.get('/history', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const history = await PurgatoryEngine.getHistory(userId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching purgatory history:', error);
    res.status(500).json({ error: 'Failed to fetch purgatory history' });
  }
});

export default router;
