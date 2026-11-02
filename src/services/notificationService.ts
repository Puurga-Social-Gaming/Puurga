import api from '../lib/axios';
import { NotificationPreferences } from '../types/notification';

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


