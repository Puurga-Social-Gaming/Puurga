import express from 'express';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { wsManager } from '../websocketManager';
import { normalizeImageUrl } from '../utils/url';
import { allowsLiveTypingPreview, canSendMessage } from '../services/settingsService';
import { NotificationService } from '../services/notificationService';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import { areBlocked, getBidirectionalBlockedIds } from '../utils/friendRelations';
import { TranslationService } from '../services/translationService';
import { DailyMissionService } from '../services/dailyMissionService';
import { Message, Conversation, ConversationParticipant, User, Profile, Friendship, FriendRequest, sequelize, Op } from '../models';
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
         WHERE m.conversation_id = ANY(CAST(:ids AS UUID[]))
         ORDER BY m.created_at DESC
         LIMIT :lim`,
        {
          replacements: { ids: targetIds, lim: targetIds.length * 8 },
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
    const messagesRows = await sequelize.query(
      `SELECT m.id, m.content, m.images, m.created_at, m.sender_id AS from_user_id,
              m.read, m.read_at, m.is_edited, m.edited_at, m.is_deleted, m.deleted_at,
              m.is_encrypted, m.ciphertext, m.language,
              p.id AS profile_id, p.full_name, p.username, p.avatar_url
       FROM messages m
       LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.conversation_id = :conversationId
       ORDER BY m.created_at DESC
       LIMIT :limit`,
      { replacements: { conversationId, limit: MESSAGE_PAGE_SIZE }, type: QueryTypes.SELECT }
    );

    const messages = (messagesRows as any[]).map((m) => ({
      id: m.id,
      content: m.content,
      images: m.images || [],
      created_at: m.created_at,
      from_user_id: m.from_user_id,
      read: m.read,
      read_at: m.read_at,
      is_edited: m.is_edited,
      edited_at: m.edited_at,
      is_deleted: m.is_deleted,
      deleted_at: m.deleted_at,
      is_encrypted: m.is_encrypted,
      ciphertext: m.ciphertext,
      language: m.language,
      profiles: m.profile_id ? {
        id: m.profile_id,
        full_name: m.full_name,
        username: m.username,
        avatar_url: m.avatar_url,
      } : null,
    }));

    const chronological = [...(messages || [])].reverse();

    // Hide messages this user moved to trash ("delete for me")
    let hiddenIds = new Set<string>();
    try {
      const hiddenRows = await sequelize.query(
        `SELECT message_id FROM message_trash
         WHERE user_id = :userId AND conversation_id = :conversationId AND scope = 'me'`,
        { replacements: { userId: user.id, conversationId }, type: QueryTypes.SELECT }
      );
      hiddenIds = new Set((hiddenRows as any[]).map((r) => r.message_id));
    } catch {
      /* trash table may not exist yet */
    }

    const visible = chronological.filter((m: any) => !hiddenIds.has(m.id));
    const messageIds = visible.map((m: any) => m.id);

    // Bulk-load reactions for this page
    const reactionsByMessage = new Map<string, Record<string, { count: number; reacted_by_me: boolean }>>();
    if (messageIds.length > 0) {
      const reactionRows = await sequelize.query(
        `SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id IN (:messageIds)`,
        { replacements: { messageIds }, type: QueryTypes.SELECT }
      );

      (reactionRows as any[]).forEach((r) => {
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
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId: user.id }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
    }

    // Get other participants (used for block checks and notifications)
    const otherParticipantRows = await ConversationParticipant.findAll({
      where: { conversationId, userId: { [Op.ne]: user.id } },
      attributes: ['userId'],
    });
    const otherParticipants = otherParticipantRows.map((p) => ({ user_id: p.userId }));

    // Block check against other participants
    if (otherParticipants.length > 0) {
      for (const p of otherParticipants) {
        if (await areBlocked(user.id, p.user_id)) {
          return res.status(403).json({
            error: 'Cannot message this user due to a block',
            code: 'USER_BLOCKED',
          });
        }
      }
    }

    // Insert the message
    let message: any;
    {
      const insertedRows = await sequelize.query(
        `INSERT INTO messages (id, conversation_id, sender_id, content, created_at, updated_at, read, language, is_encrypted, ciphertext, images)
         VALUES (gen_random_uuid(), :conversationId, :senderId, :content, :createdAt, :createdAt, false, :language, :isEncrypted, :ciphertext, CAST(:images AS JSONB))
         RETURNING id, content, images, created_at, language`,
        {
          replacements: {
            conversationId,
            senderId: user.id,
            content: hasContent ? content.trim() : '',
            createdAt: new Date(),
            language: sourceLanguage,
            isEncrypted: hasCipher,
            ciphertext: hasCipher ? ciphertext : null,
            images: hasImages ? JSON.stringify(images) : null,
          },
          type: QueryTypes.SELECT,
        }
      );
      const inserted = (insertedRows as any[])[0];
      const profile = await Profile.findOne({ where: { id: user.id }, attributes: ['id', 'full_name', 'username', 'avatar_url'] });
      message = {
        id: inserted.id,
        content: inserted.content,
        images: inserted.images || [],
        created_at: inserted.created_at,
        from_user_id: user.id,
        language: inserted.language,
        profiles: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        } : null,
      };
    }

    // Update conversation's updated_at timestamp
    await Conversation.update(
      { updatedAt: new Date() },
      { where: { id: conversationId } }
    );

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
              claimedLanguage: messageLanguage,
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
    let conversationId: string | null = null;

    const myRows = await ConversationParticipant.findAll({
      where: { userId: user.id },
      attributes: ['conversationId'],
    });
    const myConvIds = myRows.map((r) => r.conversationId);

    if (myConvIds.length > 0) {
      const shared = await ConversationParticipant.findOne({
        where: { conversationId: { [Op.in]: myConvIds }, userId: otherUserId },
        attributes: ['conversationId'],
      });
      if (shared) {
        conversationId = shared.conversationId;
      }
    }

    // If no existing conversation, create a new one
    if (!conversationId) {
      const newConversation = await Conversation.create({ isGroup: false });
      const createdId = (newConversation as any).id as string;
      conversationId = createdId;

      await ConversationParticipant.bulkCreate([
        { conversationId: createdId, userId: user.id },
        { conversationId: createdId, userId: otherUserId },
      ]);
    }

    // Get the other user's profile info
    const otherUserProfile = await Profile.findOne({
      where: { id: otherUserId },
      attributes: ['id', 'full_name', 'username', 'avatar_url'],
    });

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

    // -- 1. Friends (local Postgres - friendships table) --
    const localFriendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { user_id: user.id },
          { friend_id: user.id },
        ],
      },
      attributes: ['user_id', 'friend_id'],
    });
    const friendSet = new Set<string>(
      (localFriendships || [])
        .map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
        .filter((id: string) => id && id !== user.id)
    );

    // -- 2. Pending outgoing requests (still messageable) --
    const localPendingRequests = await FriendRequest.findAll({
      where: { sender_id: user.id, status: 'pending' },
      attributes: ['receiver_id'],
    });
    const pendingSet = new Set<string>(
      (localPendingRequests || [])
        .map((r: any) => r.receiver_id)
        .filter((id: string) => id && id !== user.id && !friendSet.has(id))
    );

    // -- 3. Existing conversation partners --
    const conversationSet = new Set<string>();
    const myParticipants = await ConversationParticipant.findAll({
      where: { userId: user.id },
      attributes: ['conversationId'],
    });
    if (myParticipants && myParticipants.length > 0) {
      const convIds = myParticipants.map((c: any) => c.conversationId);
      const others = await ConversationParticipant.findAll({
        where: { conversationId: convIds, userId: { [Op.ne]: user.id } },
        attributes: ['userId'],
      });
      for (const c of others || []) {
        if ((c as any).userId && (c as any).userId !== user.id) {
          conversationSet.add((c as any).userId);
        }
      }
    }

    // -- 4. Combine all candidate IDs --
    let allUserIds = [...new Set<string>([...friendSet, ...pendingSet, ...conversationSet])];

    // -- 5. Only pad with recent users when the user has almost nobody to message --
    if (allUserIds.length === 0) {
      const recentLocal = await Profile.findAll({
        where: { id: { [Op.ne]: user.id } },
        attributes: ['id'],
        order: [['created_at', 'DESC']],
        limit: 15,
      });
      allUserIds = (recentLocal || []).map((p: any) => p.id);
    }

    if (allUserIds.length === 0) {
      return res.json([]);
    }

    // -- 6. Fetch user detail rows from local Postgres (profiles) --
    const localUsers = await Profile.findAll({
      where: { id: allUserIds },
      attributes: ['id', 'full_name', 'username', 'avatar_url', 'show_online_status'],
    });
    const userMap = new Map<string, any>();
    for (const u of localUsers) userMap.set(u.id, u);

    const formattedUsers: any[] = [];
    for (const id of allUserIds) {
      const u = userMap.get(id);
      if (!u) continue;

      let relationship: 'friend' | 'pending' | 'contact' = 'contact';
      if (friendSet.has(id)) relationship = 'friend';
      else if (pendingSet.has(id)) relationship = 'pending';

      const showOnline = u.show_online_status !== undefined && u.show_online_status !== null
        ? !!u.show_online_status
        : true;

      formattedUsers.push({
        id,
        full_name: u.full_name || 'Unknown User',
        username: u.username || 'unknown',
        avatar_url: normalizeImageUrl(u.avatar_url),
        show_online_status: showOnline,
        isOnline: showOnline ? onlineUserIds.has(id) : false,
        relationship,
      });
    }

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
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId: user.id }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized to mark messages as read in this conversation' });
    }

    // Mark all unread messages from other users as read
    const readAt = new Date().toISOString();
    let messageIds: string[] = [];

    const unreadRows = await sequelize.query(
      `SELECT id FROM messages
       WHERE conversation_id = :conversationId AND sender_id != :userId AND read = false`,
      { replacements: { conversationId, userId: user.id }, type: QueryTypes.SELECT }
    );
    messageIds = (unreadRows as any[]).map((r) => r.id as string);

    if (messageIds.length > 0) {
      await sequelize.query(
        `UPDATE messages SET read = true, read_at = :readAt WHERE id IN (:messageIds)`,
        { replacements: { readAt, messageIds }, type: QueryTypes.UPDATE }
      );

      // Notify other participants so senders see double-check (read) instantly
      const others = await ConversationParticipant.findAll({
        where: { conversationId, userId: { [Op.ne]: user.id } },
        attributes: ['userId'],
      });
      const otherIds = others.map((p) => p.userId);

      if (otherIds.length > 0) {
        wsManager.broadcastToUsers(
          otherIds,
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
    const participant = await ConversationParticipant.findOne({
      where: { conversationId, userId: user.id }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const trimmedText = typeof text === 'string' ? text.slice(0, 500) : '';
    const livePreviewEnabled = await allowsLiveTypingPreview(user.id);

    // Get other participants to send typing indicator / live draft
    const otherParticipantRows = await ConversationParticipant.findAll({
      where: { conversationId, userId: { [Op.ne]: user.id } },
      attributes: ['userId'],
    });
    const otherParticipants = otherParticipantRows.map((p) => ({ user_id: p.userId }));

    if (otherParticipants.length > 0) {
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
  const participant = await ConversationParticipant.findOne({
    where: { conversationId, userId }
  });
  return !!participant;
}

async function getOtherParticipantIds(conversationId: string, userId: string): Promise<string[]> {
  const rows = await ConversationParticipant.findAll({
    where: { conversationId, userId: { [Op.ne]: userId } },
    attributes: ['userId'],
  });
  return rows.map((p) => p.userId);
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

    const existingRows = await sequelize.query(
      `SELECT id, sender_id AS from_user_id, created_at, is_deleted, conversation_id, language, is_encrypted, ciphertext
       FROM messages WHERE id = :messageId AND conversation_id = :conversationId`,
      { replacements: { messageId, conversationId }, type: QueryTypes.SELECT }
    );
    const existing = (existingRows as any[])[0];

    if (!existing) {
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
      await sequelize.query(
        `UPDATE messages SET content = :content, is_edited = true, edited_at = :editedAt,
           is_encrypted = :isEncrypted, ciphertext = :ciphertext
         WHERE id = :messageId AND conversation_id = :conversationId`,
        {
          replacements: {
            content: content.trim(),
            editedAt,
            isEncrypted: updatePayload.is_encrypted ?? existing.is_encrypted,
            ciphertext: updatePayload.ciphertext ?? null,
            messageId,
            conversationId,
          },
          type: QueryTypes.UPDATE,
        }
      );

      const updatedRows = await sequelize.query(
        `SELECT m.id, m.content, m.images, m.created_at, m.sender_id AS from_user_id,
                m.is_edited, m.edited_at, m.is_deleted, m.deleted_at, m.is_encrypted, m.ciphertext,
                p.id AS profile_id, p.full_name, p.username, p.avatar_url
         FROM messages m
         LEFT JOIN profiles p ON m.sender_id = p.id
         WHERE m.id = :messageId`,
        { replacements: { messageId }, type: QueryTypes.SELECT }
      );
      const updated = (updatedRows as any[])[0];
      row = {
        ...updated,
        profiles: updated.profile_id ? {
          id: updated.profile_id,
          full_name: updated.full_name,
          username: updated.username,
          avatar_url: updated.avatar_url,
        } : null,
      };
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
              claimedLanguage: TranslationService.normalizeLang((existing as any).language),
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

    const existingRows = await sequelize.query(
      `SELECT id, sender_id AS from_user_id, is_deleted, conversation_id, content, images, created_at, is_encrypted, ciphertext
       FROM messages WHERE id = :messageId AND conversation_id = :conversationId`,
      { replacements: { messageId, conversationId }, type: QueryTypes.SELECT }
    );
    const existing = (existingRows as any[])[0];

    if (!existing) {
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

    const saveTrashCopy = async (): Promise<any> => {
      try {
        await sequelize.query(
          `INSERT INTO message_trash
             (message_id, user_id, conversation_id, from_user_id, content_snapshot,
              images_snapshot, created_at_snapshot, scope, deleted_at)
           VALUES (:messageId, :userId, :conversationId, :fromUserId, :contentSnapshot,
                   CAST(:imagesSnapshot AS JSONB), :createdAtSnapshot, :scope, :deletedAt)
           ON CONFLICT (message_id, user_id)
           DO UPDATE SET content_snapshot = EXCLUDED.content_snapshot,
                         images_snapshot = EXCLUDED.images_snapshot,
                         created_at_snapshot = EXCLUDED.created_at_snapshot,
                         scope = EXCLUDED.scope,
                         deleted_at = EXCLUDED.deleted_at`,
          {
            replacements: {
              messageId,
              userId: user.id,
              conversationId,
              fromUserId: existing.from_user_id,
              contentSnapshot,
              imagesSnapshot: JSON.stringify(imagesSnapshot),
              createdAtSnapshot: existing.created_at,
              scope,
              deletedAt,
            },
            type: QueryTypes.INSERT,
          }
        );
        return null;
      } catch (e: any) {
        return e;
      }
    };

    if (scope === 'everyone') {
      await sequelize.query(
        `UPDATE messages SET is_deleted = true, deleted_at = :deletedAt,
           content = '', ciphertext = null, images = '[]'::jsonb
         WHERE id = :messageId`,
        { replacements: { deletedAt, messageId }, type: QueryTypes.UPDATE }
      );

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
          ? 'Message trash is not set up. Apply migration 20260716_message_trash.sql in the supabaseClient SQL editor, then try again.'
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

    const data = await sequelize.query(
      `SELECT id, message_id, conversation_id, from_user_id, content_snapshot, images_snapshot, created_at_snapshot, scope, deleted_at
       FROM message_trash
       WHERE user_id = :userId
       ORDER BY deleted_at DESC
       LIMIT 100`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    );

    const fromIds = [...new Set((data as any[]).map((r: any) => r.from_user_id).filter(Boolean))];
    const profilesMap = new Map<string, any>();
    if (fromIds.length > 0) {
      const profiles = await Profile.findAll({
        where: { id: fromIds },
        attributes: ['id', 'full_name', 'username', 'avatar_url'],
      });
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

    await sequelize.query(
      `DELETE FROM message_trash WHERE id = :trashId AND user_id = :userId`,
      { replacements: { trashId, userId: user.id }, type: QueryTypes.DELETE }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error emptying trash item:', error);
    res.status(500).json({ error: 'Failed to delete from trash' });
  }
});

const MESSAGE_REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '🎉'];

async function getMessageReactionSummary(messageId: string, userId: string) {
  const rows = await sequelize.query(
    `SELECT emoji, user_id FROM message_reactions WHERE message_id = :messageId`,
    { replacements: { messageId }, type: QueryTypes.SELECT }
  );

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

    const msgRows = await sequelize.query(
      `SELECT id, is_deleted FROM messages WHERE id = :messageId AND conversation_id = :conversationId`,
      { replacements: { messageId, conversationId }, type: QueryTypes.SELECT }
    );
    const msg = (msgRows as any[])[0];

    if (!msg || msg.is_deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const existingRows = await sequelize.query(
      `SELECT id FROM message_reactions WHERE message_id = :messageId AND user_id = :userId AND emoji = :emoji`,
      { replacements: { messageId, userId: user.id, emoji }, type: QueryTypes.SELECT }
    );
    const existing = (existingRows as any[])[0];

    if (existing) {
      await sequelize.query(
        `DELETE FROM message_reactions WHERE id = :id`,
        { replacements: { id: existing.id }, type: QueryTypes.DELETE }
      );
    } else {
      // One reaction type per user per message: replace prior emoji if any
      await sequelize.query(
        `DELETE FROM message_reactions WHERE message_id = :messageId AND user_id = :userId`,
        { replacements: { messageId, userId: user.id }, type: QueryTypes.DELETE }
      );

      await sequelize.query(
        `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (:messageId, :userId, :emoji)`,
        { replacements: { messageId, userId: user.id, emoji }, type: QueryTypes.INSERT }
      );
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
