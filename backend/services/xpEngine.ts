import { requireSupabaseAdmin } from '../config/supabase';
import { wsManager } from '../websocketManager';
import { NotificationService } from './notificationService';
import { AnalyticsService } from './analyticsService';

export const XP_REWARDS = {
  POST_CREATED: 5,
  POST_LIKED: 2,
  RECEIVE_LIKE: 2,
  COMMENT_CREATED: 3,
  RECEIVE_COMMENT: 3,
  GAME_WIN: 25,
  GAME_PLAY: 10,
  DAILY_LOGIN: 5,
  FRIEND_ADDED: 10,
  MESSAGE_SENT: 1,
  PROFILE_COMPLETE: 20,
  PURGE_SURVIVED: 15,
  ALLIANCE_FORMED: 15,
  CERTIFICATION: 50,
} as const;

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000,
  7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000,
];

export const LEVEL_TITLES = [
  'Newcomer', 'Settler', 'Survivor', 'Fighter', 'Warrior',
  'Veteran', 'Champion', 'Elite', 'Legend', 'Immortal',
  'Transcendent', 'Mythic', 'Divine', 'Celestial', 'Eternal',
  'Infinite', 'Supreme', 'Alpha', 'Omega', 'Puurga',
];

export class XPEngine {
  // Deduplication: prevent duplicate XP awards within short window
  private static recentAwards = new Map<string, number>();

  /**
   * Award XP to a user. Handles level calculation, DB update, transaction log,
   * WebSocket broadcast, and level-up notifications.
   */
  static async awardXP(
    userId: string,
    amount: number,
    source: string
  ): Promise<{ xp: number; level: number; leveledUp: boolean }> {
    if (amount <= 0) {
      const current = await this.getUserXP(userId);
      return { xp: current.xp, level: current.level, leveledUp: false };
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // Deduplication: prevent duplicate XP within 5 seconds for same user+source
    const dedupeKey = `${userId}:${source}`;
    const now = Date.now();
    const lastAward = this.recentAwards.get(dedupeKey);
    if (lastAward && now - lastAward < 5000) {
      console.log(`XPEngine: Deduplicated XP for ${dedupeKey}`);
      const current = await this.getUserXP(userId);
      return { xp: current.xp, level: current.level, leveledUp: false };
    }
    this.recentAwards.set(dedupeKey, now);

    // Cleanup old entries periodically
    if (this.recentAwards.size > 1000) {
      for (const [key, timestamp] of this.recentAwards) {
        if (now - timestamp > 10000) this.recentAwards.delete(key);
      }
    }

    try {
      // Get current XP and level
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('xp, level')
        .eq('id', userId)
        .single();

      if (fetchError || !profile) {
        console.error('XPEngine: Failed to fetch profile', fetchError);
        return { xp: 0, level: 1, leveledUp: false };
      }

      const currentXP = Number(profile.xp ?? 0);
      const currentLevel = Number(profile.level ?? 1);
      const newXP = currentXP + amount;
      const newLevel = this.calculateLevel(newXP);
      const leveledUp = newLevel > currentLevel;

      // Update profile
      await supabaseAdmin
        .from('profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', userId);

      // Log XP transaction
      await supabaseAdmin
        .from('xp_transactions')
        .insert({
          user_id: userId,
          amount,
          source,
          total_xp: newXP,
        });

      // Broadcast XP update
      wsManager.sendToUser(userId, {
        type: 'xp_update',
        payload: {
          userId,
          xp: newXP,
          level: newLevel,
          amount,
          source,
        },
      });

      // Level-up notification
      if (leveledUp) {
        const title = LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)];

        wsManager.sendToUser(userId, {
          type: 'level_up',
          payload: {
            userId,
            level: newLevel,
            title,
          },
        });

        await NotificationService.create({
          receiverId: userId,
          type: 'system',
          message: `Level Up! You are now Level ${newLevel} — ${title}`,
          metadata: { type: 'level_up', level: newLevel },
        });

        // Track level up analytics
        AnalyticsService.trackLevelUp(userId, newLevel, title, 0).catch(() => {});
      }

      // Track XP awarded analytics
      AnalyticsService.trackXPAwarded(userId, amount, source, newLevel, leveledUp).catch(() => {});

      return { xp: newXP, level: newLevel, leveledUp };
    } catch (error) {
      console.error('XPEngine: Error awarding XP', error);
      return { xp: 0, level: 1, leveledUp: false };
    }
  }

  /**
   * Calculate level from XP using threshold table.
   */
  static calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  }

  /**
   * Get XP required for the next level.
   */
  static getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= LEVEL_THRESHOLDS.length) return Infinity;
    return LEVEL_THRESHOLDS[currentLevel];
  }

  /**
   * Get XP progress within current level (0-100 percentage).
   */
  static getXPProgress(xp: number, level: number): number {
    const currentThreshold = LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    if (nextThreshold === currentThreshold) return 100;
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  /**
   * Get user's current XP, level, and title.
   */
  static async getUserXP(userId: string): Promise<{
    xp: number;
    level: number;
    title: string;
    progress: number;
    xpForNext: number;
  }> {
    try {
      const supabaseAdmin = requireSupabaseAdmin();
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('xp, level')
        .eq('id', userId)
        .single();

      const xp = Number(profile?.xp ?? 0);
      const level = Number(profile?.level ?? 1);
      const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
      const progress = this.getXPProgress(xp, level);
      const xpForNext = this.getXPForNextLevel(level);

      return { xp, level, title, progress, xpForNext };
    } catch (error) {
      console.error('XPEngine: Error getting user XP', error);
      return { xp: 0, level: 1, title: LEVEL_TITLES[0], progress: 0, xpForNext: LEVEL_THRESHOLDS[1] };
    }
  }

  /**
   * Get XP transaction history for a user.
   */
  static async getTransactionHistory(userId: string, limit = 20): Promise<any[]> {
    try {
      const supabaseAdmin = requireSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from('xp_transactions')
        .select('id, amount, source, total_xp, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('XPEngine: Error fetching transaction history', error);
      return [];
    }
  }
}
