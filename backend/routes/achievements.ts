import express from 'express';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { AchievementService } from '../services/achievementService';
import { DailyMissionService } from '../services/dailyMissionService';

const router = express.Router();

// ─── Achievements ────────────────────────────────────────────────────────────

/**
 * GET /api/achievements
 * List all achievements with user's unlock status.
 */
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { all, unlocked } = await AchievementService.getUserAchievements(userId);

    const achievements = all.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      xp_reward: a.xp_reward,
      unlocked: unlocked.includes(a.id),
    }));

    res.json({ achievements, total: all.length, unlockedCount: unlocked.length });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/achievements/progress
 * Get achievement progress summary.
 */
router.get('/progress', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const progress = await AchievementService.getProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * GET /api/achievements/check
 * Check and award any newly-earned achievements.
 */
router.get('/check', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const newlyUnlocked = await AchievementService.checkAndAward(userId);
    res.json({
      newlyUnlocked: newlyUnlocked.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        xpReward: a.xp_reward,
      })),
      count: newlyUnlocked.length,
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

/**
 * GET /api/achievements/leaderboard
 * Achievement leaderboard.
 */
router.get('/leaderboard', auth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await AchievementService.getLeaderboard(limit);
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching achievement leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/achievements/user/:userId
 * Get achievements for a specific user (public profile).
 */
router.get('/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { all, unlocked } = await AchievementService.getUserAchievements(userId);

    const achievements = all
      .filter(a => unlocked.includes(a.id))
      .map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        xp_reward: a.xp_reward,
      }));

    res.json({ achievements, count: achievements.length });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
});

// ─── Daily Missions ──────────────────────────────────────────────────────────

/**
 * GET /api/achievements/missions
 * Get today's daily missions for the current user.
 */
router.get('/missions', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const missions = await DailyMissionService.getTodaysMissions(userId);
    res.json({ missions });
  } catch (error) {
    console.error('Error fetching daily missions:', error);
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

/**
 * POST /api/achievements/missions/claim/:missionId
 * Claim reward for a completed daily mission.
 */
router.post('/missions/claim/:missionId', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { missionId } = req.params;
    const result = await DailyMissionService.claimReward(userId, missionId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, xpAwarded: result.xpAwarded });
  } catch (error) {
    console.error('Error claiming mission reward:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

/**
 * GET /api/achievements/missions/stats
 * Get daily mission stats.
 */
router.get('/missions/stats', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const stats = await DailyMissionService.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching mission stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/achievements/missions/track
 * Track progress for a mission type (internal use).
 */
router.post('/missions/track', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type, increment } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Missing mission type' });
    }

    const updated = await DailyMissionService.trackProgress(userId, type, increment || 1);
    res.json({ updated, count: updated.length });
  } catch (error) {
    console.error('Error tracking mission progress:', error);
    res.status(500).json({ error: 'Failed to track progress' });
  }
});

export default router;
