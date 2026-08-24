import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { Notification, Profile, User, sequelize } from '../models';
import { NotificationService } from '../services/notificationService';
import { normalizeImageUrl } from '../utils/url';
import { getBidirectionalBlockedIds } from '../utils/friendRelations';

const router = express.Router();

// Get all notifications for the current user (with pagination)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const type = req.query.type as string | undefined;

    const whereClause: any = { receiver_id: req.user.id };

    if (type && type !== 'all') {
      const categoryTypes = getTypesForCategory(type);
      if (categoryTypes.length > 0) {
        whereClause.type = categoryTypes;
      }
    }

    const { rows: notifications, count } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset
    });

    const safeNotifications = notifications || [];
    if (safeNotifications.length === 0) {
      return res.json({ notifications: [], total: 0, page, limit });
    }

    // Hide notifications from blocked users (either direction)
    const blockedIds = await getBidirectionalBlockedIds(req.user.id);
    const blockedSet = new Set(blockedIds);
    const visibleNotifications = blockedSet.size
      ? safeNotifications.filter((n: any) => !n.sender_id || !blockedSet.has(n.sender_id))
      : safeNotifications;

    if (visibleNotifications.length === 0) {
      return res.json({ notifications: [], total: 0, page, limit });
    }

    // Collect unique sender_ids
    const senderIds = Array.from(new Set(
      visibleNotifications.map((n: any) => n.sender_id).filter(Boolean)
    ));

    // Fetch sender profiles
    const profileMap = new Map<string, any>();
    if (senderIds.length > 0) {
      const [profilesRes, usersRes] = await Promise.all([
        Profile.findAll({ where: { id: senderIds }, attributes: ['id', 'full_name', 'username', 'avatar_url'] }),
        User.findAll({ where: { id: senderIds }, attributes: ['id', 'avatar_url'] }),
      ]);

      const profiles = profilesRes as any[];
      const usersTbl = usersRes as any[];

      for (const p of profiles) profileMap.set(p.id, p);
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
    const mapped = visibleNotifications.map((n: any) => {
      const sender = profileMap.get(n.sender_id as string);
      const read = (n.read ?? n.is_read ?? false) as boolean;
      return {
        id: n.id,
        type: n.type,
        read,
        title: n.title,
        message: n.message,
        createdAt: n.created_at,
        fromUser: {
          id: n.sender_id || '',
          name: sender?.full_name || '',
          username: sender?.username || '',
          avatar: normalizeImageUrl(sender?.avatar_url) || '',
        },
        data: {
          friendRequestId: n.friend_request_id || undefined,
          postId: n.post_id || undefined,
          commentId: n.comment_id || undefined,
          conversationId: n.conversation_id || undefined,
          messageId: n.message_id || undefined,
          shareId: n.share_id || undefined,
          groupId: n.group_id || undefined,
          gameId: n.game_id || undefined,
          ...(n.metadata || {}),
        },
      };
    });

    res.json({ notifications: mapped, total: mapped.length, page, limit });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
router.put('/read', auth, async (req: AuthRequest, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }

    await NotificationService.markAsRead(req.user.id, notificationIds);
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req: AuthRequest, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Get unread notifications count
router.get('/unread/count', auth, async (req: AuthRequest, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Delete notifications in bulk
router.delete('/batch', auth, async (req: AuthRequest, res) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }
    await NotificationService.deleteNotifications(req.user.id, notificationIds);
    res.json({ message: 'Notifications deleted' });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

// Delete a single notification
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    await NotificationService.deleteNotifications(req.user.id, [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ── Notification Preferences ──────────────────────────────

// Get notification preferences
router.get('/preferences', auth, async (req: AuthRequest, res) => {
  try {
    const prefs = await NotificationService.getPreferences(req.user.id);
    res.json(prefs);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
router.put('/preferences', auth, async (req: AuthRequest, res) => {
  try {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences must be an object' });
    }
    const updated = await NotificationService.updatePreferences(req.user.id, preferences);
    res.json(updated);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ── Push Subscriptions (Web Push) ──────────────────────────

// Save push subscription
router.post('/push/subscribe', auth, async (req: AuthRequest, res) => {
  try {
    const { endpoint, p256dh, auth: authKey } = req.body;
    if (!endpoint || !p256dh || !authKey) {
      return res.status(400).json({ error: 'Missing subscription data' });
    }
    try {
      await sequelize.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
         VALUES (:user_id, :endpoint, :p256dh, :auth, :user_agent, :updated_at)
         ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, updated_at = EXCLUDED.updated_at`,
        {
          replacements: {
            user_id: req.user.id,
            endpoint,
            p256dh,
            auth: authKey,
            user_agent: req.headers['user-agent'] || null,
            updated_at: new Date().toISOString()
          }
        }
      );
    } catch (error: any) {
      if (error.parent?.code === '42P01') {
        return res.status(503).json({ error: 'Push subscriptions not available yet.' });
      }
      throw error;
    }
    res.json({ message: 'Push subscription saved' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// Remove push subscription
router.post('/push/unsubscribe', auth, async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }
    try {
      await sequelize.query(
        `DELETE FROM push_subscriptions WHERE user_id = :user_id AND endpoint = :endpoint`,
        {
          replacements: { user_id: req.user.id, endpoint }
        }
      );
    } catch (error: any) {
      if (error.parent?.code === '42P01') {
        // Table doesn't exist, safely ignore
      } else {
        throw error;
      }
    }

    res.json({ message: 'Push subscription removed' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// ── Helper ──────────────────────────────────────────────────

function getTypesForCategory(category: string): string[] {
  const map: Record<string, string[]> = {
    all: [],
    social: ['like', 'dislike', 'comment', 'reply', 'mention', 'follow', 'follow_accepted', 'share', 'profile_visit', 'friend_request', 'friend_request_accepted', 'friend_ghosted', 'redemption', 'redemption_contribution', 'purge'],
    messaging: ['message', 'group_message', 'message_reaction', 'missed_call'],
    gaming: ['resume_game', 'reward_reminder', 'tournament_reminder', 'challenge'],
    system: ['welcome', 'verification', 'security_alert', 'maintenance'],
  };
  return map[category] || [];
}

export default router;
