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
        // Cache this response for 5 minutes (client and CDN)
        // This prevents re-fetching on every page navigation
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes

        const results = rpcData.map((s: any) => ({
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
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

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

    const friendIds = new Set(safeFriends.map(f => (f.user_id === user.id ? f.friend_id : f.user_id)));
    const requestMap = new Map();
    safeRequests.forEach(r => {
      const otherUserId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      // Prioritize 'pending' status if multiple requests exist (e.g., one rejected, one pending)
      if (r.status === 'pending' || !requestMap.has(otherUserId)) {
        requestMap.set(otherUserId, r.status);
      }
    });

    // Step 2: Fetch all profiles, excluding the user and their existing friends.
    const excludedIds = [user.id, ...Array.from(friendIds)];

    // Build filter to exclude IDs - Supabase doesn't support .not('id', 'in', ...)
    // So we fetch all and filter, or use a workaround with multiple .neq() calls
    // For better performance with many excluded IDs, we'll fetch and filter in memory
    let query = supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .limit(50); // Fetch more to account for filtering

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
    const { data: friends, error } = await supabase
      .from('friends')
      .select('friend_id, user_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        return res.json([]);
      }
      throw error;
    }

    // Get the IDs of the user's friends (exclude self)
    const friendIds = (friends || [])
      .map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
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

export default router;