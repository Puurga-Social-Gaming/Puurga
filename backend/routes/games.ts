import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { ChallengeService, CHALLENGE_STAKE_PRESETS } from '../services/challengeService';
import { NotificationService } from '../services/notificationService';
import { CreditService } from '../services/creditService';

const router = express.Router();

function httpError(res: express.Response, err: any) {
  const status = Number(err?.status) || 500;
  const message =
    (typeof err?.message === 'string' && err.message) ||
    (typeof err?.error === 'string' && err.error) ||
    (typeof err?.details === 'string' && err.details) ||
    'Request failed';
  res.status(status).json({
    error: message,
    code: err?.code,
    balance: err?.balance,
    stake: err?.stake,
    hint: err?.hint,
  });
}

// ─── Presence ───────────────────────────────────────────────

router.post('/presence', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { gameId, gameTitle } = req.body || {};
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const presence = await ChallengeService.setPresence(req.user.id, gameId, gameTitle);
    res.json(presence);
  } catch (err) {
    console.error('presence set:', err);
    httpError(res, err);
  }
});

router.patch('/presence/heartbeat', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await ChallengeService.heartbeat(req.user.id);
    res.json({ success: true });
  } catch (err) {
    httpError(res, err);
  }
});

router.delete('/presence', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await ChallengeService.clearPresence(req.user.id);
    res.json({ success: true });
  } catch (err) {
    httpError(res, err);
  }
});

router.get('/presence', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const friendsOnly = req.query.friendsOnly !== 'false';
    const list = await ChallengeService.listPresence(req.user.id, friendsOnly);
    res.json(list.map((u) => ({ ...u, avatar: normalizeImageUrl(u.avatar) })));
  } catch (err) {
    console.error('presence list:', err);
    httpError(res, err);
  }
});

// Alias used by older clients
router.get('/playing', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const list = await ChallengeService.listPresence(req.user.id, true);
    res.json(
      list.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatar: normalizeImageUrl(u.avatar),
        currentGame: u.gameTitle,
        gameId: u.gameId,
        gameStartedAt: u.startedAt,
      }))
    );
  } catch (err) {
    console.error('playing:', err);
    httpError(res, err);
  }
});

// ─── Challenges ─────────────────────────────────────────────

router.get('/challenges/stakes', auth, (_req, res) => {
  res.json({ presets: CHALLENGE_STAKE_PRESETS });
});

router.post('/challenges', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { opponentId, gameId, stake, gameTitle } = req.body || {};
    if (!opponentId || !gameId || stake == null) {
      return res.status(400).json({ error: 'opponentId, gameId and stake are required' });
    }
    const challenge = await ChallengeService.createChallenge({
      challengerId: req.user.id,
      opponentId,
      gameId,
      stake: Number(stake),
      gameTitle,
    });
    res.status(201).json(challenge);
  } catch (err: any) {
    console.error('create challenge:', err?.message || err, {
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      status: err?.status,
    });
    httpError(res, err);
  }
});

router.get('/challenges', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const list = await ChallengeService.listChallenges(req.user.id, status);
    res.json(list);
  } catch (err) {
    httpError(res, err);
  }
});

router.post('/challenges/:id/accept', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const challenge = await ChallengeService.accept(req.params.id, req.user.id);
    res.json(challenge);
  } catch (err) {
    console.error('accept challenge:', err);
    httpError(res, err);
  }
});

router.post('/challenges/:id/decline', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const challenge = await ChallengeService.decline(req.params.id, req.user.id);
    res.json(challenge);
  } catch (err) {
    httpError(res, err);
  }
});

router.post('/challenges/:id/cancel', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const challenge = await ChallengeService.cancel(req.params.id, req.user.id);
    res.json(challenge);
  } catch (err) {
    httpError(res, err);
  }
});

router.post('/challenges/:id/score', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const score = Number(req.body?.score);
    const challenge = await ChallengeService.submitScore(req.params.id, req.user.id, score);
    res.json(challenge);
  } catch (err) {
    console.error('submit score:', err);
    httpError(res, err);
  }
});

router.post('/challenges/:id/finish', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { winnerId } = req.body || {};
    if (!winnerId) return res.status(400).json({ error: 'winnerId is required' });
    const challenge = await ChallengeService.finish(req.params.id, req.user.id, winnerId);
    res.json(challenge);
  } catch (err) {
    console.error('finish challenge:', err);
    httpError(res, err);
  }
});

router.get('/history', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const range = (req.query.range as 'today' | 'week' | 'month' | 'all') || 'all';
    const rows = await ChallengeService.history(req.user.id, range);
    res.json(rows);
  } catch (err) {
    httpError(res, err);
  }
});

router.get('/feed', auth, async (_req, res) => {
  try {
    const feed = await ChallengeService.liveFeed(25);
    res.json(feed);
  } catch (err) {
    httpError(res, err);
  }
});

router.get('/challenge-leaderboard', auth, async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const board = await ChallengeService.leaderboard(limit);
    res.json(board.map((r) => ({ ...r, avatar: normalizeImageUrl(r.avatar) })));
  } catch (err) {
    httpError(res, err);
  }
});

// ─── Legacy / credits leaderboard (kept) ────────────────────

router.get('/leaderboard', auth, async (req: AuthRequest, res) => {
  try {
    // Prefer challenge rankings when available
    const challengeBoard = await ChallengeService.leaderboard(10);
    if (challengeBoard.length > 0) {
      return res.json(
        challengeBoard.map((p) => ({
          id: p.userId,
          username: p.username,
          full_name: p.name,
          avatar_url: normalizeImageUrl(p.avatar),
          credits: p.totalPointsWon,
          wins: p.wins,
          losses: p.losses,
          winRate: p.winRate,
          currentStreak: p.currentStreak,
          purge_streak: p.currentStreak,
        }))
      );
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, credits, purga_points, purge_streak')
      .order('purga_points', { ascending: false })
      .limit(10);

    if (error) {
      const { data: fallback, error: fallbackErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, credits')
        .order('credits', { ascending: false })
        .limit(10);
      if (fallbackErr) throw fallbackErr;
      return res.json(
        (fallback || []).map((player) => ({
          ...player,
          credits: Number(player.credits ?? 0),
          purge_streak: 0,
          avatar_url: normalizeImageUrl(player.avatar_url),
        }))
      );
    }

    res.json(
      (data || []).map((player) => ({
        ...player,
        credits: Number(player.purga_points ?? player.credits ?? 0),
        purge_streak: Number(player.purge_streak ?? 0),
        avatar_url: normalizeImageUrl(player.avatar_url),
      }))
    );
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/stats', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const history = await ChallengeService.history(req.user.id, 'all');
    const wins = history.filter((h) => h.result === 'win').length;
    const losses = history.filter((h) => h.result === 'loss').length;
    res.json({
      gamesPlayed: history.length,
      wins,
      losses,
      totalScore: history.reduce((s, h) => s + (h.points_delta || 0), 0),
      highScore: Math.max(0, ...history.map((h) => h.score || 0), 0),
      averageScore:
        history.length > 0
          ? Math.round(history.reduce((s, h) => s + (h.score || 0), 0) / history.length)
          : 0,
      recentGames: history.slice(0, 5).map((h) => ({
        id: h.id,
        playedAt: h.played_at,
        score: h.score || 0,
        result: h.result,
        game: h.game_title,
      })),
    });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
});

/** Report a finished game session → notify friends (social competition) */
router.post('/session-complete', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;
    const {
      gameId,
      gameName,
      score,
      pointsEarned,
      isHighScore,
    } = req.body || {};

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'gameId is required' });
    }

    const points =
      typeof pointsEarned === 'number' && Number.isFinite(pointsEarned)
        ? Math.max(0, Math.floor(pointsEarned))
        : 0;

    // Soft-record high-water mark on profile if provided
    if (typeof score === 'number' && Number.isFinite(score) && score > 0) {
      try {
        await supabase.from('game_sessions').insert({
          user_id: userId,
          game_id: gameId,
          score: Math.floor(score),
          points_earned: points,
          created_at: new Date().toISOString(),
        });
      } catch {
        // table may not exist — non-fatal
      }
    }

    if (points > 0) {
      try {
        await CreditService.awardCredits(
          userId,
          points,
          'game',
          `${gameName || gameId} session`
        );
      } catch (e) {
        console.warn('session-complete credit award skipped:', e);
      }
    }

    const notified = await NotificationService.gameActivity(userId, {
      gameId,
      gameName: typeof gameName === 'string' ? gameName : gameId,
      score: typeof score === 'number' ? score : undefined,
      pointsEarned: points || undefined,
      isHighScore: Boolean(isHighScore),
    });

    res.json({
      success: true,
      notified: notified.length,
    });
  } catch (error) {
    console.error('Error in session-complete:', error);
    res.status(500).json({ error: 'Failed to record game session' });
  }
});

export default router;
