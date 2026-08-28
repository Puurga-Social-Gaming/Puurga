import { requireSupabase } from '../config/supabase';
import { wsManager } from '../websocketManager';
import { normalizeImageUrl } from '../utils/url';
import { areBlocked } from '../utils/friendRelations';

export type NotificationType =
  // Social
  | 'like'
  | 'dislike'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'follow'
  | 'follow_accepted'
  | 'share'
  | 'profile_visit'
  // Messaging
  | 'message'
  | 'group_message'
  | 'message_reaction'
  | 'missed_call'
  // Gaming
  | 'resume_game'
  | 'reward_reminder'
  | 'tournament_reminder'
  | 'challenge'
  | 'game_score'
  | 'game_high_score'
  // System
  | 'welcome'
  | 'verification'
  | 'security_alert'
  | 'maintenance'
  | 'system'
  // Existing
  | 'friend_request'
  | 'friend_request_accepted'
  | 'redemption'
  | 'redemption_contribution'
  | 'friend_ghosted'
  | 'purge';

interface CreateNotificationParams {
  type: NotificationType;
  senderId?: string;
  receiverId: string;
  postId?: string;
  commentId?: string;
  conversationId?: string;
  messageId?: string;
  shareId?: string;
  groupId?: string;
  gameId?: string;
  friendRequestId?: string;
  title?: string;
  message?: string;
  metadata?: Record<string, any>;
}

const TITLE_MAP: Record<string, string> = {
  like: 'New Like',
  dislike: 'New Dislike',
  comment: 'New Comment',
  reply: 'New Reply',
  mention: 'New Mention',
  follow: 'New Follower',
  follow_accepted: 'Follow Request Accepted',
  share: 'New Share',
  profile_visit: 'Profile Visit',
  message: 'New Message',
  group_message: 'New Group Message',
  message_reaction: 'Message Reaction',
  missed_call: 'Missed Call',
  resume_game: 'Resume Game',
  reward_reminder: 'Reward Available',
  tournament_reminder: 'Tournament Reminder',
  challenge: 'New Challenge',
  game_score: 'Game Activity',
  game_high_score: 'New High Score',
  welcome: 'Welcome to Puurga',
  verification: 'Verify Your Account',
  security_alert: 'Security Alert',
  maintenance: 'Maintenance Notice',
  friend_request: 'New Friend Request',
  friend_request_accepted: 'Friend Request Accepted',
  redemption: 'Redemption Complete',
  redemption_contribution: 'Redemption Contribution',
  friend_ghosted: 'Friend Ghosted',
  purge: 'Post Purged',
};

export class NotificationService {
  static async create(params: CreateNotificationParams): Promise<any> {
    try {
      const supabase = requireSupabase();
      const {
        type, senderId, receiverId, postId, commentId,
        conversationId, messageId, shareId, groupId, gameId,
        friendRequestId, title, message, metadata
      } = params;

      // Skip self-notifications
      if (senderId && senderId === receiverId) return null;

      // Skip notifications between blocked users
      if (senderId && (await areBlocked(senderId, receiverId))) return null;

      // Check user notification preferences before creating
      const allowed = await this.checkPreference(receiverId, type);
      if (!allowed) return null;

      const row: Record<string, any> = {
        type,
        title: title || TITLE_MAP[type] || 'Notification',
        message: message || '',
        sender_id: senderId || null,
        receiver_id: receiverId,
        read: false,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: metadata || {},
      };
      if (postId) row.post_id = postId;
      if (commentId) row.comment_id = commentId;
      if (conversationId) row.conversation_id = conversationId;
      if (messageId) row.message_id = messageId;
      if (shareId) row.share_id = shareId;
      if (groupId) row.group_id = groupId;
      if (gameId) row.game_id = gameId;
      if (friendRequestId) row.friend_request_id = friendRequestId;

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      // Send real-time notification via WebSocket
      if (senderId) {
        await this.sendWebSocketNotification(notification, senderId, receiverId);
      }

      return notification;
    } catch (error) {
      console.error('Error in NotificationService.create:', error);
      return null;
    }
  }

  private static async sendWebSocketNotification(
    notification: any,
    senderId: string,
    receiverId: string
  ): Promise<void> {
    try {
      const supabase = requireSupabase();
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', senderId)
        .single();

      if (!senderProfile) return;

      const payload = {
        id: notification.id,
        type: notification.type as NotificationType,
        fromUser: {
          id: senderProfile.id,
          name: senderProfile.full_name || 'Unknown User',
          username: senderProfile.username || 'unknown',
          avatar: normalizeImageUrl(senderProfile.avatar_url) || undefined,
        },
        data: {
          postId: notification.post_id || undefined,
          commentId: notification.comment_id || undefined,
          conversationId: notification.conversation_id || undefined,
          messageId: notification.message_id || undefined,
          shareId: notification.share_id || undefined,
          groupId: notification.group_id || undefined,
          gameId: notification.game_id || undefined,
          friendRequestId: notification.friend_request_id || undefined,
          ...(notification.metadata || {}),
        },
        title: notification.title,
        message: notification.message,
        createdAt: notification.created_at,
      };

      wsManager.sendNotification(receiverId, payload as any);
    } catch (error) {
      console.error('Error sending WebSocket notification:', error);
    }
  }

  private static async checkPreference(
    userId: string,
    type: NotificationType
  ): Promise<boolean> {
    try {
      const supabase = requireSupabase();
      const { data: settings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      if (!settings?.settings) return true;

      const prefs = settings.settings.notifications || {};

      if (prefs.push === false) return false;

      const typeCategory = this.getCategory(type);
      const typePrefKey = this.getPreferenceKey(type);

      if (typePrefKey && prefs[typePrefKey] === false) return false;
      if (typeCategory && prefs[typeCategory] === false) return false;

      return true;
    } catch {
      return true;
    }
  }

  private static getCategory(type: NotificationType): string | null {
    const social = ['like', 'dislike', 'comment', 'reply', 'mention', 'follow', 'follow_accepted', 'share', 'profile_visit'];
    const messaging = ['message', 'group_message', 'message_reaction', 'missed_call'];
    const gaming = [
      'resume_game',
      'reward_reminder',
      'tournament_reminder',
      'challenge',
      'game_score',
      'game_high_score',
    ];
    const system = ['welcome', 'verification', 'security_alert', 'maintenance'];

    if (social.includes(type)) return 'social';
    if (messaging.includes(type)) return 'messaging';
    if (gaming.includes(type)) return 'gaming';
    if (system.includes(type)) return 'system';
    return null;
  }

  private static getPreferenceKey(type: NotificationType): string | null {
    const map: Partial<Record<NotificationType, string>> = {
      like: 'likes', dislike: 'dislikes', comment: 'comments',
      reply: 'replies', mention: 'mentions', follow: 'follows',
      follow_accepted: 'follows', share: 'shares',
      profile_visit: 'profile_visits',
      message: 'messages', group_message: 'group_messages',
      message_reaction: 'message_reactions', missed_call: 'missed_calls',
      resume_game: 'resume_game', reward_reminder: 'reward_reminders',
      tournament_reminder: 'tournament_reminders', challenge: 'challenges',
      game_score: 'game_scores', game_high_score: 'game_high_scores',
      welcome: 'welcome', verification: 'verification',
      security_alert: 'security_alerts', maintenance: 'maintenance',
    };
    return map[type] || null;
  }

  // ── Social Notifications ──────────────────────────────────

  static async like(senderId: string, receiverId: string, postId: string): Promise<any> {
    return this.create({ type: 'like', senderId, receiverId, postId });
  }

  static async dislike(senderId: string, receiverId: string, postId: string): Promise<any> {
    return this.create({ type: 'dislike', senderId, receiverId, postId });
  }

  static async comment(senderId: string, receiverId: string, postId: string, commentId: string, content?: string): Promise<any> {
    return this.create({
      type: 'comment', senderId, receiverId, postId, commentId,
      message: `${content?.slice(0, 100)}`,
    });
  }

  static async reply(senderId: string, receiverId: string, postId: string, commentId: string): Promise<any> {
    return this.create({ type: 'reply', senderId, receiverId, postId, commentId });
  }

  static async mention(senderId: string, receiverId: string, postId?: string, commentId?: string): Promise<any> {
    return this.create({ type: 'mention', senderId, receiverId, postId, commentId });
  }

  static async follow(senderId: string, receiverId: string): Promise<any> {
    return this.create({ type: 'follow', senderId, receiverId });
  }

  static async followAccepted(senderId: string, receiverId: string): Promise<any> {
    return this.create({ type: 'follow_accepted', senderId, receiverId });
  }

  static async share(senderId: string, receiverId: string, postId: string, shareId: string): Promise<any> {
    return this.create({ type: 'share', senderId, receiverId, postId, shareId });
  }

  static async profileVisit(visitorId: string, profileOwnerId: string): Promise<any> {
    return this.create({ type: 'profile_visit', senderId: visitorId, receiverId: profileOwnerId });
  }

  // ── Messaging Notifications ───────────────────────────────

  static async message(senderId: string, receiverId: string, conversationId: string, messageId: string, content?: string): Promise<any> {
    return this.create({
      type: 'message', senderId, receiverId, conversationId, messageId,
      message: content?.slice(0, 150),
    });
  }

  static async groupMessage(senderId: string, receiverIds: string[], conversationId: string, messageId: string, groupId: string): Promise<any[]> {
    const results: any[] = [];
    for (const receiverId of receiverIds) {
      const n = await this.create({
        type: 'group_message', senderId, receiverId,
        conversationId, messageId, groupId,
      });
      if (n) results.push(n);
    }
    return results;
  }

  static async messageReaction(senderId: string, receiverId: string, conversationId: string, messageId: string): Promise<any> {
    return this.create({ type: 'message_reaction', senderId, receiverId, conversationId, messageId });
  }

  static async missedCall(senderId: string, receiverId: string, metadata?: Record<string, any>): Promise<any> {
    return this.create({ type: 'missed_call', senderId, receiverId, metadata });
  }

  // ── Gaming Notifications ──────────────────────────────────

  static async resumeGame(userId: string, gameId: string, metadata?: Record<string, any>): Promise<any> {
    return this.create({ type: 'resume_game', receiverId: userId, gameId, metadata });
  }

  static async rewardReminder(userId: string, metadata?: Record<string, any>): Promise<any> {
    return this.create({ type: 'reward_reminder', receiverId: userId, metadata });
  }

  static async tournamentReminder(userId: string, metadata?: Record<string, any>): Promise<any> {
    return this.create({ type: 'tournament_reminder', receiverId: userId, metadata });
  }

  static async challenge(
    senderId: string,
    receiverId: string,
    gameId: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    return this.create({
      type: 'challenge',
      senderId,
      receiverId,
      gameId,
      title: 'Game Challenge',
      message: 'challenged you to a game',
      metadata: { gameId, action: 'challenge', ...metadata },
    });
  }

  /** Notify friends that a player finished a game / set a high score */
  static async gameActivity(
    playerId: string,
    opts: {
      gameId: string;
      gameName?: string;
      score?: number;
      pointsEarned?: number;
      isHighScore?: boolean;
    }
  ): Promise<any[]> {
    const { getAcceptedFriendIds } = await import('../utils/friendRelations');
    const friendIds = await getAcceptedFriendIds(playerId);
    if (!friendIds.length) return [];

    const gameLabel = opts.gameName || opts.gameId || 'a game';
    const type: NotificationType = opts.isHighScore ? 'game_high_score' : 'game_score';
    let message = `finished ${gameLabel}`;
    if (typeof opts.pointsEarned === 'number' && opts.pointsEarned > 0) {
      message = `finished ${gameLabel} and earned ${opts.pointsEarned} points`;
    } else if (typeof opts.score === 'number') {
      message = `scored ${opts.score.toLocaleString()} in ${gameLabel}`;
    }
    if (opts.isHighScore) {
      message = `set a new high score in ${gameLabel}${
        typeof opts.score === 'number' ? ` (${opts.score.toLocaleString()})` : ''
      }`;
    }

    const results: any[] = [];
    for (const friendId of friendIds.slice(0, 40)) {
      const n = await this.create({
        type,
        senderId: playerId,
        receiverId: friendId,
        gameId: opts.gameId,
        title: opts.isHighScore ? 'New High Score' : 'Game Activity',
        message,
        metadata: {
          gameId: opts.gameId,
          gameName: gameLabel,
          score: opts.score,
          pointsEarned: opts.pointsEarned,
          isHighScore: Boolean(opts.isHighScore),
        },
      });
      if (n) results.push(n);
    }
    return results;
  }

  // ── System Notifications ──────────────────────────────────

  static async welcome(userId: string): Promise<any> {
    return this.create({
      type: 'welcome', receiverId: userId,
      title: 'Welcome to Puurga!',
      message: 'Start connecting with friends and sharing your moments.',
      metadata: { action: 'explore' },
    });
  }

  static async verificationReminder(userId: string): Promise<any> {
    return this.create({
      type: 'verification', receiverId: userId,
      title: 'Verify Your Account',
      message: 'Verify your email to unlock all features.',
      metadata: { action: 'verify_email' },
    });
  }

  static async securityAlert(userId: string, message: string, metadata?: Record<string, any>): Promise<any> {
    return this.create({ type: 'security_alert', receiverId: userId, message, metadata });
  }

  static async maintenanceNotice(userIds: string[], message: string): Promise<any[]> {
    const results: any[] = [];
    for (const userId of userIds) {
      const n = await this.create({
        type: 'maintenance', receiverId: userId,
        title: 'Scheduled Maintenance',
        message,
        metadata: { action: 'learn_more' },
      });
      if (n) results.push(n);
    }
    return results;
  }

  // ── Legacy Notifications ──────────────────────────────────

  static async friendRequest(senderId: string, receiverId: string, friendRequestId?: string): Promise<any> {
    return this.create({ type: 'friend_request', senderId, receiverId, friendRequestId });
  }

  static async friendRequestAccepted(senderId: string, receiverId: string): Promise<any> {
    return this.create({ type: 'friend_request_accepted', senderId, receiverId });
  }

  static async redemption(senderId: string, receiverId: string): Promise<any> {
    return this.create({ type: 'redemption', senderId, receiverId });
  }

  static async redemptionContribution(senderId: string, receiverId: string): Promise<any> {
    return this.create({ type: 'redemption_contribution', senderId, receiverId });
  }

  static async friendGhosted(senderId: string, receiverId: string): Promise<any> {
    return this.create({ type: 'friend_ghosted', senderId, receiverId });
  }

  static async purge(senderId: string, receiverId: string, postId: string): Promise<any> {
    return this.create({ type: 'purge', senderId, receiverId, postId });
  }

  // ── Notification Preferences ──────────────────────────────

  static DEFAULT_PREFERENCES = {
    push: true,
    sound: true,
    vibration: true,
    social: true,
    messaging: true,
    gaming: true,
    system: true,
    likes: true,
    dislikes: true,
    comments: true,
    replies: true,
    mentions: true,
    follows: true,
    shares: true,
    profile_visits: false,
    messages: true,
    group_messages: true,
    message_reactions: true,
    missed_calls: true,
    resume_game: true,
    reward_reminders: true,
    tournament_reminders: true,
    challenges: true,
    welcome: true,
    verification: true,
    security_alerts: true,
    maintenance: true,
  };

  static async getPreferences(userId: string): Promise<Record<string, any>> {
    try {
      const supabase = requireSupabase();
      const { data: settings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      const existingPrefs = settings?.settings?.notifications;
      return { ...this.DEFAULT_PREFERENCES, ...(existingPrefs || {}) };
    } catch {
      return { ...this.DEFAULT_PREFERENCES };
    }
  }

  static async updatePreferences(userId: string, prefs: Record<string, any>): Promise<Record<string, any>> {
    const supabase = requireSupabase();
    const { data: existing } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    const currentSettings = existing?.settings || {};
    const currentNotifs = currentSettings.notifications || {};
    const merged = { ...this.DEFAULT_PREFERENCES, ...currentNotifs, ...prefs };

    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: { ...currentSettings, notifications: merged },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return merged;
  }

  // ── Batch Deletion ────────────────────────────────────────

  static async deleteNotifications(userId: string, notificationIds: string[]): Promise<void> {
    const supabase = requireSupabase();
    await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
      .eq('receiver_id', userId);
  }

  static async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const supabase = requireSupabase();
    await supabase
      .from('notifications')
      .update({ read: true, is_read: true })
      .in('id', notificationIds)
      .eq('receiver_id', userId);
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const supabase = requireSupabase();
    await supabase
      .from('notifications')
      .update({ read: true, is_read: true })
      .eq('receiver_id', userId)
      .or('read.eq.false,is_read.eq.false');
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const supabase = requireSupabase();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .or('read.eq.false,is_read.eq.false');
    return count || 0;
  }
}

export default NotificationService;
