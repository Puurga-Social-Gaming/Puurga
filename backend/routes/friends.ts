import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';

const router = express.Router();

// Get suggested friends
router.get('/suggestions', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Step 1: Try to use efficient RPC call first
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_friend_suggestions', { p_user_id: user.id, p_limit: 10 });

      if (!rpcError && rpcData) {
        // Disable caching to ensure real-time updates
        res.set('Cache-Control', 'no-store');

        // Filter and map results, ensuring current user is never included
        const results = rpcData
          .filter((s: any) => s.id !== user.id) // Safety: exclude current user
          .map((s: any) => ({
            id: s.id,
            name: s.full_name || 'Unknown',
            username: s.username || 'user',
            avatar: normalizeImageUrl(s.avatar_url),
            status: 'none', // RPC filters out pending/friends
          }));
        return res.json(results);
      }
    } catch (ignore) {
      // Fallback to legacy method if RPC fails or doesn't exist
    }

    // --- LEGACY FALLBACK (Inefficient but reliable) ---
    // Queries existing relations to exclude them
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (friendsError || requestsError) {
      const err = friendsError || requestsError;
      console.error('Error fetching relations:', err);
      // Handle missing tables gracefully
      if (err && ((err as any).code === '42P01' || (err as any).code === '42703')) {
        // Tables don't exist, so user has no friends/requests. Proceed with empty lists.
        const friendIds = new Set();
        const requestMap = new Map();

        // ... continue to suggestions logic ...
        // Since we can't easily jump, let's just return empty suggestions for now
        // or actually, if tables are missing, we should just return random profiles
        // But for safety, let's return empty array if tables are completely missing
        return res.json([]);
      }
      return res.status(500).json({
        error: 'Failed to fetch user relations',
        details: err?.message || 'Unknown error'
      });
    }

    const safeFriends = friends || [];
    const safeRequests = requests || [];

    const friendIds = new Set(safeFriends.map(f => (f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1)));
    const requestMap = new Map();
    safeRequests.forEach(r => {
      const otherUserId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      // Prioritize 'pending' status if multiple requests exist (e.g., one rejected, one pending)
      if (r.status === 'pending' || !requestMap.has(otherUserId)) {
        requestMap.set(otherUserId, r.status);
      }
    });

    // Step 2: Fetch all profiles, excluding the user and their existing friends.
    // Also exclude pending and accepted requests from the friend_requests table.
    const friendRequestIds = safeRequests
      .filter(r => r.status === 'pending' || r.status === 'accepted')
      .map(r => (r.sender_id === user.id ? r.receiver_id : r.sender_id));

    const excludedIds = Array.from(new Set([
      user.id,
      ...Array.from(friendIds),
      ...friendRequestIds
    ]));

    // Build filter to exclude IDs - Supabase doesn't support .not('id', 'in', ...) easily for large lists
    // So we fetch all and filter client-side.
    // OPTIMIZATION: Get newest users first (most likely to be relevant/active) and limit 100
    let query = supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .neq('id', user.id) // Always exclude self
      // .not('id', 'in', `(${Array.from(friendIds).slice(0, 50).join(',')})`) // Optional: exclude first 50 friends to help
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: allSuggestions, error } = await query;

    if (error) {
      // If table is missing in Supabase (42P01) or column missing (42703), return empty list gracefully
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        return res.json([]);
      }
      throw error;
    }

    // Filter out excluded IDs
    const suggestions = (allSuggestions || []).filter((s: any) => !excludedIds.includes(s.id)).slice(0, 20);

    // Step 3: Map the status to each suggestion.
    const results = (suggestions || []).map((s: any) => ({
      id: s.id,
      name: s.full_name || 'Unknown',
      username: s.username || 'user',
      avatar: normalizeImageUrl(s.avatar_url),
      // The status is 'pending' if the user sent the request.
      status: requestMap.get(s.id) === 'pending' ? 'pending' : 'none',
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    res.status(500).json({
      error: 'Failed to fetch friend suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get pending friend requests for the current user
router.get('/requests', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch pending friend requests where the current user is the receiver
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id, profiles:sender_id(id, full_name, username, avatar_url)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (error) {
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        return res.json([]);
      }
      throw error;
    }

    // Map to clean structure
    const result = (requests || []).map((req: any) => ({
      id: req.id,
      sender_id: req.sender_id,
      sender_name: req.profiles?.full_name || '',
      sender_username: req.profiles?.username || '',
      sender_avatar: normalizeImageUrl(req.profiles?.avatar_url) || '/default-avatar.png',
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

// Get accepted friends (for online friends section)
router.get('/accepted', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all friends where user is either user_id or friend_id
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (friendsError) {
      if ((friendsError as any).code === '42P01' || (friendsError as any).code === '42703') {
        return res.json([]);
      }
      throw friendsError;
    }

    // Get the IDs of the user's friends (exclude self)
    const friendIds = (friends || [])
      .map((f: any) => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1)
      .filter((id: string) => id !== user.id);

    if (friendIds.length === 0) return res.json([]);

    // Fetch user info for all friends, only those who are online
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', friendIds)
      .limit(50);

    if (userError) {
      if ((userError as any).code === '42P01' || (userError as any).code === '42703') {
        return res.json([]);
      }
      throw userError;
    }

    res.json((users || []).map((u: any) => ({
      id: u.id,
      name: u.full_name,
      username: u.username,
      avatar: normalizeImageUrl(u.avatar_url),
      online: undefined
    })));
  } catch (error) {
    console.error('Error fetching accepted friends:', error);
    res.status(500).json({ error: 'Failed to fetch accepted friends' });
  }
});

// Get friends' public stats
router.get('/stats', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Get all friends
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (friendsError) {
      if ((friendsError as any).code === '42P01' || (friendsError as any).code === '42703') {
        return res.json([]);
      }
      throw friendsError;
    }

    const friendIds = (friends || [])
      .map((f: any) => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1)
      .filter((id: string) => id !== user.id);

    if (friendIds.length === 0) return res.json([]);

    // 2. Fetch profiles for these friends including their credits and purge streaks
    const { data: profiles, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, credits, purga_points, purge_streak, stats_public')
      .in('id', friendIds)
      .limit(50);

    if (userError) {
      if ((userError as any).code === '42P01' || (userError as any).code === '42703') {
        return res.json([]);
      }
      throw userError;
    }

    // Normalize and return
    const result = (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
      credits: Number(p.purga_points ?? p.credits ?? 0),
      purge_streak: p.purge_streak || 0,
      stats_public: p.stats_public !== false
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching friends stats:', error);
    res.status(500).json({ error: 'Failed to fetch friends stats' });
  }
});

export default router;