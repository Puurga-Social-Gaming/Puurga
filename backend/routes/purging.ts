import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';

const router = express.Router();

// GET /api/purging/activity - Get purging activity for user's friends and recent global activity
router.get('/activity', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get user's friends first
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (friendsError) throw friendsError;

    const friendIds = (friends || [])
      .map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1)
      .filter((id: string) => id !== userId);

    // Get purging events from posts
    const { data: purgePosts, error: purgeError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        type,
        created_at,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          credits
        )
      `)
      .eq('type', 'purge')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (purgeError) throw purgeError;

    // Process purging activity
    const activity = (purgePosts || []).map((post: any) => {
      const profile = post.profiles;
      if (!profile) return null;

      // Calculate credits needed for redemption (example logic)
      const creditsNeeded = Math.max(0, 100 - (profile.credits || 0));

      return {
        id: post.id,
        userId: profile.id,
        username: profile.username,
        name: profile.full_name || profile.username,
        avatar: normalizeImageUrl(profile.avatar_url),
        action: 'purged' as const,
        timestamp: post.created_at,
        creditsNeeded: creditsNeeded,
        isFriend: friendIds.includes(profile.id)
      };
    }).filter(Boolean);

    // Also get recent redemptions (if there's a redemption system)
    // For now, we'll just return purging activity
    // In the future, this could include redemption events

    res.json(activity);
  } catch (error) {
    console.error('Error fetching purging activity:', error);
    res.status(500).json({ error: 'Failed to fetch purging activity' });
  }
});

// GET /api/purging/redemption-needed - Get friends who need redemption
router.get('/redemption-needed', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Get user's friends first
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (friendsError) throw friendsError;

    const friendIds = (friends || [])
      .map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1)
      .filter((id: string) => id !== userId);

    if (friendIds.length === 0) return res.json([]);

    // For now, return mock data for friends who need redemption
    // In the future, this would check actual purge status
    const mockRedemptionNeeded = friendIds.slice(0, 2).map((friendId: string, index: number) => ({
      id: `redemption-${friendId}`,
      userId: friendId,
      username: `friend${index + 1}`,
      name: `Friend ${index + 1}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`,
      creditsNeeded: Math.floor(Math.random() * 500) + 100,
      daysPurged: Math.floor(Math.random() * 7) + 1
    }));

    res.json(mockRedemptionNeeded);
  } catch (error) {
    console.error('Error fetching redemption needed:', error);
    res.status(500).json({ error: 'Failed to fetch redemption needed' });
  }
});

export default router;
