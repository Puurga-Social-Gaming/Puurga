import express from 'express';
import { requireSupabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { getAcceptedFriendIds, removeFriendship } from '../utils/friendRelations';
import { Profile, FriendRequest, Op } from '../models';

const router = express.Router();

// Get suggested friends
// Resolved against the local PostgreSQL database. The previous version went
// through a Supabase RPC; in local mode `requireSupabase()` returns a noop
// proxy that resolves to `[]`, which is truthy — so the route short-circuited
// and every caller always received an empty list.
router.get('/suggestions', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Exclude self, existing friends, and anyone with a request in flight
    const excluded = new Set<string>([user.id]);

    for (const id of await getAcceptedFriendIds(user.id)) {
      excluded.add(id);
    }

    const requests = await FriendRequest.findAll({
      where: {
        [Op.or]: [{ sender_id: user.id }, { receiver_id: user.id }],
      },
      attributes: ['sender_id', 'receiver_id', 'status'],
    });

    const requestMap = new Map<string, string>();
    for (const r of requests) {
      const otherUserId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      if (!otherUserId) continue;
      // Prioritize 'pending' if multiple requests exist (e.g. one rejected, one pending)
      if (r.status === 'pending' || !requestMap.has(otherUserId)) {
        requestMap.set(otherUserId, r.status);
      }
      // Never suggest someone we already have a pending/accepted exchange with
      if (r.status === 'pending' || r.status === 'accepted') {
        excluded.add(otherUserId);
      }
    }

    const suggestions = await Profile.findAll({
      where: {
        id: { [Op.notIn]: Array.from(excluded) },
        hide_from_suggestions: false,
        is_blocked: false,
      },
      attributes: ['id', 'full_name', 'username', 'avatar_url'],
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    res.set('Cache-Control', 'no-store');
    res.json(
      suggestions.map((s) => ({
        id: s.id,
        name: s.full_name || 'Unknown',
        username: s.username || 'user',
        avatar: normalizeImageUrl(s.avatar_url),
        status: requestMap.get(s.id) === 'pending' ? 'pending' : 'none',
      })),
    );
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
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const friendIds = await getAcceptedFriendIds(user.id);
    if (friendIds.length === 0) return res.json([]);

    // Fetch user info for all friends
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', friendIds)
      .limit(150);

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
  const supabase = requireSupabase();
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

// Outgoing pending friend requests (sent by me)
router.get('/requests/outgoing', auth, async (req: AuthRequest, res) => {
  const supabase = requireSupabase();
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, receiver_id, profiles:receiver_id(id, full_name, username, avatar_url)')
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (error) {
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        return res.json([]);
      }
      throw error;
    }

    res.json(
      (requests || []).map((r: any) => ({
        id: r.id,
        receiver_id: r.receiver_id,
        name: r.profiles?.full_name || 'Unknown',
        username: r.profiles?.username || 'user',
        avatar: normalizeImageUrl(r.profiles?.avatar_url),
      }))
    );
  } catch (error) {
    console.error('Error fetching outgoing requests:', error);
    res.status(500).json({ error: 'Failed to fetch outgoing requests' });
  }
});

// Followers list
router.get('/followers', auth, async (req: AuthRequest, res) => {
  const supabase = requireSupabase();
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('followers')
      .select('follower_id, profiles:follower_id(id, full_name, username, avatar_url)')
      .eq('following_id', user.id)
      .limit(200);

    if (error) {
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        // Fallback: friends count as followers
        const friendIds = await getAcceptedFriendIds(user.id);
        if (friendIds.length === 0) return res.json([]);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', friendIds)
          .limit(200);
        return res.json(
          (profiles || []).map((u: any) => ({
            id: u.id,
            name: u.full_name,
            username: u.username,
            avatar: normalizeImageUrl(u.avatar_url),
          }))
        );
      }
      throw error;
    }

    res.json(
      (data || []).map((row: any) => ({
        id: row.profiles?.id || row.follower_id,
        name: row.profiles?.full_name || 'Unknown',
        username: row.profiles?.username || 'user',
        avatar: normalizeImageUrl(row.profiles?.avatar_url),
      }))
    );
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Following list
router.get('/following', auth, async (req: AuthRequest, res) => {
  const supabase = requireSupabase();
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('followers')
      .select('following_id, profiles:following_id(id, full_name, username, avatar_url)')
      .eq('follower_id', user.id)
      .limit(200);

    if (error) {
      if ((error as any).code === '42P01' || (error as any).code === '42703') {
        const friendIds = await getAcceptedFriendIds(user.id);
        if (friendIds.length === 0) return res.json([]);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', friendIds)
          .limit(200);
        return res.json(
          (profiles || []).map((u: any) => ({
            id: u.id,
            name: u.full_name,
            username: u.username,
            avatar: normalizeImageUrl(u.avatar_url),
          }))
        );
      }
      throw error;
    }

    res.json(
      (data || []).map((row: any) => ({
        id: row.profiles?.id || row.following_id,
        name: row.profiles?.full_name || 'Unknown',
        username: row.profiles?.username || 'user',
        avatar: normalizeImageUrl(row.profiles?.avatar_url),
      }))
    );
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Unfriend
router.delete('/:friendId', auth, async (req: AuthRequest, res) => {
  const supabase = requireSupabase();
  try {
    const { user } = req;
    const { friendId } = req.params;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!friendId || friendId === user.id) {
      return res.status(400).json({ error: 'Invalid friend id' });
    }

    await removeFriendship(user.id, friendId);
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;