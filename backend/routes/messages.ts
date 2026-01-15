import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get conversation IDs where user is a participant
    const { data: userConversations, error: convError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (convError) {
      if (convError.code === '42P01') {
        return res.json([]);
      }
      throw convError;
    }

    if (!userConversations || userConversations.length === 0) {
      return res.json([]);
    }

    const conversationIds = userConversations.map(c => c.conversation_id);

    // Get conversation details
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, created_at, updated_at')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Format conversations with participant info and latest message
    const formattedConversations = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        // Get other participants (not current user)
        const { data: participantIds } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)
          .neq('user_id', user.id);

        // Get participant profiles
        const participants = [];
        if (participantIds && participantIds.length > 0) {
          const userIds = participantIds.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', userIds);

          if (profiles) {
            participants.push(...profiles.map(p => ({
              id: p.id,
              full_name: p.full_name || 'Unknown User',
              username: p.username || 'unknown',
              avatar_url: p.avatar_url || null
            })));
          }
        }

        // Get latest message
        const { data: latestMessages } = await supabase
          .from('messages')
          .select('id, content, created_at, from_user_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        let latest_message = null;
        if (latestMessages && latestMessages.length > 0) {
          const msg = latestMessages[0];
          const { data: fromUser } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', msg.from_user_id)
            .single();

          latest_message = {
            content: msg.content,
            created_at: msg.created_at,
            from_user: fromUser || { id: msg.from_user_id, full_name: 'Unknown', username: 'unknown', avatar_url: null }
          };
        }
        
        return {
          id: conv.id,
          participants,
          latest_message,
          unread_count: 0,
          updated_at: conv.updated_at
        };
      })
    );

    res.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    // Get messages for this conversation
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        from_user_id,
        profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return res.json([]);
      }
      throw error;
    }

    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      from_user_id: msg.from_user_id,
      from_user: {
        id: msg.profiles?.id || msg.from_user_id,
        full_name: msg.profiles?.full_name || 'Unknown User',
        username: msg.profiles?.username || 'unknown',
        avatar_url: msg.profiles?.avatar_url || null
      }
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
    }

    // Insert the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        from_user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        content,
        created_at,
        from_user_id,
        profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
      `)
      .single();

    if (error) {
      throw error;
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    const formattedMessage = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      from_user_id: message.from_user_id,
      from_user: {
        id: (message as any).profiles?.id || message.from_user_id,
        full_name: (message as any).profiles?.full_name || 'Unknown User',
        username: (message as any).profiles?.username || 'unknown',
        avatar_url: (message as any).profiles?.avatar_url || null
      }
    };

    res.json(formattedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create or get conversation with another user
router.post('/conversations', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { otherUserId } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!otherUserId) {
      return res.status(400).json({ error: 'Other user ID is required' });
    }

    // Check if conversation already exists between these users
    const { data: existingConversations, error: searchError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (searchError && searchError.code !== '42P01') {
      throw searchError;
    }

    let conversationId = null;

    if (existingConversations && existingConversations.length > 0) {
      // Check if any of these conversations also include the other user
      for (const conv of existingConversations) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', otherUserId)
          .single();

        if (otherParticipant) {
          conversationId = conv.conversation_id;
          break;
        }
      }
    }

    // If no existing conversation, create a new one
    if (!conversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        throw createError;
      }

      conversationId = newConversation.id;

      // Add both users as participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: otherUserId }
        ]);

      if (participantsError) {
        throw participantsError;
      }
    }

    // Get the other user's profile info
    const { data: otherUserProfile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', otherUserId)
      .single();

    res.json({
      id: conversationId,
      participants: [{
        id: otherUserProfile?.id || otherUserId,
        full_name: otherUserProfile?.full_name || 'Unknown User',
        username: otherUserProfile?.username || 'unknown',
        avatar_url: otherUserProfile?.avatar_url || null
      }],
      unread_count: 0
    });
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get online users (for starting new conversations)
router.get('/users/online', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all users except current user
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .neq('id', user.id)
      .limit(50);

    if (error) {
      if (error.code === '42P01') {
        return res.json([]);
      }
      throw error;
    }

    const formattedUsers = (users || []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name || 'Unknown User',
      username: u.username || 'unknown',
      avatar_url: u.avatar_url,
      isOnline: true // TODO: Implement real online status
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
