import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { XPEngine } from '../services/xpEngine';
import { LEVEL_TITLES, LEVEL_THRESHOLDS } from '../services/xpEngine';

const router = express.Router();

// GET /api/progression/xp — Get current user's XP, level, title, progress
router.get('/xp', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const xpData = await XPEngine.getUserXP(userId);
    res.json(xpData);
  } catch (error) {
    console.error('Error fetching XP:', error);
    res.status(500).json({ error: 'Failed to fetch XP data' });
  }
});

// GET /api/progression/xp/history — XP transaction history
router.get('/xp/history', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const history = await XPEngine.getTransactionHistory(userId, limit);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching XP history:', error);
    res.status(500).json({ error: 'Failed to fetch XP history' });
  }
});

// GET /api/progression/level — Get level info (thresholds, titles)
router.get('/level', auth, async (_req: AuthRequest, res) => {
  try {
    res.json({
      thresholds: LEVEL_THRESHOLDS,
      titles: LEVEL_TITLES,
      maxLevel: LEVEL_TITLES.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch level info' });
  }
});

// GET /api/progression/leaderboard — XP leaderboard
router.get('/leaderboard', auth, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const type = (req.query.type as string) || 'xp';

    let orderBy: string;
    switch (type) {
      case 'level':
        orderBy = 'level';
        break;
      case 'credits':
        orderBy = 'purga_points';
        break;
      default:
        orderBy = 'xp';
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, xp, level, purga_points')
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Get current user's rank
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id')
      .order(orderBy, { ascending: false });

    const userId = req.user.id;
    const userRank = allUsers?.findIndex(u => u.id === userId) ?? -1;

    res.json({
      leaderboard: (data || []).map((user, index) => ({
        rank: index + 1,
        id: user.id,
        username: user.username,
        name: user.full_name,
        avatar: user.avatar_url,
        xp: user.xp || 0,
        level: user.level || 1,
        credits: user.purga_points || 0,
        title: LEVEL_TITLES[Math.min((user.level || 1) - 1, LEVEL_TITLES.length - 1)],
      })),
      userRank: userRank >= 0 ? userRank + 1 : null,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/progression/stats — Get user's full progression stats
router.get('/stats', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, purga_points, login_streak, last_login_date, created_at')
      .eq('id', userId)
      .single();

    const xp = Number(profile?.xp ?? 0);
    const level = Number(profile?.level ?? 1);
    const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
    const progress = XPEngine.getXPProgress(xp, level);
    const xpForNext = XPEngine.getXPForNextLevel(level);

    // Count achievements
    const { count: achievementCount } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Days since creation
    const createdAt = new Date(profile?.created_at || Date.now());
    const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / 86400000);

    res.json({
      xp,
      level,
      title,
      progress,
      xpForNext,
      credits: Number(profile?.purga_points ?? 0),
      loginStreak: Number(profile?.login_streak ?? 0),
      achievements: achievementCount || 0,
      daysSinceCreation,
    });
  } catch (error) {
    console.error('Error fetching progression stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
