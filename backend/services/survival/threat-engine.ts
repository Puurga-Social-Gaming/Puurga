import { requireSupabase } from '../../config/supabase';
import { SURVIVAL_THRESHOLDS, THREAT_FACTORS, THREAT_TIERS } from '../../constants/survivalConstants';

export class ThreatEngine {
  static async calculateThreatLevel(userId: string): Promise<{ threat_level: number; threat_tier: string }> {
    const supabaseClient = requireSupabase();
    const [stateResult, engagementResult, purgeResult] = await Promise.all([
      supabaseClient
        .from('user_survival_state')
        .select('reputation_score, purge_count')
        .eq('user_id', userId)
        .single(),
      supabaseClient
        .from('survival_events')
        .select('event_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabaseClient
        .from('survival_events')
        .select('event_type, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'PURGE_RECEIVED')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    if (!stateResult.data) {
      return { threat_level: 0, threat_tier: 'LOW' };
    }

    const state = stateResult.data;
    const recentActivity = engagementResult.data || [];
    const recentPurges = purgeResult.data || [];

    let threat = 0;

    const postCount = recentActivity.filter(e => e.event_type === 'POST_CREATED').length;
    const engagementVelocity = Math.min(postCount * 2, THREAT_FACTORS.ENGAGEMENT_VELOCITY_MAX);
    threat += engagementVelocity;

    const purgeActivity = Math.min(recentPurges.length, THREAT_FACTORS.PURGE_ACTIVITY_MAX);
    threat += purgeActivity;

    if (state.reputation_score < 60) {
      threat += 10;
    }
    if (state.purge_count >= 10) {
      threat += 10;
    }

    threat = Math.max(SURVIVAL_THRESHOLDS.THREAT_LEVEL.MIN, threat);
    threat = Math.min(SURVIVAL_THRESHOLDS.THREAT_LEVEL.MAX, threat);

    const tier = this.getThreatTier(threat);

    return { threat_level: threat, threat_tier: tier };
  }

  static getThreatTier(threatLevel: number): string {
    for (const tier of THREAT_TIERS) {
      if (threatLevel >= tier.min && threatLevel <= tier.max) {
        return tier.label;
      }
    }
    return 'LOW';
  }
}
