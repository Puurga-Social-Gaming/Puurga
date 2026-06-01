import { NotificationService, NotificationType } from '../services/notificationService';

interface CreateNotificationParams {
  type: NotificationType;
  senderId: string;
  receiverId: string;
  postId?: string;
  commentId?: string;
  conversationId?: string;
  messageId?: string;
  friendRequestId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return NotificationService.create({
    type: params.type,
    senderId: params.senderId,
    receiverId: params.receiverId,
    postId: params.postId,
    commentId: params.commentId,
    conversationId: params.conversationId,
    messageId: params.messageId,
    friendRequestId: params.friendRequestId,
  });
}
