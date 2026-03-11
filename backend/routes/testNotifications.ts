import express from 'express';
import { supabaseAuth as auth } from '../middleware/supabaseAuth';
import { createNotification } from './createNotification';

const router = express.Router();

// Test endpoint to create a demo notification
router.post('/demo', auth, async (req, res) => {
  try {
    const { type = 'like', receiverId } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required' });
    }

    // Create a demo notification
    const notification = await createNotification({
      type: type as any,
      senderId: req.user.id,
      receiverId: receiverId,
      postId: (type === 'like' || type === 'comment') ? 'demo-post-id' : undefined,
      commentId: type === 'comment' ? 'demo-comment-id' : undefined
    });

    if (notification) {
      res.json({ 
        success: true, 
        message: `Demo ${type} notification sent to user ${receiverId}`,
        notification 
      });
    } else {
      res.status(500).json({ error: 'Failed to create demo notification' });
    }
  } catch (error) {
    console.error('Error creating demo notification:', error);
    res.status(500).json({ error: 'Failed to create demo notification' });
  }
});

// Test endpoint to get current user's ID (for testing purposes)
router.get('/me', auth, (req, res) => {
  res.json({ userId: req.user.id, message: 'Use this ID as receiverId in demo notifications' });
});

export default router;
