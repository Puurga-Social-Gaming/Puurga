import express from 'express';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { generateZegoToken04 } from '../utils/zegoToken';
import { areBlocked } from '../utils/friendRelations';

const router = express.Router();

function getZegoCredentials(): { appId: number; serverSecret: string } | null {
  const isProd = process.env.NODE_ENV === 'production';
  const appIdRaw = process.env.ZEGO_APP_ID || (!isProd ? process.env.VITE_ZEGO_APP_ID : '') || '';
  const serverSecret =
    process.env.ZEGO_SERVER_SECRET || (!isProd ? process.env.VITE_ZEGO_SERVER_SECRET : '') || '';

  const appId = Number(appIdRaw);
  if (!appId || !serverSecret || serverSecret.length !== 32) {
    return null;
  }
  return { appId, serverSecret };
}

// POST /api/calls/token — mint a Zego Token04 for the authenticated user
router.post('/token', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roomId, userName, targetUserId } = req.body || {};
    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ error: 'roomId is required' });
    }

    // Optional peer check — block calls between blocked users
    if (targetUserId && typeof targetUserId === 'string') {
      if (await areBlocked(req.user.id, targetUserId)) {
        return res.status(403).json({
          error: 'Cannot call this user due to a block',
          code: 'USER_BLOCKED',
        });
      }
    }

    const creds = getZegoCredentials();
    if (!creds) {
      return res.status(503).json({
        error: 'Video calls are not configured. Set ZEGO_APP_ID and ZEGO_SERVER_SECRET on the server.',
        code: 'ZEGO_NOT_CONFIGURED',
      });
    }

    const token = generateZegoToken04(
      creds.appId,
      req.user.id,
      creds.serverSecret,
      3600
    );

    res.json({
      token,
      appID: creds.appId,
      roomId,
      userId: req.user.id,
      userName: userName || req.user.username || req.user.id,
    });
  } catch (error: any) {
    console.error('Error generating Zego token:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate call token' });
  }
});

// GET /api/calls/status — whether calls are configured (no secrets)
router.get('/status', auth, async (_req: AuthRequest, res) => {
  const creds = getZegoCredentials();
  res.json({
    configured: !!creds,
    message: creds
      ? 'Call service ready'
      : 'Set ZEGO_APP_ID and ZEGO_SERVER_SECRET on the server',
  });
});

// POST /api/calls/end — mark invite as ended / missed
router.post('/end', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { roomId, status } = req.body || {};
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const finalStatus = ['ended', 'missed', 'cancelled', 'declined'].includes(status)
      ? status
      : 'ended';

    const { supabase } = await import('../config/supabase');
    await supabase
      .from('call_invites')
      .update({ status: finalStatus, ended_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .in('status', ['pending', 'accepted']);

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

export default router;
