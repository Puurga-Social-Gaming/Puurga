import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { AllianceEngine } from '../services/social/alliance-engine';

const router = express.Router();

router.post('/request', auth, async (req: AuthRequest, res) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const result = await AllianceEngine.requestAlliance(req.user.id, targetId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error requesting alliance:', error);
    res.status(500).json({ error: 'Failed to request alliance' });
  }
});

router.post('/accept/:id', auth, async (req: AuthRequest, res) => {
  try {
    const result = await AllianceEngine.acceptAlliance(req.params.id, req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error accepting alliance:', error);
    res.status(500).json({ error: 'Failed to accept alliance' });
  }
});

router.post('/break/:id', auth, async (req: AuthRequest, res) => {
  try {
    const result = await AllianceEngine.breakAlliance(req.params.id, req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error breaking alliance:', error);
    res.status(500).json({ error: 'Failed to break alliance' });
  }
});

router.post('/reject/:id', auth, async (req: AuthRequest, res) => {
  try {
    const result = await AllianceEngine.rejectAlliance(req.params.id, req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error rejecting alliance:', error);
    res.status(500).json({ error: 'Failed to reject alliance' });
  }
});

router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const alliances = await AllianceEngine.getAlliances(req.user.id);
    res.json(alliances);
  } catch (error) {
    console.error('Error fetching alliances:', error);
    res.status(500).json({ error: 'Failed to fetch alliances' });
  }
});

router.get('/pending', auth, async (req: AuthRequest, res) => {
  try {
    const requests = await AllianceEngine.getPendingRequests(req.user.id);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

router.post('/support/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { supportType } = req.body;
    if (!supportType || !['ENDORSEMENT', 'REPUTATION_SACRIFICE', 'VISIBILITY_SACRIFICE'].includes(supportType)) {
      return res.status(400).json({ error: 'Valid support type required (ENDORSEMENT, REPUTATION_SACRIFICE, VISIBILITY_SACRIFICE)' });
    }

    const result = await AllianceEngine.supportGhostedAlly(req.params.id, req.user.id, supportType);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error supporting ally:', error);
    res.status(500).json({ error: 'Failed to support ally' });
  }
});

router.get('/support-history/:id', auth, async (req: AuthRequest, res) => {
  try {
    const history = await AllianceEngine.getSupportHistory(req.params.id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching support history:', error);
    res.status(500).json({ error: 'Failed to fetch support history' });
  }
});

export default router;
