import { supabaseAdmin } from '../config/supabase';
import { getCreditSchemaSupport } from '../lib/creditSchema';
import { wsManager } from '../websocketManager';

export type CreditSource = 'post' | 'like' | 'comment' | 'game' | 'inactivity' | 'login' | 'daily_bonus' | 'recovery_bonus' | 'redeem_user' | 'redeem_friend' | 'refund' | 'transfer' | 'package' | 'GAME_CHALLENGE' | 'certification';

const CREDIT_CONFIG = {
  AWARD_CREATE_POST: 5,
  AWARD_LIKE: 1,
  AWARD_RECEIVE_LIKE: 2,
  AWARD_COMMENT: 2,
  AWARD_RECEIVE_COMMENT: 3,
  AWARD_DAILY_LOGIN: 3,
  AWARD_RECOVERY_BONUS: 10,
  DAILY_LIKE_CAP: 20,
  DAILY_COMMENT_CAP: 10,
  DAILY_CREDIT_CAP: 150,
  PENALTY_WARNED: 5,
  PENALTY_PENALIZED: 10,
  PENALTY_RESTRICTED: 15,
};

export class CreditService {
  static async awardCredits(
    userId: string,
    amount: number,
    source: CreditSource,
    description?: string
  ): Promise<{ success: boolean; newBalance: number; transactionId?: string }> {
    try {
      const schema = await getCreditSchemaSupport();
      const selectCols = schema.hasDailyCapColumns
        ? 'purga_points, daily_likes_count, daily_comments_count, daily_likes_reset_at, daily_comments_reset_at'
        : 'purga_points';

      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select(selectCols)
        .eq('id', userId)
        .single();

      if (fetchError || !profile) {
        console.error('CreditService: Failed to fetch profile', fetchError);
        return { success: false, newBalance: 0 };
      }

      const currentBalance = Number((profile as { purga_points?: number }).purga_points ?? 0);

      // Competitive pots / escrow refunds must never hit the daily earn cap
      const skipCap = source === 'GAME_CHALLENGE' || source === 'refund' || source === 'transfer';
      const wouldExceedCap = !skipCap && (currentBalance + amount) > CREDIT_CONFIG.DAILY_CREDIT_CAP;
      const cappedAmount = wouldExceedCap
        ? Math.max(0, CREDIT_CONFIG.DAILY_CREDIT_CAP - currentBalance)
        : amount;

      if (cappedAmount <= 0) {
        return { success: false, newBalance: currentBalance };
      }

      const newBalance = currentBalance + cappedAmount;

      await supabaseAdmin
        .from('profiles')
        .update({
          purga_points: newBalance,
          [schema.lastActiveColumn]: new Date().toISOString(),
        })
        .eq('id', userId);

      const { data: transaction } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: cappedAmount,
          type: 'earn',
          source: source,
          description: description || `${source} action`,
        })
        .select('id')
        .single();

      wsManager.sendToUser(userId, {
        type: 'credit_update',
        payload: {
          userId,
          credits: newBalance,
          change: cappedAmount,
          source,
        }
      } as any);

      return { success: true, newBalance, transactionId: transaction?.id };
    } catch (error) {
      console.error('CreditService: Error awarding credits', error);
      return { success: false, newBalance: 0 };
    }
  }

  static async deductCredits(
    userId: string,
    amount: number,
    source: CreditSource,
    description?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('purga_points')
        .eq('id', userId)
        .single();

      if (!profile) {
        return { success: false, newBalance: 0 };
      }

      const currentBalance = Number(profile.purga_points ?? 0);
      if (currentBalance < amount) {
        return { success: false, newBalance: currentBalance };
      }
      const newBalance = currentBalance - amount;

      await supabaseAdmin
        .from('profiles')
        .update({ purga_points: newBalance })
        .eq('id', userId);

      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          type: 'penalty',
          source: source,
          description: description || `${source} penalty`,
        });

      wsManager.sendToUser(userId, {
        type: 'credit_update',
        payload: {
          userId,
          credits: newBalance,
          change: -amount,
          source,
        }
      } as any);

      return { success: true, newBalance };
    } catch (error) {
      console.error('CreditService: Error deducting credits', error);
      return { success: false, newBalance: 0 };
    }
  }

  static async checkAndIncrementLikeCount(userId: string): Promise<boolean> {
    return this.checkAndIncrementDailyCap(userId, 'likes');
  }

  static async checkAndIncrementCommentCount(userId: string): Promise<boolean> {
    return this.checkAndIncrementDailyCap(userId, 'comments');
  }

  private static async checkAndIncrementDailyCap(userId: string, type: 'likes' | 'comments'): Promise<boolean> {
    const schema = await getCreditSchemaSupport();
    if (!schema.hasDailyCapColumns) {
      return true;
    }

    const fieldCount = type === 'likes' ? 'daily_likes_count' : 'daily_comments_count';
    const fieldReset = type === 'likes' ? 'daily_likes_reset_at' : 'daily_comments_reset_at';
    const maxCap = type === 'likes' ? CREDIT_CONFIG.DAILY_LIKE_CAP : CREDIT_CONFIG.DAILY_COMMENT_CAP;

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select(`${fieldCount}, ${fieldReset}`)
        .eq('id', userId)
        .single();

      if (!profile) return false;

      const currentCount = (profile as any)[fieldCount] || 0;
      const resetAt = (profile as any)[fieldReset] as string | null;
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      let shouldReset = false;
      if (!resetAt) {
        shouldReset = true;
      } else {
        const resetDate = resetAt.split('T')[0];
        if (resetDate !== today) shouldReset = true;
      }

      if (shouldReset) {
        await supabaseAdmin
          .from('profiles')
          .update({ [fieldCount]: 1, [fieldReset]: now.toISOString() })
          .eq('id', userId);
        return true;
      }

      if (currentCount >= maxCap) {
        console.log(`CreditService: Daily ${type} cap reached for user ${userId}`);
        return false;
      }

      await supabaseAdmin
        .from('profiles')
        .update({ [fieldCount]: currentCount + 1 })
        .eq('id', userId);

      return true;
    } catch (error) {
      console.error(`CreditService: Error checking ${type} daily cap`, error);
      return false;
    }
  }

  static async checkAndAwardDailyLoginBonus(userId: string): Promise<boolean> {
    try {
      const schema = await getCreditSchemaSupport();
      if (!schema.hasDailyLoginColumn) {
        return false;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select(`last_daily_login_at, ${schema.lastActiveColumn}`)
        .eq('id', userId)
        .single();

      if (!profile) return false;

      const lastLogin = (profile as any).last_daily_login_at as string | null;
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      if (lastLogin) {
        const lastLoginDate = lastLogin.split('T')[0];
        if (lastLoginDate === today) return false;
      }

      await supabaseAdmin
        .from('profiles')
        .update({
          last_daily_login_at: now.toISOString(),
          [schema.lastActiveColumn]: now.toISOString(),
        })
        .eq('id', userId);

      await this.awardCredits(userId, CREDIT_CONFIG.AWARD_DAILY_LOGIN, 'daily_bonus', 'Daily login bonus');
      return true;
    } catch (error) {
      console.error('CreditService: Error checking daily login bonus', error);
      return false;
    }
  }

  static async updateLastActiveAt(userId: string): Promise<void> {
    try {
      const schema = await getCreditSchemaSupport();
      await supabaseAdmin
        .from('profiles')
        .update({ [schema.lastActiveColumn]: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('CreditService: Error updating last active at', error);
    }
  }

  static async getCredits(userId: string): Promise<number> {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('purga_points')
        .eq('id', userId)
        .single();

      if (!profile) return 0;
      return Number(profile.purga_points ?? 0);
    } catch (error) {
      console.error('CreditService: Error getting credits', error);
      return 0;
    }
  }

  static async checkRestricted(userId: string): Promise<boolean> {
    try {
      const schema = await getCreditSchemaSupport();
      const selectCols = schema.usesAccountStatus ? 'account_status, is_restricted' : 'is_restricted';
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select(selectCols)
        .eq('id', userId)
        .single();

      if (!profile) return false;
      if (schema.usesAccountStatus) {
        return (profile as any).account_status === 'restricted';
      }
      return Boolean((profile as any).is_restricted);
    } catch (error) {
      console.error('CreditService: Error checking restricted status', error);
      return false;
    }
  }
}