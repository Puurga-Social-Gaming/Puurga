import express from 'express';
import { supabaseAuth as auth } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';

const router = express.Router();

// Get online users
router.get('/online', auth, async (req, res) => {
  try {
    const onlineUsers = wsManager.getOnlineUsers();
    res.json({ onlineUsers, count: onlineUsers.length });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Check if specific user is online
router.get('/online/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const isOnline = wsManager.isUserOnline(userId);
    res.json({ userId, isOnline });
  } catch (error) {
    console.error('Error checking user online status:', error);
    res.status(500).json({ error: 'Failed to check user online status' });
  }
});

export default router;
