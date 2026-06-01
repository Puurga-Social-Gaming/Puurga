import { supabase } from '../config/supabase';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
}

export class PushNotificationService {
  private static vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private static webPush: any = null;

  static initialize(publicKey: string, privateKey: string) {
    this.vapidKeys = { publicKey, privateKey };
    try {
      this.webPush = require('web-push');
      this.webPush.setVapidDetails(
        'mailto:support@puurga.com',
        publicKey,
        privateKey
      );
      console.log('✅ Web Push initialized');
    } catch {
      console.warn('⚠️ web-push package not installed. Push notifications disabled.');
      console.warn('   Install with: npm install web-push');
      console.warn('   Generate keys: npx web-push generate-vapid-keys');
    }
  }

  static getVapidPublicKey(): string | null {
    return this.vapidKeys?.publicKey || null;
  }

  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.webPush) {
      console.warn('Web Push not initialized, skipping push notification');
      return;
    }

    try {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);

      if (!subscriptions || subscriptions.length === 0) return;

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        data: payload.data || {},
        tag: payload.tag || 'default',
      });

      const results = await Promise.allSettled(
        subscriptions.map(sub =>
          this.webPush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, pushPayload)
        )
      );

      // Clean up invalid subscriptions
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'rejected') {
          const err = result.reason;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscriptions[i].endpoint);
          }
        }
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  static async broadcastToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );
  }
}

export default PushNotificationService;
