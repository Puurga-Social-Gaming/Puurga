import { supabase } from '../config/supabase';
import { wsManager } from '../websocketManager';

// ─── Mission Definitions ─────────────────────────────────────────────────────
export interface MissionTemplate {
  type: string;
  description: string;
  target: number;
  xp_reward: number;
  category: 'social' | 'gaming' | 'engagement';
}

const DAILY_MISSION_POOL: MissionTemplate[] = [
  // Social missions
  { type: 'create_post', description: 'Create a post', target: 1, xp_reward: 15, category: 'social' },
  { type: 'create_posts_3', description: 'Create 3 posts', target: 3, xp_reward: 40, category: 'social' },
  { type: 'comment_3', description: 'Leave 3 comments', target: 3, xp_reward: 20, category: 'social' },
  { type: 'comment_5', description: 'Leave 5 comments', target: 5, xp_reward: 35, category: 'social' },
  { type: 'like_5', description: 'Like 5 posts', target: 5, xp_reward: 15, category: 'social' },
  { type: 'like_10', description: 'Like 10 posts', target: 10, xp_reward: 25, category: 'social' },
  { type: 'add_friend', description: 'Add a friend', target: 1, xp_reward: 20, category: 'social' },
  { type: 'send_message', description: 'Send a message', target: 1, xp_reward: 10, category: 'social' },
  { type: 'send_messages_5', description: 'Send 5 messages', target: 5, xp_reward: 25, category: 'social' },

  // Gaming missions
  { type: 'play_game', description: 'Play a game', target: 1, xp_reward: 15, category: 'gaming' },
  { type: 'play_games_3', description: 'Play 3 games', target: 3, xp_reward: 35, category: 'gaming' },
  { type: 'win_game', description: 'Win a game', target: 1, xp_reward: 30, category: 'gaming' },
  { type: 'win_games_3', description: 'Win 3 games', target: 3, xp_reward: 75, category: 'gaming' },
  { type: 'high_score', description: 'Set a high score', target: 1, xp_reward: 40, category: 'gaming' },

  // Engagement missions
  { type: 'daily_login', description: 'Log in today', target: 1, xp_reward: 5, category: 'engagement' },
  { type: 'complete_profile', description: 'Update your profile', target: 1, xp_reward: 10, category: 'engagement' },
];

// ─── Daily Mission Service ───────────────────────────────────────────────────
export class DailyMissionService {

  /**
   * Get or generate today's missions for a user.
   */
  static async getTodaysMissions(userId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    // Check if missions already exist for today
    const { data: existing } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: true });

    if (existing && existing.length > 0) return existing;

    // Generate 3 random missions for today
    return this.generateMissions(userId, today);
  }

  /**
   * Generate new daily missions for a user.
   */
  private static async generateMissions(userId: string, date: string): Promise<any[]> {
    // Pick 3 random missions from the pool (one from each category if possible)
    const social = DAILY_MISSION_POOL.filter(m => m.category === 'social');
    const gaming = DAILY_MISSION_POOL.filter(m => m.category === 'gaming');
    const engagement = DAILY_MISSION_POOL.filter(m => m.category === 'engagement');

    const pick = (arr: MissionTemplate[]) => arr[Math.floor(Math.random() * arr.length)];

    const selected = [
      pick(social),
      pick(gaming),
      pick(engagement),
    ];

    const missions = selected.map(template => ({
      user_id: userId,
      date,
      mission_type: template.type,
      target: template.target,
      progress: 0,
      xp_reward: template.xp_reward,
      description: template.description,
      completed: false,
      claimed: false,
    }));

    const { data, error } = await supabase
      .from('daily_missions')
      .insert(missions)
      .select();

    if (error) {
      console.error('DailyMissionService: Failed to generate missions', error);
      return [];
    }

    return data || [];
  }

  /**
   * Track progress for a specific mission type.
   * Called when a user performs an action (post, comment, like, game, etc.)
   */
  static async trackProgress(userId: string, missionType: string, increment: number = 1): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    // Find matching incomplete missions
    const { data: missions } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('mission_type', missionType)
      .eq('completed', false);

    if (!missions || missions.length === 0) return [];

    const updated: any[] = [];

    for (const mission of missions) {
      const newProgress = Math.min(mission.progress + increment, mission.target);
      const isNowComplete = newProgress >= mission.target;

      const { data: updatedMission, error } = await supabase
        .from('daily_missions')
        .update({
          progress: newProgress,
          completed: isNowComplete,
        })
        .eq('id', mission.id)
        .select()
        .single();

      if (error) {
        console.error(`DailyMissionService: Failed to update mission ${mission.id}`, error);
        continue;
      }

      updated.push(updatedMission);

      // Notify user of mission completion
      if (isNowComplete && !mission.completed) {
        wsManager.sendToUser(userId, {
          type: 'notification',
          payload: {
            type: 'mission_completed',
            missionId: mission.id,
            description: mission.description,
            xpReward: mission.xp_reward,
          },
        });
      }
    }

    return updated;
  }

  /**
   * Claim reward for a completed mission.
   */
  static async claimReward(userId: string, missionId: string): Promise<{ success: boolean; xpAwarded?: number; error?: string }> {
    const { data: mission, error: fetchError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !mission) return { success: false, error: 'Mission not found' };
    if (!mission.completed) return { success: false, error: 'Mission not completed yet' };
    if (mission.claimed) return { success: false, error: 'Already claimed' };

    // Mark as claimed
    const { error: updateError } = await supabase
      .from('daily_missions')
      .update({ claimed: true })
      .eq('id', missionId);

    if (updateError) return { success: false, error: 'Failed to claim' };

    // Award XP
    const { XPEngine } = await import('./xpEngine');
    await XPEngine.awardXP(userId, mission.xp_reward, `daily_mission:${mission.mission_type}`);

    // Broadcast
    wsManager.sendToUser(userId, {
      type: 'notification',
      payload: {
        type: 'mission_reward_claimed',
        missionId,
        xpAwarded: mission.xp_reward,
      },
    });

    return { success: true, xpAwarded: mission.xp_reward };
  }

  /**
   * Get mission stats for a user.
   */
  static async getStats(userId: string): Promise<{
    todayCompleted: number;
    todayTotal: number;
    todayXPEarned: number;
    totalCompleted: number;
    totalXPEarned: number;
    streak: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Today's missions
    const { data: todayMissions } = await supabase
      .from('daily_missions')
      .select('completed, claimed, xp_reward')
      .eq('user_id', userId)
      .eq('date', today);

    const todayCompleted = (todayMissions || []).filter((m: any) => m.completed).length;
    const todayTotal = (todayMissions || []).length;
    const todayXPEarned = (todayMissions || [])
      .filter((m: any) => m.claimed)
      .reduce((sum: number, m: any) => sum + m.xp_reward, 0);

    // All-time stats
    const { data: allMissions } = await supabase
      .from('daily_missions')
      .select('completed, claimed, xp_reward')
      .eq('user_id', userId);

    const totalCompleted = (allMissions || []).filter((m: any) => m.completed).length;
    const totalXPEarned = (allMissions || [])
      .filter((m: any) => m.claimed)
      .reduce((sum: number, m: any) => sum + m.xp_reward, 0);

    // Calculate streak (consecutive days with at least one mission completed)
    const { data: recentDays } = await supabase
      .from('daily_missions')
      .select('date, completed')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(60);

    let streak = 0;
    if (recentDays && recentDays.length > 0) {
      const dayMap = new Map<string, boolean>();
      for (const row of recentDays) {
        const d = row.date as string;
        if (!dayMap.has(d)) dayMap.set(d, false);
        if (row.completed) dayMap.set(d, true);
      }

      const sorted = Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      for (const [, completed] of sorted) {
        if (completed) streak++;
        else break;
      }
    }

    return {
      todayCompleted,
      todayTotal,
      todayXPEarned,
      totalCompleted,
      totalXPEarned,
      streak,
    };
  }

  /**
   * Batch track multiple mission types at once.
   */
  static async trackProgressBatch(userId: string, updates: Array<{ type: string; increment?: number }>): Promise<any[]> {
    const allUpdated: any[] = [];
    for (const { type, increment } of updates) {
      const updated = await this.trackProgress(userId, type, increment ?? 1);
      allUpdated.push(...updated);
    }
    return allUpdated;
  }
}
