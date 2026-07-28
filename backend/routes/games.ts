import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { ChallengeService, CHALLENGE_STAKE_PRESETS } from '../services/challengeService';
import { NotificationService } from '../services/notificationService';
import { CreditService } from '../services/creditService';
import { progressionEngine } from '../services/progressionEngine';
import { DailyMissionService } from '../services/dailyMissionService';

// ─── Server-side Game Validation Config ─────────────────────
// Score bounds + rate limiting to prevent cheating

interface GameValidationConfig {
  maxScore: number;
  minTimeMs: number;
  maxPerMinute: number;
}

const GAME_VALIDATORS: Record<string, GameValidationConfig> = {
  SWORD_OF_JUDGMENT: { maxScore: 50000, minTimeMs: 30000, maxPerMinute: 2 },
  PATH_OF_WATCHMAN: { maxScore: 100000, minTimeMs: 30000, maxPerMinute: 2 },
  REDEMPTION: { maxScore: 3000, minTimeMs: 60000, maxPerMinute: 1 },
  PURGA_RIFT: { maxScore: 10000, minTimeMs: 30000, maxPerMinute: 2 },
  CYBER_RUNNER: { maxScore: 500000, minTimeMs: 20000, maxPerMinute: 2 },
};

// In-memory rate limiter (per userId, per game)
const gameCompletions = new Map<string, number[]>();

// Game economy config (server-side mirror of src/constants/GameEconomy.ts)
const GAME_ECONOMY_SERVER: Record<string, {
  scoreToCreditsRatio: number;
  completion: number;
  win: number;
  perfectScore: number;
  penalties: Record<string, number>;
}> = {
  SWORD_OF_JUDGMENT: {
    scoreToCreditsRatio: 0.1,
    completion: 15,
    win: 25,
    perfectScore: 75,
    penalties: { corruption: 10, missedTarget: 2 },
  },
  PATH_OF_WATCHMAN: {
    scoreToCreditsRatio: 0.08,
    completion: 20,
    win: 50,
    perfectScore: 0,
    penalties: { corruption: 5 },
  },
  REDEMPTION: {
    scoreToCreditsRatio: 1.0,
    completion: 20,
    win: 0,
    perfectScore: 50,
    penalties: { wrongAnswer: 5 },
  },
  PURGA_RIFT: {
    scoreToCreditsRatio: 0.12,
    completion: 25,
    win: 40,
    perfectScore: 80,
    penalties: { wrongAnswer: 8 },
  },
  CYBER_RUNNER: {
    scoreToCreditsRatio: 0.1,
    completion: 20,
    win: 35,
    perfectScore: 70,
    penalties: { missedTarget: 3, corruption: 5 },
  },
};

function calculateServerReward(
  gameId: string,
  score: number,
  isWin: boolean,
  isPerfect: boolean,
  metadata?: Record<string, unknown>
): { credits: number; isWin: boolean; isPerfect: boolean } {
  const rules = GAME_ECONOMY_SERVER[gameId];
  if (!rules) {
    // Unknown game — conservative default
    return { credits: Math.min(10, Math.floor(score * 0.05)), isWin, isPerfect };
  }

  let earned = Math.floor(score * rules.scoreToCreditsRatio);
  earned += rules.completion;
  if (isWin && rules.win) earned += rules.win;
  if (isPerfect && rules.perfectScore) earned += rules.perfectScore;

  // Apply penalties from metadata
  if (rules.penalties && metadata) {
    for (const [key, penalty] of Object.entries(rules.penalties)) {
      const hits = Number(metadata[key]) || 0;
      earned -= penalty * hits;
    }
  }

  return { credits: Math.max(0, earned), isWin, isPerfect };
}

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

// ─── Server-Validated Game Finish ───────────────────────────

router.post('/finish', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;
    const { gameId, score, timePlayed, isWin, isPerfect, metadata } = req.body || {};

    // 1. Validate required fields
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'gameId is required' });
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return res.status(400).json({ error: 'score must be a number' });
    }

    // 2. Validate game exists
    const validator = GAME_VALIDATORS[gameId];
    if (!validator) {
      return res.status(400).json({ error: `Unknown game: ${gameId}` });
    }

    // 3. Validate score bounds
    const floorScore = Math.max(0, Math.floor(score));
    if (floorScore > validator.maxScore) {
      console.warn(`Game finish: Score ${floorScore} exceeds max ${validator.maxScore} for ${gameId} by user ${userId}`);
      return res.status(400).json({ error: 'Score exceeds maximum allowed' });
    }

    // 4. Validate time played
    if (typeof timePlayed === 'number' && timePlayed < validator.minTimeMs) {
      console.warn(`Game finish: Time ${timePlayed}ms below minimum ${validator.minTimeMs}ms for ${gameId} by user ${userId}`);
      return res.status(400).json({ error: 'Completion time too fast' });
    }

    // 5. Rate limit: max N games per minute
    const now = Date.now();
    const rateKey = `${userId}:${gameId}`;
    const recent = (gameCompletions.get(rateKey) || []).filter(t => now - t < 60000);
    if (recent.length >= validator.maxPerMinute) {
      return res.status(429).json({ error: 'Too many games completed. Please wait.' });
    }
    recent.push(now);
    gameCompletions.set(rateKey, recent);

    // 6. Calculate rewards server-side
    const reward = calculateServerReward(
      gameId,
      floorScore,
      Boolean(isWin),
      Boolean(isPerfect),
      metadata
    );

    // 7. Award credits via CreditService
    let newBalance = 0;
    if (reward.credits > 0) {
      const result = await CreditService.awardCredits(
        userId,
        reward.credits,
        'game',
        `${gameId} completed (score: ${floorScore})`
      );
      newBalance = result.newBalance;
    } else {
      newBalance = await CreditService.getCredits(userId);
    }

    // 8. Record game session
    try {
      await supabase.from('game_sessions').insert({
        user_id: userId,
        game_id: gameId,
        score: floorScore,
        points_earned: reward.credits,
        created_at: new Date().toISOString(),
      });
    } catch {
      // table may not exist — non-fatal
    }

    // 9. Notify friends (non-blocking)
    NotificationService.gameActivity(userId, {
      gameId,
      gameName: gameId,
      score: floorScore,
      pointsEarned: reward.credits || undefined,
      isHighScore: false,
    }).catch(() => {});

    // Emit progression event (XP for game completion)
    progressionEngine.safeEmit('GameFinished', {
      userId,
      gameId,
      score: floorScore,
      isWin: reward.isWin,
      isPerfect: reward.isPerfect,
    });

    // Track daily mission progress
    DailyMissionService.trackProgress(userId, 'play_game').catch(() => {});
    if (reward.isWin) {
      DailyMissionService.trackProgress(userId, 'win_game').catch(() => {});
    }

    // 10. Return validated result
    res.json({
      success: true,
      creditsAwarded: reward.credits,
      newBalance,
      score: floorScore,
      isWin: reward.isWin,
      isPerfect: reward.isPerfect,
    });
  } catch (error) {
    console.error('Error in game finish:', error);
    res.status(500).json({ error: 'Failed to process game completion' });
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
