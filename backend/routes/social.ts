import express from 'express';
import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import {
  areBlocked,
  getBlockedIds,
  getMutedIds,
  removeFriendship,
} from '../utils/friendRelations';
import { wsManager } from '../websocketManager';

const router = express.Router();

async function resolveProfile(userId: string) {
  const supabaseClient = requireSupabase();
  const supabaseAdminClient = requireSupabaseAdmin();
  const { data } = await supabaseClient
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .eq('id', userId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    full_name: data.full_name || 'Unknown User',
    username: data.username || 'unknown',
    avatar_url: normalizeImageUrl(data.avatar_url) || null,
  };
}

// GET /api/social/blocked
router.get('/blocked', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseClient
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }

    const profiles = await Promise.all(
      (data || []).map(async (row) => {
        const profile = await resolveProfile(row.blocked_id);
        return profile
          ? { ...profile, blocked_at: row.created_at }
          : null;
      })
    );

    res.json(profiles.filter(Boolean));
  } catch (error) {
    console.error('Error listing blocked users:', error);
    res.status(500).json({ error: 'Failed to list blocked users' });
  }
});

// GET /api/social/muted
router.get('/muted', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseClient
      .from('user_mutes')
      .select('muted_id, created_at')
      .eq('muter_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }

    const profiles = await Promise.all(
      (data || []).map(async (row) => {
        const profile = await resolveProfile(row.muted_id);
        return profile
          ? { ...profile, muted_at: row.created_at }
          : null;
      })
    );

    res.json(profiles.filter(Boolean));
  } catch (error) {
    console.error('Error listing muted users:', error);
    res.status(500).json({ error: 'Failed to list muted users' });
  }
});

// GET /api/social/status/:userId — relationship status for a profile
router.get('/status/:userId', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.userId;
    if (targetId === req.user.id) {
      return res.json({ isBlocked: false, isMuted: false, blockedByThem: false });
    }

    const [iBlockedThem, theyBlockedMe, muted] = await Promise.all([
      supabaseClient
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', req.user.id)
        .eq('blocked_id', targetId)
        .maybeSingle(),
      supabaseClient
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', targetId)
        .eq('blocked_id', req.user.id)
        .maybeSingle(),
      supabaseClient
        .from('user_mutes')
        .select('id')
        .eq('muter_id', req.user.id)
        .eq('muted_id', targetId)
        .maybeSingle(),
    ]);

    res.json({
      isBlocked: !!iBlockedThem.data,
      blockedByThem: !!theyBlockedMe.data,
      isMuted: !!muted.data,
    });
  } catch (error) {
    console.error('Error fetching social status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /api/social/block/:userId
router.post('/block/:userId', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.userId;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const profile = await resolveProfile(targetId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabaseClient.from('user_blocks').upsert(
      {
        blocker_id: req.user.id,
        blocked_id: targetId,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'blocker_id,blocked_id' }
    );

    if (error) {
      if (error.code === '42P01') {
        return res.status(503).json({ error: 'Block feature not available yet. Apply migration.' });
      }
      throw error;
    }

    // Auto-unfriend on block
    await removeFriendship(req.user.id, targetId);

    // Also remove mute if present (block supersedes)
    await supabaseClient
      .from('user_mutes')
      .delete()
      .eq('muter_id', req.user.id)
      .eq('muted_id', targetId);

    // Real-time: notify both parties so UIs can hide chats / disable actions
    try {
      wsManager.sendToUser(targetId, {
        type: 'profile_update',
        payload: {
          userId: req.user.id,
          isGhost: false,
          blockedBy: req.user.id,
          blockAction: 'blocked',
        } as any,
      });
      wsManager.sendToUser(req.user.id, {
        type: 'profile_update',
        payload: {
          userId: targetId,
          isGhost: false,
          blockedUserId: targetId,
          blockAction: 'blocked',
        } as any,
      });
    } catch (wsErr) {
      console.warn('Block WebSocket notify failed:', wsErr);
    }

    res.json({ success: true, blocked: profile });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/social/block/:userId
router.delete('/block/:userId', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.userId;

    const { error } = await supabaseClient
      .from('user_blocks')
      .delete()
      .eq('blocker_id', req.user.id)
      .eq('blocked_id', targetId);

    if (error && error.code !== '42P01') throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// POST /api/social/mute/:userId
router.post('/mute/:userId', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.userId;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot mute yourself' });
    }

    const profile = await resolveProfile(targetId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (await areBlocked(req.user.id, targetId)) {
      return res.status(400).json({ error: 'User is blocked; unmute/block management is separate' });
    }

    const { error } = await supabaseClient.from('user_mutes').upsert(
      {
        muter_id: req.user.id,
        muted_id: targetId,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'muter_id,muted_id' }
    );

    if (error) {
      if (error.code === '42P01') {
        return res.status(503).json({ error: 'Mute feature not available yet. Apply migration.' });
      }
      throw error;
    }

    res.json({ success: true, muted: profile });
  } catch (error) {
    console.error('Error muting user:', error);
    res.status(500).json({ error: 'Failed to mute user' });
  }
});

// DELETE /api/social/mute/:userId
router.delete('/mute/:userId', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.userId;

    const { error } = await supabaseClient
      .from('user_mutes')
      .delete()
      .eq('muter_id', req.user.id)
      .eq('muted_id', targetId);

    if (error && error.code !== '42P01') throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error unmuting user:', error);
    res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// Helpers exported for other routes via re-export pattern
export { getBlockedIds, getMutedIds, areBlocked };

export default router;
