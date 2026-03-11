import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';

const router = express.Router();

// GET /api/games/leaderboard
router.get('/leaderboard', auth, async (req: AuthRequest, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, credits')
            .order('credits', { ascending: false })
            .limit(10);

        if (error) throw error;

        // Normalize avatar URLs
        const normalizedData = (data || []).map(player => ({
            ...player,
            avatar_url: normalizeImageUrl(player.avatar_url)
        }));

        res.json(normalizedData);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/games/stats
router.get('/stats', auth, async (req: AuthRequest, res) => {
    try {
        // Since we don't have a games_played table yet, return empty stats
        // This makes the PuurgaDashboard functional
        res.json({
            gamesPlayed: 0,
            totalScore: 0,
            highScore: 0,
            averageScore: 0,
            recentGames: []
        });
    } catch (error) {
        console.error('Error fetching game stats:', error);
        res.status(500).json({ error: 'Failed to fetch game stats' });
    }
});

export default router;
