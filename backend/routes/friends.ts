import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

// Get suggested friends
router.get('/suggestions', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Step 1: Get all active friendships and pending/incoming friend requests for the current user.
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (friendsError || requestsError) {
      console.error('Error fetching relations:', friendsError || requestsError);
      return res.status(500).json({ error: 'Failed to fetch user relations' });
    }

    const friendIds = new Set(friends.map(f => (f.user_id === user.id ? f.friend_id : f.user_id)));
    const requestMap = new Map();
    requests.forEach(r => {
      const otherUserId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      // Prioritize 'pending' status if multiple requests exist (e.g., one rejected, one pending)
      if (r.status === 'pending' || !requestMap.has(otherUserId)) {
        requestMap.set(otherUserId, r.status);
      }
    });

    // Step 2: Fetch all profiles, excluding the user and their existing friends.
    const excludedIds = [user.id, ...Array.from(friendIds)];
    const { data: suggestions, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .not('id', 'in', `(${excludedIds.join(',')})`)
      .limit(20);

    if (error) {
      // If table is missing in Supabase (42P01) or column missing (42703), return empty list gracefully
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        return res.json([]);
      }
      throw error;
    }

    // Step 3: Map the status to each suggestion.
    const results = (suggestions || []).map((s: any) => ({
      id: s.id,
      name: s.full_name || 'Unknown',
      username: s.username || 'user',
      avatar: s.avatar_url,
      // The status is 'pending' if the user sent the request.
      status: requestMap.get(s.id) === 'pending' ? 'pending' : 'none',
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch friend suggestions' });
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
      sender_avatar: req.profiles?.avatar_url || '/default-avatar.png',
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
      avatar: u.avatar_url,
      online: undefined
    })));
  } catch (error) {
    console.error('Error fetching accepted friends:', error);
    res.status(500).json({ error: 'Failed to fetch accepted friends' });
  }
});

export default router;