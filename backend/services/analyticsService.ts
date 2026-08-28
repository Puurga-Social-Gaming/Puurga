import { requireSupabase } from '../config/supabase';

// ─── Analytics Event Types ───────────────────────────────────────────────────
export type AnalyticsEvent =
  | 'xp_awarded'
  | 'level_up'
  | 'achievement_unlocked'
  | 'mission_completed'
  | 'mission_claimed'
  | 'game_completed'
  | 'streak_milestone';

interface AnalyticsPayload {
  userId: string;
  event: AnalyticsEvent;
  metadata?: Record<string, any>;
  timestamp?: string;
}

// ─── Analytics Service ───────────────────────────────────────────────────────
export class AnalyticsService {

  /**
   * Track an analytics event.
   * Non-blocking — failures are logged but don't affect the request.
   */
  static async track(event: AnalyticsEvent, payload: Omit<AnalyticsPayload, 'event' | 'timestamp'>): Promise<void> {
    try {
      const supabase = requireSupabase();
      await supabase.from('analytics_events').insert({
        user_id: payload.userId,
        event,
        metadata: payload.metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Analytics failures should never block the main flow
      console.warn(`AnalyticsService: Failed to track ${event}`, error);
    }
  }

  /**
   * Track XP awarded with context.
   */
  static async trackXPAwarded(userId: string, amount: number, source: string, newLevel: number, leveledUp: boolean): Promise<void> {
    await this.track('xp_awarded', {
      userId,
      metadata: { amount, source, newLevel, leveledUp },
    });
  }

  /**
   * Track level up with details.
   */
  static async trackLevelUp(userId: string, newLevel: number, title: string, bonusCredits: number): Promise<void> {
    await this.track('level_up', {
      userId,
      metadata: { newLevel, title, bonusCredits },
    });
  }

  /**
   * Track achievement unlocked.
   */
  static async trackAchievementUnlocked(userId: string, achievementId: string, name: string, xpReward: number): Promise<void> {
    await this.track('achievement_unlocked', {
      userId,
      metadata: { achievementId, name, xpReward },
    });
  }

  /**
   * Track mission completed.
   */
  static async trackMissionCompleted(userId: string, missionType: string, xpReward: number): Promise<void> {
    await this.track('mission_completed', {
      userId,
      metadata: { missionType, xpReward },
    });
  }

  /**
   * Track mission reward claimed.
   */
  static async trackMissionClaimed(userId: string, missionType: string, xpAwarded: number): Promise<void> {
    await this.track('mission_claimed', {
      userId,
      metadata: { missionType, xpAwarded },
    });
  }

  /**
   * Track game completed with progression context.
   */
  static async trackGameCompleted(userId: string, gameId: string, score: number, isWin: boolean, xpAwarded: number): Promise<void> {
    await this.track('game_completed', {
      userId,
      metadata: { gameId, score, isWin, xpAwarded },
    });
  }

  /**
   * Track streak milestone (3, 7, 30 days).
   */
  static async trackStreakMilestone(userId: string, streakDays: number): Promise<void> {
    await this.track('streak_milestone', {
      userId,
      metadata: { streakDays },
    });
  }

  /**
   * Get analytics summary for a user.
   */
  static async getUserSummary(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEvents: Array<{ event: string; metadata: any; created_at: string }>;
  }> {
    const supabase = requireSupabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data } = await supabase
      .from('analytics_events')
      .select('event, metadata, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return { totalEvents: 0, eventsByType: {}, recentEvents: [] };

    const eventsByType: Record<string, number> = {};
    for (const row of data) {
      eventsByType[row.event] = (eventsByType[row.event] || 0) + 1;
    }

    return {
      totalEvents: data.length,
      eventsByType,
      recentEvents: data.slice(0, 20),
    };
  }
}
