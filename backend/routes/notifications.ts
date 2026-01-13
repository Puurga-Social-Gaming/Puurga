import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth } from '../middleware/supabaseAuth';

const router = express.Router();

// Get all notifications for the current user
router.get('/', auth, async (req, res) => {
  try {
    // Fetch notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('receiver_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const safeNotifications = notifications || [];
    if (safeNotifications.length === 0) {
      return res.json([]);
    }

    // Collect unique sender_ids
    const senderIds = Array.from(new Set(
      safeNotifications.map(n => n.sender_id).filter(Boolean)
    ));

    // Fetch sender profiles
    let profileMap = new Map<string, { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>();
    if (senderIds.length > 0) {
      const [profilesRes, usersRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', senderIds),
        supabase.from('users').select('id, avatar_url').in('id', senderIds),
      ]);

      const profiles = (profilesRes.data || []) as Array<{ id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>;
      const usersTbl = (usersRes.data || []) as Array<{ id: string; avatar_url?: string | null }>;

      for (const p of profiles) profileMap.set(p.id, p);
      // Merge avatar from users table if not in profiles
      for (const u of usersTbl) {
        const existing = profileMap.get(u.id);
        if (existing && !existing.avatar_url && u.avatar_url) {
          existing.avatar_url = u.avatar_url;
        } else if (!existing) {
          profileMap.set(u.id, { id: u.id, avatar_url: u.avatar_url });
        }
      }
    }

    // Map notifications with fromUser object
    const mapped = safeNotifications.map(n => {
      const sender = profileMap.get(n.sender_id as string);
      return {
        id: n.id,
        type: n.type,
        read: n.read,
        createdAt: n.created_at,
        fromUser: {
          id: n.sender_id || '',
          name: sender?.full_name || '',
          username: sender?.username || '',
          avatar: sender?.avatar_url || '',
        },
        data: {
          friendRequestId: n.friend_request_id || undefined,
          postId: n.post_id || undefined,
          commentId: n.comment_id || undefined,
        },
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
router.put('/read', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds)
      .eq('receiver_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get unread notifications count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', req.user.id)
      .eq('read', false);

    if (error) throw error;

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

export default router; 