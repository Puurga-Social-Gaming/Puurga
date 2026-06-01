import { supabase } from '../lib/supabaseClient';
import api from '../lib/axios';
import { NotificationPreferences } from '../types/notification';

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
};

export const acceptFriendRequest = async (senderId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('friends')
    .insert([
      { user_id: senderId, friend_id: user.id },
      { user_id: user.id, friend_id: senderId }
    ]);
  if (error) throw error;
};

export const rejectFriendRequest = async (senderId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('sender_id', senderId)
    .eq('receiver_id', user.id);
  if (error) throw error;
};

// ── Notification Preferences ──────────────────────────────

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.get('/notifications/preferences');
  return response.data;
};

export const updateNotificationPreferences = async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
  const response = await api.put('/notifications/preferences', { preferences });
  return response.data;
};

// ── Push Subscription ─────────────────────────────────────

export const subscribePush = async (subscription: PushSubscription): Promise<void> => {
  const sub = subscription.toJSON() as any;
  await api.post('/notifications/push/subscribe', {
    endpoint: sub.endpoint,
    p256dh: sub.keys?.p256dh || '',
    auth: sub.keys?.auth || '',
  });
};

export const unsubscribePush = async (endpoint: string): Promise<void> => {
  await api.post('/notifications/push/unsubscribe', { endpoint });
};


