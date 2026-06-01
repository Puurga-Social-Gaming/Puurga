import { supabase } from '../../config/supabase';
import { SURVIVAL_THRESHOLDS, REPUTATION_EFFECTS, SOCIAL_RANKS } from '../../constants/survivalConstants';

export class ReputationEngine {
  static async calculateReputation(userId: string): Promise<{ reputation_score: number; social_rank: string }> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('reputation_score, purge_count, inactivity_level, ghost_status')
      .eq('user_id', userId)
      .single();

    if (!state) {
      return { reputation_score: 100, social_rank: 'UNKNOWN' };
    }

    let score = state.reputation_score;

    if (state.ghost_status) {
      score += REPUTATION_EFFECTS.GHOST_PER_DAY;
    }

    score = Math.max(SURVIVAL_THRESHOLDS.REPUTATION.MIN, score);
    score = Math.min(SURVIVAL_THRESHOLDS.REPUTATION.MAX, score);

    const social_rank = this.getSocialRank(score);

    return { reputation_score: score, social_rank };
  }

  static getSocialRank(reputation: number): string {
    let rank = 'UNKNOWN';
    for (const tier of SOCIAL_RANKS) {
      if (reputation >= tier.minRep) {
        rank = tier.rank;
      }
    }
    return rank;
  }

  static async applyReputationChange(
    userId: string,
    effectKey: keyof typeof REPUTATION_EFFECTS,
    metadata?: Record<string, any>
  ): Promise<number> {
    const change = REPUTATION_EFFECTS[effectKey];
    if (!change) return 0;

    const { data: state } = await supabase
      .from('user_survival_state')
      .select('reputation_score')
      .eq('user_id', userId)
      .single();

    if (!state) return 0;

    let newScore = state.reputation_score + change;
    newScore = Math.max(SURVIVAL_THRESHOLDS.REPUTATION.MIN, newScore);
    newScore = Math.min(SURVIVAL_THRESHOLDS.REPUTATION.MAX, newScore);

    await supabase
      .from('user_survival_state')
      .update({
        reputation_score: newScore,
        social_rank: this.getSocialRank(newScore),
      })
      .eq('user_id', userId);

    await supabase.from('survival_events').insert({
      user_id: userId,
      event_type: change > 0 ? 'REPUTATION_GAIN' : 'REPUTATION_LOSS',
      event_value: change,
      metadata: metadata ? JSON.stringify(metadata) : JSON.stringify({ effectKey }),
    });

    return newScore;
  }

  static async getSocialRankForUser(userId: string): Promise<string> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('reputation_score')
      .eq('user_id', userId)
      .single();

    if (!state) return 'UNKNOWN';
    return this.getSocialRank(state.reputation_score);
  }
}
