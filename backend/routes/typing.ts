import express from 'express';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';
import { supabase } from '../config/supabase';

const router = express.Router();

// Handle typing indicator
router.post('/conversations/:conversationId/typing', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId } = req.params;
    const { isTyping } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get other participants to send typing indicator
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id);

    if (otherParticipants && otherParticipants.length > 0) {
      const recipientIds = otherParticipants.map(p => p.user_id);
      const typingMessage = {
        type: 'typing' as const,
        payload: {
          conversationId,
          userId: user.id,
          isTyping: !!isTyping
        }
      };
      
      wsManager.broadcastToUsers(recipientIds, typingMessage);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling typing indicator:', error);
    res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

export default router;
