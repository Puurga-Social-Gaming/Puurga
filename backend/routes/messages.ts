import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';
import { normalizeImageUrl } from '../utils/url';
import { allowsLiveTypingPreview, canSendMessage } from '../services/settingsService';
import { NotificationService } from '../services/notificationService';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import { getAcceptedFriendIds, getPendingOutgoingIds, areBlocked, getBidirectionalBlockedIds } from '../utils/friendRelations';
import { TranslationService } from '../services/translationService';
import { DailyMissionService } from '../services/dailyMissionService';
import { Message, Conversation, ConversationParticipant, User, Profile, sequelize, Op } from '../models';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get conversation IDs where user is a participant from local database
    const userConversations = await ConversationParticipant.findAll({
      where: { userId: user.id },
      attributes: ['conversationId']
    });

    if (!userConversations || userConversations.length === 0) {
      return res.json([]);
    }

    const allConversationIds = userConversations.map((c: any) => c.conversationId);

    // Get top 50 most recent conversations from local database
    const conversations = await Conversation.findAll({
      where: { id: allConversationIds as any[] },
      attributes: ['id', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    const targetConversations = conversations || [];
    const targetIds = targetConversations.map(c => c.id);

    if (targetIds.length === 0) {
      return res.json([]);
    }

    // Bulk fetch all participants for these conversations from local database
    const allParticipants = await ConversationParticipant.findAll({
      where: {
        conversationId: targetIds as any[],
        userId: { [Op.ne]: user.id }
      },
      attributes: ['conversationId', 'userId']
    });

    // Bulk fetch profiles for these participants from local database
    const participantUserIds = [...new Set(allParticipants.map((p: any) => p.userId))];

    const profilesMap = new Map();
    if (participantUserIds.length > 0) {
      const profiles = await Profile.findAll({
        where: { id: participantUserIds as any[] },
        attributes: ['id', 'full_name', 'username', 'avatar_url', 'show_online_status']
      });

      profiles.forEach((p: any) => profilesMap.set(p.id, p));
    }

    // Group participants by conversation ID
    const conversationParticipants = new Map();
    (allParticipants || []).forEach((p: any) => {
      const profile = profilesMap.get(p.userId);
      if (profile) {
        if (!conversationParticipants.has(p.conversationId)) {
          conversationParticipants.set(p.conversationId, []);
        }
        conversationParticipants.get(p.conversationId).push({
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          username: profile.username || 'unknown',
          avatar_url: normalizeImageUrl(profile.avatar_url) || null,
          show_online_status: Boolean((profile as any).show_online_status ?? true)
        });
      }
    });

    // Bulk fetch unread counts for these conversations (to avoid N+1 problem)
    const unreadCountsMap = new Map();
    if (targetIds.length > 0) {
      try {
        const unreadCounts = await Message.findAll({
          where: {
            conversationId: targetIds as any[],
            senderId: { [Op.ne]: user.id },
            read: false
          },
          attributes: ['conversationId']
        });

        unreadCounts.forEach((msg: any) => {
          unreadCountsMap.set(msg.conversationId, (unreadCountsMap.get(msg.conversationId) || 0) + 1);
        });
      } catch {
        // Gracefully ignore - unread counts will be 0
      }
    }

    // Fetch latest messages for ALL conversations in one query (to avoid N+1 problem)
    const latestMessagesMap = new Map();
    if (targetIds.length > 0) {
      // Get latest messages for all conversations using raw SQL for better performance
      const allMessages = await sequelize.query(
        `SELECT m.id, m.content, m.created_at, m.sender_id as from_user_id, m.conversation_id, m.is_deleted,
                p.id as profile_id, p.full_name, p.username, p.avatar_url
         FROM messages m
         LEFT JOIN profiles p ON m.sender_id = p.id
         WHERE m.conversation_id = ANY($1)
         ORDER BY m.created_at DESC
         LIMIT $2`,
        {
          replacements: [targetIds, targetIds.length * 8],
          type: QueryTypes.SELECT
        }
      );

      // Skip message_trash for now - table may not exist in local DB
      // This can be added later if needed

      if (allMessages && allMessages.length > 0) {
        allMessages.forEach((msg: any) => {
          if (!latestMessagesMap.has(msg.conversation_id)) {
            latestMessagesMap.set(msg.conversation_id, msg);
          }
        });
      }
    }

    // Format conversations with their latest messages
    const blockedSet = new Set(await getBidirectionalBlockedIds(user.id));

    const formattedConversations = targetConversations
      .map((conv: any) => {
      const participants = conversationParticipants.get(conv.id) || [];
      // Hide 1:1 chats with blocked users
      if (participants.length === 1 && blockedSet.has(participants[0].id)) {
        return null;
      }
      const latestMsg = latestMessagesMap.get(conv.id);

      let latest_message = null;
      if (latestMsg) {
        const senderProfile = latestMsg.profiles;
        latest_message = {
          content: latestMsg.is_deleted ? 'Message deleted' : latestMsg.content,
          created_at: latestMsg.created_at,
          is_from_current_user: latestMsg.from_user_id === user.id,
          from_user: senderProfile ? {
            id: senderProfile.id,
            full_name: senderProfile.full_name || 'Unknown User',
            username: senderProfile.username || 'unknown',
            avatar_url: normalizeImageUrl(senderProfile.avatar_url) || null
          } : { id: latestMsg.from_user_id, full_name: 'Unknown', username: 'unknown', avatar_url: null }
        };
      }

      return {
        id: conv.id,
        participants,
        latest_message,
        unread_count: unreadCountsMap.get(conv.id) || 0,
        updated_at: conv.updated_at
      };
    })
      .filter(Boolean);

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
    const participant = await ConversationParticipant.findOne({
      where: {
        conversationId: conversationId,
        userId: user.id
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    const MESSAGE_PAGE_SIZE = 100;
    const viewerLang = await TranslationService.getUserLanguage(user.id);
    const autoTranslate = await TranslationService.userWantsAutoTranslate(user.id);

    // Latest N messages only (avoids loading entire history on open)
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        images,
        created_at,
        from_user_id,
        read,
        read_at,
        is_edited,
        edited_at,
        is_deleted,
        deleted_at,
        is_encrypted,
        ciphertext,
        language,
        profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (error) {
      if (error.code === '42P01') {
        return res.json([]);
      }
      // Fallback if edit/delete columns not yet migrated
      if (error.code === '42703' || error.message?.includes('column')) {
        const { data: fallbackMsgs, error: fallbackErr } = await supabase
          .from('messages')
          .select(`
            id, content, images, created_at, from_user_id,
            profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);
        if (fallbackErr) throw fallbackErr;
        const chronologicalFallback = [...(fallbackMsgs || [])].reverse();
        return res.json(chronologicalFallback.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          from_user_id: msg.from_user_id,
          is_from_current_user: msg.from_user_id === user.id,
          images: msg.images || [],
          is_edited: false,
          edited_at: null,
          is_deleted: false,
          deleted_at: null,
          from_user: {
            id: msg.profiles?.id || msg.from_user_id,
            full_name: msg.profiles?.full_name || 'Unknown User',
            username: msg.profiles?.username || 'unknown',
            avatar_url: normalizeImageUrl(msg.profiles?.avatar_url) || null
          }
        })));
      }
      throw error;
    }

    const chronological = [...(messages || [])].reverse();

    // Hide messages this user moved to trash ("delete for me")
    let hiddenIds = new Set<string>();
    try {
      const { data: hiddenRows } = await supabase
        .from('message_trash')
        .select('message_id')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .eq('scope', 'me');
      hiddenIds = new Set((hiddenRows || []).map((r: any) => r.message_id));
    } catch {
      /* trash table may not exist yet */
    }

    const visible = chronological.filter((m: any) => !hiddenIds.has(m.id));
    const messageIds = visible.map((m: any) => m.id);

    // Bulk-load reactions for this page
    const reactionsByMessage = new Map<string, Record<string, { count: number; reacted_by_me: boolean }>>();
    if (messageIds.length > 0) {
      const { data: reactionRows } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', messageIds);

      (reactionRows || []).forEach((r: any) => {
        if (!reactionsByMessage.has(r.message_id)) {
          reactionsByMessage.set(r.message_id, {});
        }
        const bucket = reactionsByMessage.get(r.message_id)!;
        if (!bucket[r.emoji]) {
          bucket[r.emoji] = { count: 0, reacted_by_me: false };
        }
        bucket[r.emoji].count += 1;
        if (r.user_id === user.id) bucket[r.emoji].reacted_by_me = true;
      });
    }

    const formattedMessages = await Promise.all(visible.map(async (msg: any) => {
      const isDeleted = Boolean(msg.is_deleted);
      const language = TranslationService.normalizeLang(msg.language);
      let translated_content: string | null = null;
      let translated_language: string | null = null;

      if (
        autoTranslate &&
        !isDeleted &&
        msg.content &&
        String(msg.content).trim() &&
        !String(msg.content).startsWith('🔒') &&
        msg.from_user_id !== user.id &&
        language !== viewerLang
      ) {
        try {
          const t = await TranslationService.translateContent(
            'message',
            msg.id,
            msg.content,
            viewerLang,
            language
          );
          if (t && t !== msg.content) {
            translated_content = t;
            translated_language = viewerLang;
          }
        } catch {
          /* keep original */
        }
      }

      return {
        id: msg.id,
        content: isDeleted ? null : msg.content,
        language,
        translated_content,
        translated_language,
        created_at: msg.created_at,
        from_user_id: msg.from_user_id,
        is_from_current_user: msg.from_user_id === user.id,
        images: isDeleted ? [] : (msg.images || []),
        read: Boolean(msg.read),
        read_at: msg.read_at || null,
        is_edited: Boolean(msg.is_edited),
        edited_at: msg.edited_at || null,
        is_deleted: isDeleted,
        deleted_at: msg.deleted_at || null,
        is_encrypted: Boolean(msg.is_encrypted),
        ciphertext: msg.ciphertext || null,
        reactions: reactionsByMessage.get(msg.id) || {},
        from_user: {
          id: msg.profiles?.id || msg.from_user_id,
          full_name: msg.profiles?.full_name || 'Unknown User',
          username: msg.profiles?.username || 'unknown',
          avatar_url: normalizeImageUrl(msg.profiles?.avatar_url) || null
        }
      };
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId } = req.params;
    const { content, images, is_encrypted, ciphertext, language: bodyLanguage } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasCipher = typeof ciphertext === 'string' && ciphertext.length > 0;
    const hasContent = content && typeof content === 'string' && content.trim().length > 0;
    const hasImages = Array.isArray(images) && images.length > 0;

    if (!hasContent && !hasImages && !hasCipher) {
      return res.status(400).json({ error: 'Message content or images required' });
    }

    const claimedLanguage = TranslationService.normalizeLang(
      bodyLanguage || (await TranslationService.getUserLanguage(user.id))
    );
    const sourceLanguage = hasContent
      ? await TranslationService.resolveSourceLanguage(content.trim(), claimedLanguage)
      : claimedLanguage;

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

    // Block check against other participants
    const { data: others } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id);

    if (others) {
      for (const p of others) {
        if (await areBlocked(user.id, p.user_id)) {
          return res.status(403).json({
            error: 'Cannot message this user due to a block',
            code: 'USER_BLOCKED',
          });
        }
      }
    }

    // Insert the message
    const insertData: any = {
      conversation_id: conversationId,
      from_user_id: user.id,
      content: hasContent ? content.trim() : '',
      created_at: new Date().toISOString(),
      read: false,
      language: sourceLanguage,
    };
    if (hasCipher) {
      insertData.is_encrypted = true;
      insertData.ciphertext = ciphertext;
    }

    // Only add images if the column exists and images are provided
    if (hasImages) {
      insertData.images = images;
    }

    let message: any;
    {
      const { data, error } = await supabase
        .from('messages')
        .insert(insertData)
        .select(`
          id,
          content,
          images,
          created_at,
          from_user_id,
          language,
          profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
        `)
        .single();

      if (error) {
        // Fallback if `language` or `read` column not migrated yet
        if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('language')) {
          delete insertData.language;
        }
        if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('read') || error.message?.includes('language')) {
          if (error.message?.includes('read') || String(error.details || '').includes('read')) {
            delete insertData.read;
          }
          const retry = await supabase
            .from('messages')
            .insert(insertData)
            .select(`
              id,
              content,
              images,
              created_at,
              from_user_id,
              profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
            `)
            .single();
          if (retry.error) {
            // last resort without language
            delete insertData.language;
            delete insertData.read;
            const retry2 = await supabase
              .from('messages')
              .insert(insertData)
              .select(`
                id, content, images, created_at, from_user_id,
                profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
              `)
              .single();
            if (retry2.error) throw retry2.error;
            message = retry2.data;
          } else {
            message = retry.data;
          }
        } else if (error.message?.includes('read')) {
          delete insertData.read;
          const retry = await supabase
            .from('messages')
            .insert(insertData)
            .select(`
              id,
              content,
              images,
              created_at,
              from_user_id,
              profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
            `)
            .single();
          if (retry.error) throw retry.error;
          message = retry.data;
        } else {
          throw error;
        }
      } else {
        message = data;
      }
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
      for (const participant of otherParticipants) {
        await NotificationService.message(
          user.id,
          participant.user_id,
          conversationId,
          message.id,
          content?.trim()
        );
      }
    }

    // Track daily mission progress
    DailyMissionService.trackProgress(user.id, 'send_message').catch(() => {});

    const messageLanguage = TranslationService.normalizeLang(
      (message as any).language || sourceLanguage
    );

    const formattedMessage: any = {
      id: message.id,
      content: message.content || '',
      language: messageLanguage,
      created_at: message.created_at,
      from_user_id: message.from_user_id,
      is_from_current_user: message.from_user_id === user.id,
      images: (message as any).images || [],
      read: false,
      read_at: null,
      is_encrypted: Boolean(hasCipher),
      ciphertext: hasCipher ? ciphertext : null,
      from_user: {
        id: (message as any).profiles?.id || message.from_user_id,
        full_name: (message as any).profiles?.full_name || 'Unknown User',
        username: (message as any).profiles?.username || 'unknown',
        avatar_url: normalizeImageUrl((message as any).profiles?.avatar_url) || null
      }
    };

    // Broadcast message to all participants via WebSocket for real-time delivery
    // Clear any live draft first so recipients don't see stale preview text.
    if (otherParticipants && otherParticipants.length > 0) {
      const onlineRecipientIds = otherParticipants
        .map((p) => p.user_id)
        .filter((recipientId) => wsManager.isUserOnline(recipientId));

      if (onlineRecipientIds.length > 0) {
        wsManager.broadcastToUsers(onlineRecipientIds, {
          type: 'draft_sent',
          payload: {
            conversationId,
            userId: user.id,
          },
        });
      }
    }

    // Personalized: each recipient gets an auto-translated copy in their language
    if (otherParticipants && otherParticipants.length > 0) {
      const plainContent =
        typeof formattedMessage.content === 'string' && formattedMessage.content.trim()
          ? formattedMessage.content
          : null;

      await Promise.all(
        otherParticipants.map(async (p) => {
          let translatedContent: string | null = null;
          let translatedLanguage: string | null = null;

          if (plainContent) {
            try {
              const result = await TranslationService.translateForRecipient({
                sourceType: 'message',
                sourceId: formattedMessage.id,
                content: plainContent,
                sourceLanguage: messageLanguage,
                recipientId: p.user_id,
              });
              translatedContent = result.translatedContent;
              translatedLanguage = result.translatedLanguage;
            } catch (e) {
              console.warn('translate for recipient failed:', e);
            }
          }

          wsManager.broadcastToUsers([p.user_id], {
            type: 'new_message' as const,
            payload: {
              conversationId,
              message: {
                id: formattedMessage.id,
                content: formattedMessage.content,
                language: messageLanguage,
                translatedContent,
                translatedLanguage,
                images: formattedMessage.images,
                isEncrypted: formattedMessage.is_encrypted,
                ciphertext: formattedMessage.ciphertext,
                fromUserId: formattedMessage.from_user_id,
                createdAt: new Date(formattedMessage.created_at),
                fromUser: {
                  id: formattedMessage.from_user.id,
                  name: formattedMessage.from_user.full_name,
                  username: formattedMessage.from_user.username,
                  avatar: formattedMessage.from_user.avatar_url || undefined,
                },
              },
            },
          });
        })
      );
      console.log(`💬 Broadcasted message to ${otherParticipants.length} recipient(s)`);
    }

    res.json(formattedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create or get conversation with another user
router.post('/conversations', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { otherUserId } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!otherUserId) {
      return res.status(400).json({ error: 'Other user ID is required' });
    }

    // Prevent messaging yourself
    if (otherUserId === user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    if (await areBlocked(user.id, otherUserId)) {
      return res.status(403).json({
        error: 'Cannot message this user due to a block',
        code: 'USER_BLOCKED',
      });
    }

    // Check if recipient allows messages from this user
    const messagePermission = await canSendMessage(user.id, otherUserId);
    if (!messagePermission.allowed) {
      return res.status(403).json({ 
        error: messagePermission.reason || 'You cannot send messages to this user',
        code: 'MESSAGE_NOT_ALLOWED'
      });
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
        avatar_url: normalizeImageUrl(otherUserProfile?.avatar_url) || null
      }],
      unread_count: 0
    });
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get users available for messaging (friends, pending requests, and contacts)
router.get('/users/online', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const onlineUserIds = new Set(wsManager.getOnlineUsers().filter(id => id !== user.id));

    // Friends (both DB schemas) + accepted requests fallback; pending outgoing = messageable
    const [friendIds, pendingOutgoingRaw] = await Promise.all([
      getAcceptedFriendIds(user.id),
      getPendingOutgoingIds(user.id),
    ]);
    const friendIdSet = new Set(friendIds);
    const pendingOutgoingIds = pendingOutgoingRaw.filter((id) => !friendIdSet.has(id));
    const pendingIdSet = new Set(pendingOutgoingIds);

    // Existing conversation partners
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

    let allUserIds = [...new Set([...friendIds, ...pendingOutgoingIds, ...conversationUserIds])];

    // Only pad with recent users when the user has almost nobody to message
    if (allUserIds.length === 0) {
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (recentUsers) {
        allUserIds = recentUsers.map(u => u.id);
      }
    }

    if (allUserIds.length === 0) {
      return res.json([]);
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, show_online_status')
      .in('id', allUserIds)
      .limit(150);

    if (error) {
      if (error.code === '42P01') {
        return res.json([]);
      }
      throw error;
    }

    const formattedUsers = (users || []).map((u: any) => {
      let relationship: 'friend' | 'pending' | 'contact' = 'contact';
      if (friendIdSet.has(u.id)) relationship = 'friend';
      else if (pendingIdSet.has(u.id)) relationship = 'pending';

      return {
        id: u.id,
        full_name: u.full_name || 'Unknown User',
        username: u.username || 'unknown',
        avatar_url: normalizeImageUrl(u.avatar_url),
        show_online_status: Boolean(u.show_online_status ?? true),
        isOnline: (u.show_online_status ?? true) ? onlineUserIds.has(u.id) : false,
        relationship,
      };
    });

    // Sort: friends → pending → online → alphabetical
    const rank = (u: { relationship: string; isOnline: boolean }) => {
      if (u.relationship === 'friend') return 0;
      if (u.relationship === 'pending') return 1;
      if (u.isOnline) return 2;
      return 3;
    };

    formattedUsers.sort((a: any, b: any) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Mark messages as read in a conversation
router.put('/conversations/:conversationId/read', auth, async (req: AuthRequest, res) => {
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
      return res.status(403).json({ error: 'Not authorized to mark messages as read in this conversation' });
    }

    // Mark all unread messages from other users as read
    const readAt = new Date().toISOString();
    let messageIds: string[] = [];

    try {
      const { data: unreadRows, error: fetchErr } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('from_user_id', user.id)
        .eq('read', false);

      if (fetchErr) {
        if (fetchErr.code === 'PGRST204' || fetchErr.code === '42703' || fetchErr.message?.includes('column') || fetchErr.message?.includes('schema cache')) {
          console.warn('Mark-as-read: "read" column not available. Skipping silently.');
          return res.json({ success: true, warning: 'read column not available' });
        }
        throw fetchErr;
      }

      messageIds = (unreadRows || []).map((r: any) => r.id as string);

      if (messageIds.length > 0) {
        const { error } = await supabase
          .from('messages')
          .update({ read: true, read_at: readAt })
          .in('id', messageIds);

        if (error) {
          if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache')) {
            console.warn('Mark-as-read: "read" column not available. Skipping silently.');
            return res.json({ success: true, warning: 'read column not available' });
          }
          throw error;
        }

        // Notify other participants so senders see double-check (read) instantly
        const { data: others } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id);

        if (others && others.length > 0) {
          wsManager.broadcastToUsers(
            others.map((p) => p.user_id),
            {
              type: 'message_read',
              payload: {
                conversationId,
                userId: user.id,
                readAt,
                messageIds,
              },
            }
          );
        }
      }
    } catch (dbError: any) {
      if (dbError?.code === 'PGRST204' || dbError?.code === '42703' || dbError?.message?.includes('column') || dbError?.message?.includes('schema cache')) {
        console.warn('Mark-as-read: "read" column not found. Skipping silently.');
        return res.json({ success: true, warning: 'read column not available' });
      }
      throw dbError;
    }

    res.json({ success: true, readAt, messageIds });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Typing indicator - also available under /api/messages/ prefix
router.post('/conversations/:conversationId/typing', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId } = req.params;
    const { isTyping, text } = req.body;

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

    const trimmedText = typeof text === 'string' ? text.slice(0, 500) : '';
    const livePreviewEnabled = await allowsLiveTypingPreview(user.id);

    // Get other participants to send typing indicator / live draft
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id);

    if (otherParticipants && otherParticipants.length > 0) {
      const recipientIds = otherParticipants
        .map((p) => p.user_id)
        .filter((recipientId) => wsManager.isUserOnline(recipientId));

      if (recipientIds.length > 0) {
        if (livePreviewEnabled) {
          wsManager.broadcastToUsers(recipientIds, {
            type:
              !isTyping || !trimmedText.trim()
                ? 'draft_stopped'
                : trimmedText.length <= 1
                ? 'draft_started'
                : 'draft_updated',
            payload: {
              conversationId,
              userId: user.id,
              text: trimmedText,
            }
          });
        } else {
          wsManager.broadcastToUsers(recipientIds, {
            type: 'typing' as const,
            payload: {
              conversationId,
              userId: user.id,
              isTyping: !!isTyping,
            }
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling typing indicator:', error);
    res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

async function assertConversationParticipant(conversationId: string, userId: string) {
  const { data: participant, error } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();
  return !error && !!participant;
}

async function getOtherParticipantIds(conversationId: string, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', userId);
  return (data || []).map((p) => p.user_id);
}

// Edit own message (within 15 minutes)
router.patch('/conversations/:conversationId/messages/:messageId', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId, messageId } = req.params;
    const { content, is_encrypted, ciphertext } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (!(await assertConversationParticipant(conversationId, user.id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('messages')
      .select('id, from_user_id, created_at, is_deleted, conversation_id, language, is_encrypted, ciphertext')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (existing.from_user_id !== user.id) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    if (existing.is_deleted) {
      return res.status(400).json({ error: 'Cannot edit a deleted message' });
    }

    const ageMs = Date.now() - new Date(existing.created_at).getTime();
    if (ageMs > MESSAGE_EDIT_WINDOW_MS) {
      return res.status(400).json({ error: 'Edit window expired (15 minutes)' });
    }

    const editedAt = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      content: content.trim(),
      is_edited: true,
      edited_at: editedAt,
    };

    if (typeof is_encrypted === 'boolean') {
      updatePayload.is_encrypted = is_encrypted;
      updatePayload.ciphertext = is_encrypted && ciphertext ? ciphertext : null;
    } else if (existing.is_encrypted && ciphertext) {
      updatePayload.ciphertext = ciphertext;
    }

    let row: any = null;
    {
      const { data: updated, error: updateError } = await supabase
        .from('messages')
        .update(updatePayload)
        .eq('id', messageId)
        .select(`
          id, content, images, created_at, from_user_id, is_edited, edited_at, is_deleted, deleted_at,
          is_encrypted, ciphertext,
          profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
        `)
        .single();

      if (updateError) {
        if ((updateError as any).code === '42703' || /is_encrypted|ciphertext/i.test(updateError.message || '')) {
          const soft = await supabase
            .from('messages')
            .update({
              content: content.trim(),
              is_edited: true,
              edited_at: editedAt,
            })
            .eq('id', messageId)
            .select(`
              id, content, images, created_at, from_user_id, is_edited, edited_at, is_deleted, deleted_at,
              profiles!messages_from_user_id_fkey(id, full_name, username, avatar_url)
            `)
            .single();
          if (soft.error) throw soft.error;
          row = soft.data;
        } else {
          throw updateError;
        }
      } else {
        row = updated;
      }
    }

    const formatted = {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      from_user_id: row.from_user_id,
      is_from_current_user: true,
      images: row.images || [],
      is_edited: true,
      edited_at: editedAt,
      is_deleted: false,
      deleted_at: null,
      is_encrypted: Boolean(row.is_encrypted ?? updatePayload.is_encrypted),
      ciphertext: row.ciphertext ?? updatePayload.ciphertext ?? null,
      from_user: {
        id: row.profiles?.id || row.from_user_id,
        full_name: row.profiles?.full_name || 'Unknown User',
        username: row.profiles?.username || 'unknown',
        avatar_url: normalizeImageUrl(row.profiles?.avatar_url) || null,
      },
    };

    const recipients = await getOtherParticipantIds(conversationId, user.id);
    if (recipients.length > 0) {
      // Personalized edit event: each recipient gets fresh translation of the new content
      await Promise.all(
        recipients.map(async (recipientId) => {
          let translatedContent: string | null = null;
          let translatedLanguage: string | null = null;
          try {
            const result = await TranslationService.translateForRecipient({
              content: formatted.content,
              sourceId: messageId,
              sourceType: 'message',
              recipientId,
              sourceLanguage: TranslationService.normalizeLang((existing as any).language),
            });
            translatedContent = result.translatedContent;
            translatedLanguage = result.translatedLanguage;
          } catch (e) {
            console.warn('translate edited message for recipient failed:', e);
          }

          wsManager.broadcastToUsers([recipientId], {
            type: 'message_edited',
            payload: {
              conversationId,
              messageId,
              content: formatted.content,
              isEdited: true,
              editedAt,
              translatedContent,
              translatedLanguage,
              language: TranslationService.normalizeLang((existing as any).language),
            },
          });
        })
      );
    }

    res.json(formatted);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Soft-delete message: scope=me (trash + hide) | scope=everyone (both sides)
router.delete('/conversations/:conversationId/messages/:messageId', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId, messageId } = req.params;
    const scopeRaw = (req.query?.scope as string) || req.body?.scope;
    const scope = (scopeRaw === 'everyone' ? 'everyone' : 'me') as 'me' | 'everyone';

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!(await assertConversationParticipant(conversationId, user.id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('messages')
      .select('id, from_user_id, is_deleted, conversation_id, content, images, created_at, is_encrypted, ciphertext')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (existing.is_deleted && scope === 'everyone') {
      return res.json({ success: true, alreadyDeleted: true, scope: 'everyone' });
    }

    // Delete for everyone: only the sender
    if (scope === 'everyone' && existing.from_user_id !== user.id) {
      return res.status(403).json({ error: 'Only the sender can delete for everyone' });
    }

    const deletedAt = new Date().toISOString();
    const contentSnapshot =
      existing.is_encrypted && existing.ciphertext
        ? existing.ciphertext
        : existing.content || '';
    const imagesSnapshot = Array.isArray(existing.images) ? existing.images : [];

    const saveTrashCopy = async () => {
      const { error: trashError } = await supabase.from('message_trash').upsert(
        {
          message_id: messageId,
          user_id: user.id,
          conversation_id: conversationId,
          from_user_id: existing.from_user_id,
          content_snapshot: contentSnapshot,
          images_snapshot: imagesSnapshot,
          created_at_snapshot: existing.created_at,
          scope,
          deleted_at: deletedAt,
        },
        { onConflict: 'message_id,user_id' }
      );
      return trashError;
    };

    if (scope === 'everyone') {
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: deletedAt,
          deleted_by: user.id,
          deleted_scope: 'everyone',
          content: '',
          images: [],
          ciphertext: null,
        })
        .eq('id', messageId);

      if (updateError) throw updateError;

      const trashError = await saveTrashCopy();
      if (trashError) {
        console.warn('message_trash upsert (everyone):', trashError.message);
      }

      const recipients = await getOtherParticipantIds(conversationId, user.id);
      if (recipients.length > 0) {
        wsManager.broadcastToUsers(recipients, {
          type: 'message_deleted',
          payload: {
            conversationId,
            messageId,
            isDeleted: true,
            deletedAt,
            scope: 'everyone',
            deletedBy: user.id,
          },
        });

        for (const recipientId of recipients) {
          try {
            await NotificationService.create({
              type: 'message',
              senderId: user.id,
              receiverId: recipientId,
              conversationId,
              messageId,
              title: 'Message deleted',
              message: 'A message was deleted in your conversation',
              metadata: { action: 'message_deleted' },
            });
          } catch (notifErr) {
            console.warn('delete notification failed:', notifErr);
          }
        }
      }

      wsManager.sendToUser(user.id, {
        type: 'message_deleted',
        payload: {
          conversationId,
          messageId,
          isDeleted: true,
          deletedAt,
          scope: 'everyone',
          deletedBy: user.id,
        },
      });

      return res.json({
        id: messageId,
        content: null,
        is_deleted: true,
        deleted_at: deletedAt,
        scope: 'everyone',
        hidden_for_me: true,
        trash_saved: !trashError,
      });
    }

    // Delete for me only — requires trash table so it persists + hides on reload
    const trashError = await saveTrashCopy();
    if (trashError) {
      const missing =
        trashError.code === '42P01' ||
        /relation .*message_trash.* does not exist/i.test(trashError.message || '') ||
        /Could not find the table/i.test(trashError.message || '');
      console.error('message_trash upsert failed:', trashError);
      return res.status(missing ? 503 : 500).json({
        error: missing
          ? 'Message trash is not set up. Apply migration 20260716_message_trash.sql in the Supabase SQL editor, then try again.'
          : trashError.message || 'Failed to move message to trash',
        code: trashError.code,
        trash_unavailable: missing,
        snapshot: missing
          ? {
              message_id: messageId,
              conversation_id: conversationId,
              from_user_id: existing.from_user_id,
              content: contentSnapshot,
              images: imagesSnapshot,
              created_at: existing.created_at,
              scope: 'me',
              deleted_at: deletedAt,
            }
          : undefined,
      });
    }

    wsManager.sendToUser(user.id, {
      type: 'message_hidden',
      payload: {
        conversationId,
        messageId,
        deletedAt,
        scope: 'me',
      },
    });

    res.json({
      id: messageId,
      scope: 'me',
      hidden_for_me: true,
      deleted_at: deletedAt,
      trash_saved: true,
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// List messages in current user's trash
router.get('/trash', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('message_trash')
      .select(
        'id, message_id, conversation_id, from_user_id, content_snapshot, images_snapshot, created_at_snapshot, scope, deleted_at'
      )
      .eq('user_id', user.id)
      .order('deleted_at', { ascending: false })
      .limit(100);

    if (error) {
      const missing =
        error.code === '42P01' ||
        /relation .*message_trash.* does not exist/i.test(error.message || '') ||
        /Could not find the table/i.test(error.message || '');
      if (missing) {
        return res.status(503).json({
          error:
            'Message trash is not set up. Apply migration 20260716_message_trash.sql then try again.',
          code: error.code,
        });
      }
      throw error;
    }

    const fromIds = [...new Set((data || []).map((r: any) => r.from_user_id).filter(Boolean))];
    const profilesMap = new Map<string, any>();
    if (fromIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', fromIds);
      (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
    }

    res.json(
      (data || []).map((row: any) => {
        const profile = profilesMap.get(row.from_user_id);
        return {
          id: row.id,
          message_id: row.message_id,
          conversation_id: row.conversation_id,
          content: row.content_snapshot,
          images: row.images_snapshot || [],
          created_at: row.created_at_snapshot,
          deleted_at: row.deleted_at,
          scope: row.scope,
          from_user_id: row.from_user_id,
          is_from_current_user: row.from_user_id === user.id,
          from_user: {
            id: profile?.id || row.from_user_id,
            full_name: profile?.full_name || 'Unknown User',
            username: profile?.username || 'unknown',
            avatar_url: normalizeImageUrl(profile?.avatar_url) || null,
          },
        };
      })
    );
  } catch (error) {
    console.error('Error fetching trash:', error);
    res.status(500).json({ error: 'Failed to fetch trash' });
  }
});

// Permanently remove from trash
router.delete('/trash/:trashId', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { trashId } = req.params;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabase
      .from('message_trash')
      .delete()
      .eq('id', trashId)
      .eq('user_id', user.id);

    if (error) {
      if (error.code === '42P01') return res.json({ success: true });
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error emptying trash item:', error);
    res.status(500).json({ error: 'Failed to delete from trash' });
  }
});

const MESSAGE_REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '🎉'];

async function getMessageReactionSummary(messageId: string, userId: string) {
  const { data: rows } = await supabase
    .from('message_reactions')
    .select('emoji, user_id')
    .eq('message_id', messageId);

  const summary: Record<string, { count: number; reacted_by_me: boolean }> = {};
  (rows || []).forEach((r: any) => {
    if (!summary[r.emoji]) summary[r.emoji] = { count: 0, reacted_by_me: false };
    summary[r.emoji].count += 1;
    if (r.user_id === userId) summary[r.emoji].reacted_by_me = true;
  });
  return summary;
}

// Toggle reaction on a message
router.post('/conversations/:conversationId/messages/:messageId/reactions', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { conversationId, messageId } = req.params;
    const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() : '';

    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!MESSAGE_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji', allowed: MESSAGE_REACTION_EMOJIS });
    }
    if (!(await assertConversationParticipant(conversationId, user.id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: msg } = await supabase
      .from('messages')
      .select('id, is_deleted')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (!msg || msg.is_deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      // One reaction type per user per message: replace prior emoji if any
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);

      const { error: insertErr } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
      if (insertErr) {
        if (insertErr.code === '42P01') {
          return res.status(503).json({ error: 'Reactions not available. Apply migration.' });
        }
        throw insertErr;
      }
    }

    const reactions = await getMessageReactionSummary(messageId, user.id);
    const recipients = await getOtherParticipantIds(conversationId, user.id);
    const payload = { conversationId, messageId, reactions };
    wsManager.broadcastToUsers([...recipients, user.id], {
      type: 'message_reaction',
      payload,
    });

    res.json({ messageId, reactions });
  } catch (error) {
    console.error('Error reacting to message:', error);
    res.status(500).json({ error: 'Failed to react to message' });
  }
});

export default router;
