import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

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

        res.json(data);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

export default router;
