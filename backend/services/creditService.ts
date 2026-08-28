import { requireSupabaseAdmin, isSupabaseAvailable } from '../config/supabase';
import { getCreditSchemaSupport } from '../lib/creditSchema';
import { wsManager } from '../websocketManager';
import { Profile, sequelize } from '../models';
import { QueryTypes } from 'sequelize';

export type CreditSource = 'post' | 'like' | 'comment' | 'game' | 'inactivity' | 'login' | 'daily_bonus' | 'recovery_bonus' | 'redeem_user' | 'redeem_friend' | 'refund' | 'transfer' | 'package' | 'GAME_CHALLENGE' | 'certification' | 'spend' | 'merge';

export const CREDIT_CONFIG = {
  AWARD_CREATE_POST: 0.20,
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
  /**
   * Atomic credit award using SQL function.
   * Reads current balance, applies capped amount, writes transaction, returns new balance.
   */
  static async awardCredits(
    userId: string,
    amount: number,
    source: CreditSource,
    description?: string
  ): Promise<{ success: boolean; newBalance: number; transactionId?: string }> {
    try {
      // Local Postgres fallback when Supabase not configured
      if (!isSupabaseAvailable) {
        const profile = await Profile.findByPk(userId);
        if (!profile) {
          console.error('CreditService: Failed to fetch profile (local) - not found', userId);
          return { success: false, newBalance: 0 };
        }
        const currentBalance = Number((profile as any).purga_points ?? 0);
        const cappedAmount = amount;
        if (cappedAmount <= 0) return { success: false, newBalance: currentBalance };
        const newBalance = currentBalance + cappedAmount;
        await (profile as any).update({ purga_points: newBalance });
        // Best-effort transaction log (ignore if table missing)
        try {
          await sequelize.query(
            `INSERT INTO credit_transactions (user_id, amount, type, source, description) VALUES (:uid, :amt, 'earn', :src, :desc)`,
            { replacements: { uid: userId, amt: cappedAmount, src: source, desc: description || `${source} action` }, type: QueryTypes.INSERT }
          );
        } catch {}
        wsManager.sendToUser(userId, { type: 'credit_update', payload: { userId, credits: newBalance, change: cappedAmount, source } } as any);
        return { success: true, newBalance };
      }
      const supabaseAdmin = requireSupabaseAdmin();
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

      // No daily cap on total balance — the old check was broken (compared total balance against daily limit)
      // Daily caps for likes/comments are already handled separately via checkAndIncrementLikeCount/CommentCount
      const cappedAmount = amount;

      if (cappedAmount <= 0) {
        return { success: false, newBalance: currentBalance };
      }

      // Try atomic SQL function first, fall back to read-update-write
      let newBalance: number;
      try {
        const { data, error } = await supabaseAdmin.rpc('update_credit_balance', {
          p_user_id: userId,
          p_amount: cappedAmount,
          p_source: source,
          p_description: description || `${source} action`,
        });

        if (error) throw error;
        newBalance = Number(data);
      } catch {
        // Fallback: read-update-write (legacy path if SQL function not deployed)
        newBalance = currentBalance + cappedAmount;
        await supabaseAdmin
          .from('profiles')
          .update({
            purga_points: newBalance,
            [schema.lastActiveColumn]: new Date().toISOString(),
          })
          .eq('id', userId);

        await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: cappedAmount,
            type: 'earn',
            source: source,
            description: description || `${source} action`,
          });
      }

      wsManager.sendToUser(userId, {
        type: 'credit_update',
        payload: {
          userId,
          credits: newBalance,
          change: cappedAmount,
          source,
        }
      } as any);

      return { success: true, newBalance };
    } catch (error) {
      console.error('CreditService: Error awarding credits', error);
      return { success: false, newBalance: 0 };
    }
  }

  /**
   * Atomic credit deduction using SQL function.
   */
  static async deductCredits(
    userId: string,
    amount: number,
    source: CreditSource,
    description?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      if (!isSupabaseAvailable) {
        const profile = await Profile.findByPk(userId);
        if (!profile) return { success: false, newBalance: 0 };
        const currentBalance = Number((profile as any).purga_points ?? 0);
        if (currentBalance < amount) return { success: false, newBalance: currentBalance };
        const newBalance = currentBalance - amount;
        await (profile as any).update({ purga_points: newBalance });
        try {
          await sequelize.query(
            `INSERT INTO credit_transactions (user_id, amount, type, source, description) VALUES (:uid, :amt, 'penalty', :src, :desc)`,
            { replacements: { uid: userId, amt: -amount, src: source, desc: description || `${source} penalty` }, type: QueryTypes.INSERT }
          );
        } catch {}
        wsManager.sendToUser(userId, { type: 'credit_update', payload: { userId, credits: newBalance, change: -amount, source } } as any);
        return { success: true, newBalance };
      }
      const supabaseAdmin = requireSupabaseAdmin();
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

      // Try atomic SQL function first
      let newBalance: number;
      try {
        const { data, error } = await supabaseAdmin.rpc('update_credit_balance', {
          p_user_id: userId,
          p_amount: -amount,
          p_source: source,
          p_description: description || `${source} penalty`,
        });

        if (error) throw error;
        newBalance = Number(data);
      } catch {
        // Fallback: read-update-write
        newBalance = currentBalance - amount;
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
      }

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

  /**
   * Server-validated credit spend. Deducts credits and logs the transaction.
   * Use this instead of the old POST /api/credits/update bypass.
   */
  static async spendCredits(
    userId: string,
    amount: number,
    source: CreditSource,
    description?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    return this.deductCredits(userId, amount, source, description || `${source} purchase`);
  }

  /**
   * One-time migration: merge localStorage credits into backend balance.
   * Used when upgrading disconnected games (Purga Rift, Cyber Runner) to unified economy.
   */
  static async mergeCredits(
    userId: string,
    localAmount: number,
    source: string
  ): Promise<{ success: boolean; newBalance: number }> {
    if (localAmount <= 0) {
      const balance = await this.getCredits(userId);
      return { success: true, newBalance: balance };
    }

    console.log(`CreditService: Merging ${localAmount} local credits for user ${userId} from ${source}`);
    return this.awardCredits(userId, localAmount, 'merge', `Migrated from ${source}`);
  }

  static async checkAndIncrementLikeCount(userId: string): Promise<boolean> {
    return this.checkAndIncrementDailyCap(userId, 'likes');
  }

  static async checkAndIncrementCommentCount(userId: string): Promise<boolean> {
    return this.checkAndIncrementDailyCap(userId, 'comments');
  }

  private static async checkAndIncrementDailyCap(userId: string, type: 'likes' | 'comments'): Promise<boolean> {
    const supabaseAdmin = requireSupabaseAdmin();
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
      const supabaseAdmin = requireSupabaseAdmin();
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
      const supabaseAdmin = requireSupabaseAdmin();
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
      if (!isSupabaseAvailable) {
        const profile = await Profile.findByPk(userId);
        if (!profile) return 0;
        return Number((profile as any).purga_points ?? 0);
      }
      const supabaseAdmin = requireSupabaseAdmin();
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
      const supabaseAdmin = requireSupabaseAdmin();
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