import { supabase } from '../config/supabase';

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
  type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment';
  senderId: string;
  receiverId: string;
  friendRequestId?: string;
  postId?: string;
  commentId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { type, senderId, receiverId, friendRequestId, postId, commentId } = params;

    // Create notification in database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        type,
        sender_id: senderId,
        receiver_id: receiverId,
        friend_request_id: friendRequestId,
        post_id: postId,
        comment_id: commentId,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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
            type: notification.type as 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' | 'message',
            fromUser: {
              id: senderProfile.id,
              name: senderProfile.full_name || 'Unknown User',
              username: senderProfile.username || 'unknown',
              avatar: senderProfile.avatar_url || undefined
            },
            data: {
              friendRequestId: friendRequestId || undefined,
              postId: postId || undefined,
              commentId: commentId || undefined
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
