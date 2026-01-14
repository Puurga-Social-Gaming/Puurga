import { supabase } from '../config/supabase';
import { wsManager } from '../websocketManager';

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

    if (senderProfile && wsManager) {
      // Send live notification via WebSocket
      const liveNotification = {
        id: notification.id,
        type: notification.type,
        fromUser: {
          id: senderProfile.id,
          name: senderProfile.full_name || '',
          username: senderProfile.username || '',
          avatar: senderProfile.avatar_url || ''
        },
        data: {
          friendRequestId,
          postId,
          commentId
        },
        createdAt: notification.created_at
      };

      wsManager.sendNotification(receiverId, liveNotification);
      console.log(`Live notification sent to user ${receiverId}:`, liveNotification);
    }

    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}
