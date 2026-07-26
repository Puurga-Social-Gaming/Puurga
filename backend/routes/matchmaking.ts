import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';
import { normalizeImageUrl } from '../utils/url';

const router = express.Router();

async function tryMatch(gameId: string) {
  const { data: queue } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true })
    .limit(2);

  if (!queue || queue.length < 2) return null;

  const [a, b] = queue;
  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      game_id: gameId,
      player1_id: a.user_id,
      player2_id: b.user_id,
      status: 'ready',
    })
    .select()
    .single();

  if (error || !match) return null;

  await supabase.from('matchmaking_queue').delete().in('id', [a.id, b.id]);

  const [{ data: p1 }, { data: p2 }] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', a.user_id).single(),
    supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', b.user_id).single(),
  ]);

  const payloadFor = (selfId: string, opponent: any) => ({
    matchId: match.id,
    gameId,
    opponentId: opponent?.id,
    opponentUsername: opponent?.username,
    opponentName: opponent?.full_name,
    opponentAvatar: normalizeImageUrl(opponent?.avatar_url),
  });

  wsManager.sendToUser(a.user_id, {
    type: 'match_found',
    payload: payloadFor(a.user_id, p2),
  });
  wsManager.sendToUser(b.user_id, {
    type: 'match_found',
    payload: payloadFor(b.user_id, p1),
  });

  return match;
}

// POST /api/matchmaking/join
router.post('/join', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const gameId = (req.body?.gameId || 'judgment') as string;

    await supabase.from('matchmaking_queue').upsert(
      {
        user_id: userId,
        game_id: gameId,
        elo: 1000,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game_id' }
    );

    const match = await tryMatch(gameId);

    const { count } = await supabase
      .from('matchmaking_queue')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId);

    res.json({
      queued: !match,
      match: match || null,
      queueSize: count || 0,
      estimatedWaitSeconds: match ? 0 : Math.max(15, (count || 1) * 10),
    });
  } catch (error: any) {
    if (error?.code === '42P01') {
      return res.status(503).json({ error: 'Matchmaking tables missing. Apply migration.' });
    }
    console.error('matchmaking join:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// POST /api/matchmaking/leave
router.post('/leave', auth, async (req: AuthRequest, res) => {
  try {
    const gameId = (req.body?.gameId || 'judgment') as string;
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', req.user.id)
      .eq('game_id', gameId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

// GET /api/matchmaking/status
router.get('/status', auth, async (req: AuthRequest, res) => {
  try {
    const gameId = (req.query.gameId as string) || 'judgment';
    const { data: row } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('game_id', gameId)
      .maybeSingle();

    const { count } = await supabase
      .from('matchmaking_queue')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId);

    res.json({ inQueue: !!row, queueSize: count || 0, joinedAt: row?.joined_at || null });
  } catch (error) {
    res.json({ inQueue: false, queueSize: 0 });
  }
});

// GET /api/matchmaking/tournaments
router.get('/tournaments', auth, async (_req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, tournament_participants(count)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    console.error('list tournaments:', error);
    res.status(500).json({ error: 'Failed to list tournaments' });
  }
});

// POST /api/matchmaking/tournaments — create open bracket tournament
router.post('/tournaments', auth, async (req: AuthRequest, res) => {
  try {
    const { title, gameId, maxPlayers, prizeCredits } = req.body || {};
    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        title: title || 'Puurga Arena Cup',
        game_id: gameId || 'judgment',
        max_players: Math.min(16, Number(maxPlayers) || 8),
        prize_credits: Number(prizeCredits) || 100,
        created_by: req.user.id,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    if (error?.code === '42P01') {
      return res.status(503).json({ error: 'Tournaments not available. Apply migration.' });
    }
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// POST /api/matchmaking/tournaments/:id/join
router.post('/tournaments/:id/join', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { data: t } = await supabase.from('tournaments').select('*').eq('id', id).single();
    if (!t || t.status !== 'open') {
      return res.status(400).json({ error: 'Tournament not open' });
    }

    const { count } = await supabase
      .from('tournament_participants')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', id);

    if ((count || 0) >= t.max_players) {
      return res.status(400).json({ error: 'Tournament full' });
    }

    const { error } = await supabase.from('tournament_participants').upsert(
      {
        tournament_id: id,
        user_id: req.user.id,
        seed: (count || 0) + 1,
      },
      { onConflict: 'tournament_id,user_id' }
    );
    if (error) throw error;

    // Auto-lock when full
    if ((count || 0) + 1 >= t.max_players) {
      await supabase.from('tournaments').update({ status: 'locked' }).eq('id', id);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

export default router;
