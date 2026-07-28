import { supabase } from '../config/supabase';
import { wsManager } from '../websocketManager';
import { AnalyticsService } from './analyticsService';

// ─── Achievement Definitions ─────────────────────────────────────────────────
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'social' | 'gaming' | 'progression' | 'streak' | 'special';
  xp_reward: number;
  check: (stats: UserStats) => boolean;
}

export interface UserStats {
  userId: string;
  totalPosts: number;
  totalComments: number;
  totalLikesReceived: number;
  totalFriends: number;
  totalGamesPlayed: number;
  totalGameWins: number;
  totalGameHighScores: number;
  currentLevel: number;
  currentXP: number;
  loginStreak: number;
  purgesSurvived: number;
  certificationsEarned: number;
  daysSinceJoin: number;
}

// ─── All Achievements ────────────────────────────────────────────────────────
export const ACHIEVEMENTS: AchievementDef[] = [
  // Social
  { id: 'first_post', name: 'First Words', description: 'Create your first post', icon: '✍️', category: 'social', xp_reward: 25, check: s => s.totalPosts >= 1 },
  { id: 'post_10', name: 'Regular Poster', description: 'Create 10 posts', icon: '📝', category: 'social', xp_reward: 50, check: s => s.totalPosts >= 10 },
  { id: 'post_50', name: 'Prolific Writer', description: 'Create 50 posts', icon: '📚', category: 'social', xp_reward: 150, check: s => s.totalPosts >= 50 },
  { id: 'post_100', name: 'Centurion', description: 'Create 100 posts', icon: '💯', category: 'social', xp_reward: 300, check: s => s.totalPosts >= 100 },
  { id: 'first_comment', name: 'Chatter', description: 'Leave your first comment', icon: '💬', category: 'social', xp_reward: 15, check: s => s.totalComments >= 1 },
  { id: 'comment_50', name: 'Conversationalist', description: 'Leave 50 comments', icon: '🗣️', category: 'social', xp_reward: 100, check: s => s.totalComments >= 50 },
  { id: 'first_friend', name: 'Making Friends', description: 'Add your first friend', icon: '🤝', category: 'social', xp_reward: 20, check: s => s.totalFriends >= 1 },
  { id: 'friends_10', name: 'Popular', description: 'Have 10 friends', icon: '👥', category: 'social', xp_reward: 75, check: s => s.totalFriends >= 10 },
  { id: 'friends_50', name: 'Social Butterfly', description: 'Have 50 friends', icon: '🦋', category: 'social', xp_reward: 200, check: s => s.totalFriends >= 50 },
  { id: 'liked_10', name: 'Appreciated', description: 'Receive 10 likes', icon: '❤️', category: 'social', xp_reward: 50, check: s => s.totalLikesReceived >= 10 },
  { id: 'liked_100', name: 'Beloved', description: 'Receive 100 likes', icon: '💖', category: 'social', xp_reward: 250, check: s => s.totalLikesReceived >= 100 },

  // Gaming
  { id: 'first_game', name: 'Game On', description: 'Play your first game', icon: '🎮', category: 'gaming', xp_reward: 20, check: s => s.totalGamesPlayed >= 1 },
  { id: 'games_10', name: 'Gamer', description: 'Play 10 games', icon: '🕹️', category: 'gaming', xp_reward: 50, check: s => s.totalGamesPlayed >= 10 },
  { id: 'games_50', name: 'Hardcore Gamer', description: 'Play 50 games', icon: '🏆', category: 'gaming', xp_reward: 150, check: s => s.totalGamesPlayed >= 50 },
  { id: 'first_win', name: 'Winner', description: 'Win your first game', icon: '🥇', category: 'gaming', xp_reward: 30, check: s => s.totalGameWins >= 1 },
  { id: 'wins_10', name: 'Champion', description: 'Win 10 games', icon: '🏅', category: 'gaming', xp_reward: 100, check: s => s.totalGameWins >= 10 },
  { id: 'wins_50', name: 'Unstoppable', description: 'Win 50 games', icon: '👑', category: 'gaming', xp_reward: 300, check: s => s.totalGameWins >= 50 },
  { id: 'high_score', name: 'High Scorer', description: 'Set a high score', icon: '⭐', category: 'gaming', xp_reward: 40, check: s => s.totalGameHighScores >= 1 },
  { id: 'high_scores_10', name: 'Score Master', description: 'Set 10 high scores', icon: '🌟', category: 'gaming', xp_reward: 200, check: s => s.totalGameHighScores >= 10 },

  // Progression
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '⭐', category: 'progression', xp_reward: 50, check: s => s.currentLevel >= 5 },
  { id: 'level_10', name: 'Established', description: 'Reach Level 10', icon: '🌟', category: 'progression', xp_reward: 150, check: s => s.currentLevel >= 10 },
  { id: 'level_15', name: 'Veteran', description: 'Reach Level 15', icon: '💫', category: 'progression', xp_reward: 300, check: s => s.currentLevel >= 15 },
  { id: 'level_20', name: 'Legend', description: 'Reach Level 20', icon: '🔮', category: 'progression', xp_reward: 500, check: s => s.currentLevel >= 20 },
  { id: 'xp_1000', name: 'XP Collector', description: 'Earn 1,000 total XP', icon: '✨', category: 'progression', xp_reward: 100, check: s => s.currentXP >= 1000 },
  { id: 'xp_10000', name: 'XP Hoarder', description: 'Earn 10,000 total XP', icon: '💎', category: 'progression', xp_reward: 500, check: s => s.currentXP >= 10000 },

  // Streaks
  { id: 'streak_3', name: 'Consistent', description: '3-day login streak', icon: '🔥', category: 'streak', xp_reward: 30, check: s => s.loginStreak >= 3 },
  { id: 'streak_7', name: 'Dedicated', description: '7-day login streak', icon: '🔥', category: 'streak', xp_reward: 75, check: s => s.loginStreak >= 7 },
  { id: 'streak_30', name: 'Devoted', description: '30-day login streak', icon: '🔥', category: 'streak', xp_reward: 300, check: s => s.loginStreak >= 30 },

  // Special
  { id: 'purge_survivor', name: 'Purge Survivor', description: 'Survive your first purge', icon: '💀', category: 'special', xp_reward: 100, check: s => s.purgesSurvived >= 1 },
  { id: 'certified', name: 'Certified', description: 'Earn a certification', icon: '🎓', category: 'special', xp_reward: 200, check: s => s.certificationsEarned >= 1 },
  { id: 'veteran_30', name: 'Old Guard', description: 'Member for 30 days', icon: '📅', category: 'special', xp_reward: 100, check: s => s.daysSinceJoin >= 30 },
  { id: 'veteran_365', name: 'Year One', description: 'Member for 365 days', icon: '🎂', category: 'special', xp_reward: 500, check: s => s.daysSinceJoin >= 365 },
];

// ─── Achievement Service ─────────────────────────────────────────────────────
export class AchievementService {

  /**
   * Fetch all achievement definitions (from code).
   */
  static getAll(): AchievementDef[] {
    return ACHIEVEMENTS;
  }

  /**
   * Get achievements for a specific user.
   */
  static async getUserAchievements(userId: string): Promise<{ all: AchievementDef[]; unlocked: string[] }> {
    const { data } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlocked = (data || []).map((r: any) => r.achievement_id);
    return { all: ACHIEVEMENTS, unlocked };
  }

  /**
   * Fetch user stats needed for achievement checks.
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    // Profile basics
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, login_streak, created_at')
      .eq('id', userId)
      .single();

    // Post count
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Comment count
    const { count: totalComments } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Likes received
    const { count: totalLikesReceived } = await supabase
      .from('post_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'like')
      .eq('post_id', supabase.from('posts').select('id').eq('user_id', userId));

    // Friends count
    const { count: totalFriends } = await supabase
      .from('friend_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    // Games played / wins / high scores
    const { count: totalGamesPlayed } = await supabase
      .from('game_scores')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalGameWins } = await supabase
      .from('game_scores')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_win', true);

    const { count: totalGameHighScores } = await supabase
      .from('game_scores')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_high_score', true);

    // Purges survived
    const { count: purgesSurvived } = await supabase
      .from('survival_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Certifications
    const { count: certificationsEarned } = await supabase
      .from('certifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const now = new Date();
    const joinDate = profile?.created_at ? new Date(profile.created_at) : now;
    const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      userId,
      totalPosts: totalPosts || 0,
      totalComments: totalComments || 0,
      totalLikesReceived: totalLikesReceived || 0,
      totalFriends: totalFriends || 0,
      totalGamesPlayed: totalGamesPlayed || 0,
      totalGameWins: totalGameWins || 0,
      totalGameHighScores: totalGameHighScores || 0,
      currentLevel: profile?.level || 1,
      currentXP: profile?.xp || 0,
      loginStreak: profile?.login_streak || 0,
      purgesSurvived: purgesSurvived || 0,
      certificationsEarned: certificationsEarned || 0,
      daysSinceJoin,
    };
  }

  /**
   * Check and award any newly-earned achievements.
   * Returns list of newly unlocked achievements.
   */
  static async checkAndAward(userId: string): Promise<AchievementDef[]> {
    const stats = await this.getUserStats(userId);
    const { unlocked } = await this.getUserAchievements(userId);

    const newlyUnlocked: AchievementDef[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (unlocked.includes(achievement.id)) continue;
      if (!achievement.check(stats)) continue;

      // Award
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
        });

      if (error) {
        console.error(`AchievementService: Failed to award ${achievement.id} to ${userId}`, error);
        continue;
      }

      // Award XP bonus
      if (achievement.xp_reward > 0) {
        const { XPEngine } = await import('./xpEngine');
        await XPEngine.awardXP(userId, achievement.xp_reward, `achievement:${achievement.id}`);
      }

      newlyUnlocked.push(achievement);

      // Broadcast via WebSocket
      wsManager.sendToUser(userId, {
        type: 'notification',
        payload: {
          type: 'achievement_unlocked',
          achievementId: achievement.id,
          name: achievement.name,
          icon: achievement.icon,
          xpReward: achievement.xp_reward,
        },
      });

      // Track analytics
      AnalyticsService.trackAchievementUnlocked(userId, achievement.id, achievement.name, achievement.xp_reward).catch(() => {});
    }

    return newlyUnlocked;
  }

  /**
   * Get achievement progress summary for a user.
   */
  static async getProgress(userId: string): Promise<{
    total: number;
    unlocked: number;
    percentage: number;
    byCategory: Record<string, { total: number; unlocked: number }>;
  }> {
    const { unlocked } = await this.getUserAchievements(userId);

    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    for (const a of ACHIEVEMENTS) {
      if (!byCategory[a.category]) byCategory[a.category] = { total: 0, unlocked: 0 };
      byCategory[a.category].total++;
      if (unlocked.includes(a.id)) byCategory[a.category].unlocked++;
    }

    return {
      total: ACHIEVEMENTS.length,
      unlocked: unlocked.length,
      percentage: ACHIEVEMENTS.length > 0 ? Math.round((unlocked.length / ACHIEVEMENTS.length) * 100) : 0,
      byCategory,
    };
  }

  /**
   * Get leaderboard of users with most achievements.
   */
  static async getLeaderboard(limit: number = 20): Promise<Array<{ userId: string; username: string; avatar: string | null; count: number }>> {
    const { data } = await supabase
      .from('user_achievements')
      .select('user_id, profiles!inner(username, avatar)')
      .order('unlocked_at', { ascending: false });

    if (!data) return [];

    const counts: Record<string, { username: string; avatar: string | null; count: number }> = {};
    for (const row of data as any[]) {
      const uid = row.user_id;
      if (!counts[uid]) counts[uid] = { username: row.profiles?.username || '', avatar: row.profiles?.avatar || null, count: 0 };
      counts[uid].count++;
    }

    return Object.entries(counts)
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
