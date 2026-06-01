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
        const { id: currentUserId } = req.user;
        
        // Get user's activity from posts table to derive game-like engagement
        const [postsRes, creditsRes] = await Promise.all([
            supabase.from('posts').select('id, created_at').eq('user_id', currentUserId),
            supabase.from('profiles').select('credits').eq('id', currentUserId).single()
        ]);

        const posts = postsRes.data || [];
        const userCredits = (creditsRes.data as any)?.credits || 0;
        
        // Calculate derived game stats from activity
        const totalPosts = posts.length;
        const engagementScore = totalPosts * 10 + userCredits;

        res.json({
            gamesPlayed: totalPosts, // Count all posts as engagement
            totalScore: userCredits,
            highScore: Math.floor(userCredits / 10),
            averageScore: totalPosts > 0 ? Math.floor(engagementScore / Math.max(totalPosts, 1)) : 0,
            recentGames: (posts || []).slice(0, 5).map((p: any) => ({
                id: p.id,
                playedAt: p.created_at,
                score: 0
            }))
        });
    } catch (error) {
        console.error('Error fetching game stats:', error);
        res.status(500).json({ error: 'Failed to fetch game stats' });
    }
});

// GET /api/games/playing - Get users currently online/active
router.get('/playing', auth, async (req: AuthRequest, res) => {
    try {
        // Get recently active users (last 5 minutes) from posts table
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        const { data: recentUsers, error } = await supabase
            .from('posts')
            .select('user_id')
            .gte('created_at', fiveMinutesAgo.toISOString());
            
        if (error) throw error;
        
        // Get unique user IDs
        const uniqueUserIds = [...new Set((recentUsers || []).map((p: any) => p.user_id).filter(Boolean))];
        
        if (uniqueUserIds.length === 0) {
            return res.json([]);
        }
        
        // Get user profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', uniqueUserIds);
            
        const playingUsers = (profiles || []).map(p => ({
            id: p.id,
            username: p.username,
            name: p.full_name,
            avatar: p.avatar_url
        }));
        
        res.json(playingUsers);
    } catch (error) {
        console.error('Error fetching playing users:', error);
        res.status(500).json({ error: 'Failed to fetch playing users' });
    }
});

export default router;
