import { requireSupabase } from '../../config/supabase';
import { wsManager } from '../../websocketManager';
import { ReputationEngine } from './reputation-engine';
import { SurvivalEngine } from './survival-engine';
import { PurgatoryEngine } from './purgatory-engine';
import { AllianceEngine } from '../social/alliance-engine';
import { PURGE_THRESHOLD, PROFILE_PURGE_THRESHOLD } from '../../constants/purgeConstants';
import { CreditService } from '../creditService';
import {
  PURGE_TIERS,
  PURGE_RATE_LIMITS,
  PURGE_WEIGHTS,
  VISIBILITY,
  EVENT_TYPES,
} from '../../constants/survivalConstants';

interface PurgeValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  cooldown?: {
    exists: boolean;
    expiresAt?: string;
  };
}

interface PurgeWeightResult {
  weight: number;
  reputation: number;
  threatLevel: number;
}

interface PurgeConsequenceResult {
  tier: string;
  visibilityScore: number;
  purgePressure: number;
  collapseRisk: number;
  ghostTriggered: boolean;
  reputationChange: number;
}

export class PurgeEngine {
  static async validatePurge(userId: string, postId: string, targetUserId: string): Promise<PurgeValidationResult> {
    const supabaseClient = requireSupabase();
    if (String(userId) === String(targetUserId)) {
      return { valid: false, error: 'Cannot purge your own post', code: 'OWN_POST' };
    }

    const { data: existingPurge, error: existingError } = await supabaseClient
      .from('post_purges')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError && (existingError as any).code !== 'PGRST116' && (existingError as any).code !== '42P01') {
      console.warn('validatePurge existing check:', existingError.message);
    }

    if (existingPurge) {
      return { valid: false, error: 'Already purged this post', code: 'ALREADY_PURGED' };
    }

    try {
      const { data: cooldown } = await supabaseClient
        .from('purge_cooldowns')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .maybeSingle();

      if (cooldown && new Date(cooldown.expires_at) > new Date()) {
        return {
          valid: false,
          error: 'Purge cooldown active for this post',
          code: 'COOLDOWN_ACTIVE',
          cooldown: { exists: true, expiresAt: cooldown.expires_at },
        };
      }
    } catch (e) {
      console.warn('purge_cooldowns check skipped:', e);
    }

    try {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('hourly_purge_count, hourly_purge_reset_at, daily_purge_count, daily_purge_reset_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        // Missing rate-limit columns → skip limits rather than blocking purge
        console.warn('purge rate-limit profile check skipped:', profileError.message);
      } else if (profile) {
        const now = new Date();

        const hourlyReset = profile.hourly_purge_reset_at ? new Date(profile.hourly_purge_reset_at) : new Date(0);
        const hoursSinceReset = (now.getTime() - hourlyReset.getTime()) / (1000 * 60 * 60);
        const hourlyCount = hoursSinceReset < 1 ? (profile.hourly_purge_count || 0) : 0;

        if (hourlyCount >= PURGE_RATE_LIMITS.HOURLY_MAX) {
          return { valid: false, error: 'Hourly purge limit reached', code: 'HOURLY_LIMIT' };
        }

        const dailyReset = profile.daily_purge_reset_at ? new Date(profile.daily_purge_reset_at) : new Date(0);
        const daysSinceReset = (now.getTime() - dailyReset.getTime()) / (1000 * 60 * 60 * 24);
        const dailyCount = daysSinceReset < 1 ? (profile.daily_purge_count || 0) : 0;

        if (dailyCount >= PURGE_RATE_LIMITS.DAILY_MAX) {
          return { valid: false, error: 'Daily purge limit reached', code: 'DAILY_LIMIT' };
        }
      }
    } catch (e) {
      console.warn('purge rate limit validation skipped:', e);
    }

    return { valid: true };
  }

  static async calculatePurgeWeight(userId: string): Promise<PurgeWeightResult> {
    const supabaseClient = requireSupabase();
    const { data: state } = await supabaseClient
      .from('user_survival_state')
      .select('reputation_score, threat_level')
      .eq('user_id', userId)
      .single();

    if (!state) {
      return { weight: 1.0, reputation: 100, threatLevel: 0 };
    }

    let weight = 1.0;

    if (state.reputation_score < PURGE_WEIGHTS.LOW_REPUTATION.max) {
      weight = PURGE_WEIGHTS.LOW_REPUTATION.weight;
    } else if (state.reputation_score < PURGE_WEIGHTS.NORMAL_REPUTATION.max) {
      weight = PURGE_WEIGHTS.NORMAL_REPUTATION.weight;
    } else {
      weight = PURGE_WEIGHTS.HIGH_REPUTATION.weight;
    }

    if (state.threat_level >= PURGE_WEIGHTS.LEGENDARY_THREAT_THRESHOLD) {
      weight = PURGE_WEIGHTS.LEGENDARY_THREAT_WEIGHT;
    }

    return { weight, reputation: state.reputation_score, threatLevel: state.threat_level };
  }

  static determinePurgeTier(purgeCount: number): { tier: string; visibilityDrop: number } {
    for (const tier of PURGE_TIERS) {
      if (purgeCount >= tier.min && purgeCount <= tier.max) {
        return { tier: tier.label, visibilityDrop: tier.visibilityDrop };
      }
    }
    return { tier: 'GHOSTED', visibilityDrop: 80 };
  }

  static async applyConsequences(targetUserId: string, purgerUserId: string): Promise<PurgeConsequenceResult> {
    const supabaseClient = requireSupabase();
    let purgeResistanceMod = 1.0;
    try {
      purgeResistanceMod = await AllianceEngine.getPurgeResistanceModifier(targetUserId);
    } catch (e) {
      console.warn('Alliance purge resistance skipped:', e);
    }

    const stateResult = await supabaseClient
      .from('user_survival_state')
      .select('purge_count, visibility_score, purge_pressure, collapse_risk')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const state = stateResult.data;
    const rawPurgeCount = state ? (state.purge_count || 0) + 1 : 1;
    const effectivePurgeCount = Math.round(rawPurgeCount * purgeResistanceMod);
    const purgeCount = Math.max(1, effectivePurgeCount);

    const tier = this.determinePurgeTier(purgeCount);

    const newVisibilityScore = Math.max(VISIBILITY.MIN, VISIBILITY.DEFAULT - tier.visibilityDrop);

    let purgePressure = state?.purge_pressure || 0;
    if (purgeCount <= 74) purgePressure = 0;
    else if (purgeCount <= 149) purgePressure = Math.min(100, Math.floor(((purgeCount - 74) / 75) * 100));
    else if (purgeCount <= 224) purgePressure = Math.min(100, Math.floor(((purgeCount - 149) / 75) * 100));
    else purgePressure = 100;

    const collapseRisk = Math.min(100, Math.floor((purgeCount / PROFILE_PURGE_THRESHOLD) * 100));

    const now = new Date().toISOString();

    const { error: stateUpdateError } = await supabaseClient
      .from('user_survival_state')
      .update({
        visibility_score: newVisibilityScore,
        purge_pressure: purgePressure,
        collapse_risk: collapseRisk,
        last_purge_at: now,
      })
      .eq('user_id', targetUserId);

    if (stateUpdateError) {
      console.warn('user_survival_state update skipped:', stateUpdateError.message);
    }

    try {
      await ReputationEngine.applyReputationChange(targetUserId, 'PURGE_RECEIVED', {
        purgedBy: purgerUserId,
        purgeCount,
      });
    } catch (e) {
      console.warn('Reputation change skipped:', e);
    }

    try {
      await SurvivalEngine.recordEvent(targetUserId, 'PURGE_RECEIVED', -5, {
        purgedBy: purgerUserId,
        purgeCount,
        tier: tier.tier,
        visibilityScore: newVisibilityScore,
      });

      if (tier.visibilityDrop > 0) {
        await SurvivalEngine.recordEvent(targetUserId, 'VISIBILITY_CHANGED', newVisibilityScore, {
          drop: tier.visibilityDrop,
          tier: tier.tier,
        });
      }

      await SurvivalEngine.recordEvent(targetUserId, 'PURGE_PRESSURE_CHANGED', purgePressure, {
        purgeCount,
      });
    } catch (e) {
      console.warn('Survival events skipped:', e);
    }

    let ghostTriggered = false;
    if (purgeCount >= PROFILE_PURGE_THRESHOLD) {
      try {
        const { data: targetProfile } = await supabaseClient
          .from('profiles')
          .select('is_ghost')
          .eq('id', targetUserId)
          .maybeSingle();

        if (!targetProfile?.is_ghost) {
          await supabaseClient
            .from('profiles')
            .update({
              is_ghost: true,
              ghosted_at: now,
            })
            .eq('id', targetUserId);

          try {
            await PurgatoryEngine.enterPurgatory(targetUserId);
          } catch (e) {
            console.warn('enterPurgatory skipped:', e);
          }

          ghostTriggered = true;

          // Award 300 credits to the purger for ghosting a user
          try {
            await CreditService.awardCredits(purgerUserId, 300, 'redeem_user', 'Ghosted a user');
          } catch (e) {
            console.warn('Ghost reward credit award skipped:', e);
          }
        }
      } catch (e) {
        console.warn('Ghost trigger skipped:', e);
      }
    }

    try {
      await SurvivalEngine.recalculate(targetUserId);
    } catch (e) {
      console.warn('Survival recalculate skipped:', e);
    }

    try {
      this.emitConsequenceEvents(targetUserId, {
        tier: tier.tier,
        visibilityScore: newVisibilityScore,
        purgePressure,
        collapseRisk,
        ghostTriggered,
        purgeCount,
      });
    } catch (e) {
      console.warn('Consequence WS events skipped:', e);
    }

    return {
      tier: tier.tier,
      visibilityScore: newVisibilityScore,
      purgePressure,
      collapseRisk,
      ghostTriggered,
      reputationChange: -5,
    };
  }

  static async recordCooldown(userId: string, postId: string): Promise<void> {
    const supabaseClient = requireSupabase();
    const expiresAt = new Date(
      Date.now() + PURGE_RATE_LIMITS.SAME_POST_COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabaseClient.from('purge_cooldowns').upsert({
      user_id: userId,
      post_id: postId,
      purged_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, { onConflict: 'user_id,post_id' });

    if (error) {
      // Table / unique constraint may be missing on older DBs
      console.warn('recordCooldown skipped:', error.message);
    }
  }

  static async updateRateLimits(userId: string): Promise<void> {
    const supabaseClient = requireSupabase();
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('hourly_purge_count, hourly_purge_reset_at, daily_purge_count, daily_purge_reset_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('updateRateLimits skipped (columns may be missing):', profileError.message);
      return;
    }

    const now = new Date();

    let hourlyCount = 1;
    let hourlyResetAt = now.toISOString();
    let dailyCount = 1;
    let dailyResetAt = now.toISOString();

    if (profile) {
      const hourlyReset = profile.hourly_purge_reset_at ? new Date(profile.hourly_purge_reset_at) : new Date(0);
      const hoursSinceReset = (now.getTime() - hourlyReset.getTime()) / (1000 * 60 * 60);
      hourlyCount = hoursSinceReset < 1 ? (profile.hourly_purge_count || 0) + 1 : 1;
      hourlyResetAt = hoursSinceReset < 1 ? profile.hourly_purge_reset_at : now.toISOString();

      const dailyReset = profile.daily_purge_reset_at ? new Date(profile.daily_purge_reset_at) : new Date(0);
      const daysSinceReset = (now.getTime() - dailyReset.getTime()) / (1000 * 60 * 60 * 24);
      dailyCount = daysSinceReset < 1 ? (profile.daily_purge_count || 0) + 1 : 1;
      dailyResetAt = daysSinceReset < 1 ? profile.daily_purge_reset_at : now.toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        hourly_purge_count: hourlyCount,
        hourly_purge_reset_at: hourlyResetAt,
        daily_purge_count: dailyCount,
        daily_purge_reset_at: dailyResetAt,
      })
      .eq('id', userId);

    if (updateError) {
      console.warn('updateRateLimits update skipped:', updateError.message);
    }
  }

  static async getVisibilityScore(userId: string): Promise<number> {
    const supabaseClient = requireSupabase();
    const { data: state } = await supabaseClient
      .from('user_survival_state')
      .select('visibility_score')
      .eq('user_id', userId)
      .single();

    return state?.visibility_score ?? VISIBILITY.DEFAULT;
  }

  static async getCooldowns(userId: string): Promise<any[]> {
    const supabaseClient = requireSupabase();
    const { data: cooldowns } = await supabaseClient
      .from('purge_cooldowns')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    return cooldowns || [];
  }

  static getVisibilityRankingMultiplier(visibilityScore: number): number {
    if (visibilityScore >= VISIBILITY.HIGH_MIN) return 1.5;
    if (visibilityScore >= VISIBILITY.NORMAL_MIN) return 1.0;
    if (visibilityScore >= VISIBILITY.LOW_MIN) return 0.5;
    return 0.2;
  }

  private static async emitConsequenceEvents(
    userId: string,
    data: {
      tier: string;
      visibilityScore: number;
      purgePressure: number;
      collapseRisk: number;
      ghostTriggered: boolean;
      purgeCount: number;
    }
  ): Promise<void> {
    const supabaseClient = requireSupabase();
    wsManager.sendToUser(userId, {
      type: 'survival_update',
      payload: {
        userId,
        survivalState: data.ghostTriggered ? 'GHOSTED' : undefined,
        visibilityScore: data.visibilityScore,
        purgePressure: data.purgePressure,
        collapseRisk: data.collapseRisk,
        purgeCount: data.purgeCount,
      } as any,
    });

    wsManager.sendToUser(userId, {
      type: 'notification',
      payload: {
        id: `purge-${Date.now()}`,
        type: 'purge',
        fromUser: { id: '', name: '', username: '' },
        title: this.getTierNotificationTitle(data.tier),
        message: this.getTierNotificationMessage(data.tier),
        createdAt: new Date().toISOString(),
      },
    });

    if (data.ghostTriggered) {
      const { data: friendships } = await supabaseClient
        .from('friends')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      if (friendships) {
        for (const f of friendships) {
          const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
          wsManager.sendToUser(friendId, {
            type: 'profile_update',
            payload: { userId, isGhost: true, purgeCount: data.purgeCount },
          });
        }
      }
    }
  }

  static getTierNotificationTitle(tier: string): string {
    const titles: Record<string, string> = {
      STABLE: '',
      WATCHED: 'You are being watched.',
      HUNTED: 'Your influence is weakening.',
      COLLAPSING: 'Your visibility is collapsing.',
      GHOSTED: 'You are approaching social death.',
    };
    return titles[tier] || '';
  }

  static getTierNotificationMessage(tier: string): string {
    const messages: Record<string, string> = {
      STABLE: '',
      WATCHED: 'Your actions are being monitored. Visibility slightly reduced.',
      HUNTED: 'Your reach is diminishing. The network is turning against you.',
      COLLAPSING: 'Your presence is fading. Fewer will see your voice.',
      GHOSTED: 'You have become a ghost. Social death approaches.',
    };
    return messages[tier] || '';
  }
}
