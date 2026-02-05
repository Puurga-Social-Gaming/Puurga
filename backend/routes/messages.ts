import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';

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

    const allConversationIds = userConversations.map(c => c.conversation_id);

    // Get top 50 most recent conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, created_at, updated_at')
      .in('id', allConversationIds)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const targetConversations = conversations || [];
    const targetIds = targetConversations.map(c => c.id);

    if (targetIds.length === 0) {
      return res.json([]);
    }

    // Bulk fetch all participants for these conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', targetIds)
      .neq('user_id', user.id); // Exclude current user

    // Bulk fetch profiles for these participants
    const participantUserIds = [...new Set((allParticipants || []).map(p => p.user_id))];

    let profilesMap = new Map();
    if (participantUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', participantUserIds);

      if (profiles) {
        profiles.forEach(p => profilesMap.set(p.id, p));
      }
    }

    // Group participants by conversation ID
    const conversationParticipants = new Map();
    (allParticipants || []).forEach(p => {
      const profile = profilesMap.get(p.user_id);
      if (profile) {
        if (!conversationParticipants.has(p.conversation_id)) {
          conversationParticipants.set(p.conversation_id, []);
        }
        conversationParticipants.get(p.conversation_id).push({
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          username: profile.username || 'unknown',
          avatar_url: profile.avatar_url || null
        });
      }
    });

    // Fetch latest messages for ALL conversations in one query (to avoid N+1 problem)
    const latestMessagesMap = new Map();
    if (targetIds.length > 0) {
      // Get the latest message for each conversation using a window function approach
      // Since Supabase doesn't support window functions easily, we'll fetch all messages
      // and filter client-side (better than N queries)
      const { data: allMessages } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, from_user_id, conversation_id,
          profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
        `)
        .in('conversation_id', targetIds)
        .order('created_at', { ascending: false })
        .limit(targetIds.length * 5); // Get top 5 messages per conversation max

      if (allMessages && allMessages.length > 0) {
        // Group by conversation and keep only the latest
        allMessages.forEach((msg: any) => {
          if (!latestMessagesMap.has(msg.conversation_id)) {
            latestMessagesMap.set(msg.conversation_id, msg);
          }
        });
      }
    }

    // Format conversations with their latest messages
    const formattedConversations = targetConversations.map((conv: any) => {
      const participants = conversationParticipants.get(conv.id) || [];
      const latestMsg = latestMessagesMap.get(conv.id);

      let latest_message = null;
      if (latestMsg) {
        const senderProfile = latestMsg.profiles;
        latest_message = {
          content: latestMsg.content,
          created_at: latestMsg.created_at,
          from_user: senderProfile ? {
            id: senderProfile.id,
            full_name: senderProfile.full_name || 'Unknown User',
            username: senderProfile.username || 'unknown',
            avatar_url: senderProfile.avatar_url || null
          } : { id: latestMsg.from_user_id, full_name: 'Unknown', username: 'unknown', avatar_url: null }
        };
      }

      return {
        id: conv.id,
        participants,
        latest_message,
        unread_count: 0,
        updated_at: conv.updated_at
      };
    });

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

    // Get other participants to send notifications
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id);

    // Create notifications for all other participants
    if (otherParticipants && otherParticipants.length > 0) {
      const senderProfile = (message as any).profiles;
      const notifications = otherParticipants.map(participant => ({
        type: 'message',
        sender_id: user.id,
        receiver_id: participant.user_id,
        conversation_id: conversationId,
        message_id: message.id,
        title: 'New Message',
        message: `${senderProfile?.full_name || 'Someone'} sent you a message`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const { data: createdNotifications } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('*');

      // Broadcast notifications via WebSocket to each recipient
      if (createdNotifications && createdNotifications.length > 0) {
        createdNotifications.forEach((notification: any) => {
          const wsNotification = {
            id: notification.id,
            type: 'message' as const,
            fromUser: {
              id: user.id,
              name: senderProfile?.full_name || 'Someone',
              username: senderProfile?.username || 'unknown',
              avatar: senderProfile?.avatar_url || undefined
            },
            data: {
              conversationId,
              messageId: message.id
            },
            createdAt: notification.created_at
          };

          wsManager.sendNotification(notification.receiver_id, wsNotification);
          console.log(`📬 Sent message notification to user ${notification.receiver_id}`);
        });
      }
    }

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

    // Broadcast message to all participants via WebSocket for real-time delivery
    if (otherParticipants && otherParticipants.length > 0) {
      const recipientIds = otherParticipants.map(p => p.user_id);
      const wsMessage = {
        type: 'new_message' as const,
        payload: {
          conversationId,
          message: {
            id: formattedMessage.id,
            content: formattedMessage.content,
            fromUserId: formattedMessage.from_user_id,
            createdAt: new Date(formattedMessage.created_at),
            fromUser: {
              id: formattedMessage.from_user.id,
              name: formattedMessage.from_user.full_name,
              username: formattedMessage.from_user.username,
              avatar: formattedMessage.from_user.avatar_url || undefined
            }
          }
        }
      };

      wsManager.broadcastToUsers(recipientIds, wsMessage);
      console.log(`💬 Broadcasted message to ${recipientIds.length} recipient(s)`);
    }

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

// Get users available for messaging (friends and recent contacts)
router.get('/users/online', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get online user IDs from WebSocket manager for status indication
    const onlineUserIds = new Set(wsManager.getOnlineUsers().filter(id => id !== user.id));

    // Fetch the user's friends from the friends table
    const { data: friendships, error: friendsError } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (friendsError && friendsError.code !== '42P01') {
      console.error('Error fetching friendships:', friendsError);
      // Don't throw, just return empty friends list
    }

    // Extract friend IDs (the other user in each friendship)
    const friendIds = (friendships || []).map(f =>
      f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
    );

    // Also get users from existing conversations (for non-friends who have conversed)
    const { data: conversationParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    let conversationUserIds: string[] = [];
    if (conversationParticipants && conversationParticipants.length > 0) {
      const convIds = conversationParticipants.map(c => c.conversation_id);
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .in('conversation_id', convIds)
        .neq('user_id', user.id);

      if (otherParticipants) {
        conversationUserIds = otherParticipants.map(p => p.user_id);
      }
    }

    // Combine friends and conversation contacts, remove duplicates
    let allUserIds = [...new Set([...friendIds, ...conversationUserIds])];

    // Fallback: If no friends/contacts (or very few), fetch recent users so the list isn't empty
    // This ensures new users have someone to message
    if (allUserIds.length < 5) {
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentUsers) {
        const recentIds = recentUsers.map(u => u.id);
        allUserIds = [...new Set([...allUserIds, ...recentIds])];
      }
    }

    if (allUserIds.length === 0) {
      return res.json([]);
    }

    // Fetch profiles for these users
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', allUserIds)
      .limit(100);

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
      isOnline: onlineUserIds.has(u.id)
    }));

    // Sort: online -> friends -> others -> alphabetical
    formattedUsers.sort((a: any, b: any) => {
      // 1. Online status
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      // 2. Friend status (checks if id is in friendIds)
      const aIsFriend = friendIds.includes(a.id);
      const bIsFriend = friendIds.includes(b.id);
      if (aIsFriend && !bIsFriend) return -1;
      if (!aIsFriend && bIsFriend) return 1;

      // 3. Alphabetical
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
