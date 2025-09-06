export interface Notification {
  id: string;
  type: 'friend_request' | 'post_like' | 'post_comment' | 'comment_like';
  sender_id: string;
  receiver_id: string;
  post_id?: string;
  comment_id?: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
} 