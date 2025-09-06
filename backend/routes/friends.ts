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

    // For demonstration, let's fetch some random users as suggestions.
    // In a real application, this would involve more complex logic
    // based on user networks, interests, etc.
    const { data: suggestions, error } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, bio, email')
      .neq('id', user.id); // Exclude current user

    if (error) throw error;

    res.json((suggestions || []).map((s: any) => ({
      id: s.id,
      name: s.full_name || s.email || 'Unknown',
      username: s.username || s.email?.split('@')[0] || 'user',
      avatar: s.avatar_url,
      bio: s.bio,
      email: s.email,
      requestStatus: null // No pending/accepted status for initial suggestions
    })));
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
      .select('id, sender_id, users:sender_id(id, full_name, username, avatar_url)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;

    // Map to clean structure
    const result = (requests || []).map((req: any) => ({
      id: req.id,
      sender_id: req.sender_id,
      sender_name: req.users?.full_name || '',
      sender_username: req.users?.username || '',
      sender_avatar: req.users?.avatar_url || '/default-avatar.png',
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

    if (error) throw error;

    // Get the IDs of the user's friends (exclude self)
    const friendIds = (friends || [])
      .map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
      .filter((id: string) => id !== user.id);

    if (friendIds.length === 0) return res.json([]);

    // Fetch user info for all friends, only those who are online
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, show_online_status')
      .in('id', friendIds)
      .eq('show_online_status', true);

    if (userError) throw userError;

    res.json((users || []).map(u => ({
      id: u.id,
      name: u.full_name,
      username: u.username,
      avatar: u.avatar_url,
      online: u.show_online_status
    })));
  } catch (error) {
    console.error('Error fetching accepted friends:', error);
    res.status(500).json({ error: 'Failed to fetch accepted friends' });
  }
});

export default router;