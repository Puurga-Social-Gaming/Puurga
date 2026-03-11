import { supabase } from '../config/supabase';
import { normalizeImageUrl } from '../utils/url';

// Lazy load wsManager to avoid circular dependency
let wsManager: any = null;

function getWsManager() {
  if (!wsManager) {
    try {
      wsManager = require('../websocketManager').wsManager;
    } catch (e) {
      console.warn('WebSocket manager not available yet');
      return null;
    }
  }
  return wsManager;
}

interface CreateNotificationParams {
  type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' | 'redemption' | 'redemption_contribution' | 'friend_ghosted' | 'purge' | 'message';
  senderId: string;
  receiverId: string;
  postId?: string;
  commentId?: string;
  conversationId?: string;
  messageId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { type, senderId, receiverId, postId, commentId, conversationId, messageId } = params;

    // Build row safely — only include columns that exist
    const row: Record<string, any> = {
      type,
      sender_id: senderId,
      receiver_id: receiverId,
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (postId) row.post_id = postId;
    if (commentId) row.comment_id = commentId;
    if (conversationId) row.conversation_id = conversationId;
    if (messageId) row.message_id = messageId;

    // Create notification in database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    // Fetch sender profile for WebSocket notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', senderId)
      .single();

    if (senderProfile) {
      const wsManager = getWsManager();
      if (wsManager) {
        try {
          // Send live notification via WebSocket
          // Build notification payload that matches NotificationPayload interface
          const notificationPayload = {
            id: notification.id,
            type: notification.type as 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' | 'message' | 'redemption' | 'redemption_contribution' | 'friend_ghosted' | 'purge',
            fromUser: {
              id: senderProfile.id,
              name: senderProfile.full_name || 'Unknown User',
              username: senderProfile.username || 'unknown',
              avatar: normalizeImageUrl(senderProfile.avatar_url) || undefined
            },
            data: {
              postId: postId || undefined,
              commentId: commentId || undefined,
              conversationId: conversationId || undefined,
              messageId: messageId || undefined
            },
            createdAt: notification.created_at
          };

          // Only send if wsManager has the method (might not be initialized yet)
          if (typeof wsManager.sendNotification === 'function') {
            wsManager.sendNotification(receiverId, notificationPayload);
            console.log(`Live notification sent to user ${receiverId} for type: ${type}`);
          } else {
            console.warn('WebSocket manager not yet initialized, WebSocket notification skipped');
          }
        } catch (wsError) {
          console.error('Error sending WebSocket notification:', wsError);
          // Don't fail the entire operation if WebSocket notification fails
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}
