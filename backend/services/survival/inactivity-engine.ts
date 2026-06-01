import { supabase } from '../../config/supabase';
import { SURVIVAL_THRESHOLDS, REPUTATION_EFFECTS } from '../../constants/survivalConstants';

export class InactivityEngine {
  static async checkInactivity(userId: string): Promise<{
    inactivity_level: number;
    days_inactive: number;
  }> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('last_active_at, inactivity_level')
      .eq('user_id', userId)
      .single();

    if (!state || !state.last_active_at) {
      return { inactivity_level: 0, days_inactive: 0 };
    }

    const now = new Date();
    const lastActive = new Date(state.last_active_at);
    const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    let level = 0;
    if (daysInactive > SURVIVAL_THRESHOLDS.INACTIVITY.LEVEL_5_DAYS) {
      level = 5;
    } else if (daysInactive > SURVIVAL_THRESHOLDS.INACTIVITY.LEVEL_4_DAYS) {
      level = 4;
    } else if (daysInactive > SURVIVAL_THRESHOLDS.INACTIVITY.LEVEL_3_DAYS) {
      level = 3;
    } else if (daysInactive > SURVIVAL_THRESHOLDS.INACTIVITY.LEVEL_2_DAYS) {
      level = 2;
    } else if (daysInactive > SURVIVAL_THRESHOLDS.INACTIVITY.LEVEL_1_DAYS) {
      level = 1;
    } else if (daysInactive > SURVIVAL_THRESHOLDS.INACTIVITY.LEVEL_0_DAYS) {
      level = 0;
    }

    if (level !== state.inactivity_level) {
      await supabase
        .from('user_survival_state')
        .update({ inactivity_level: level })
        .eq('user_id', userId);

      if (level >= 1 && state.inactivity_level < level) {
        await supabase.from('survival_events').insert({
          user_id: userId,
          event_type: 'INACTIVITY_WARNING',
          event_value: level,
          metadata: JSON.stringify({ days_inactive: daysInactive }),
        });
      }

      if (level >= 1) {
        const { ReputationEngine } = await import('./reputation-engine');
        const penaltyDays = level - Math.max(state.inactivity_level, 0);
        for (let i = 0; i < penaltyDays; i++) {
          await ReputationEngine.applyReputationChange(userId, 'INACTIVITY_PER_DAY', { daysInactive });
        }
      }
    }

    return { inactivity_level: level, days_inactive: daysInactive };
  }

  static async recordActivity(userId: string): Promise<void> {
    const now = new Date().toISOString();

    const { data: state } = await supabase
      .from('user_survival_state')
      .select('inactivity_level')
      .eq('user_id', userId)
      .single();

    await supabase
      .from('user_survival_state')
      .update({
        last_active_at: now,
        inactivity_level: 0,
      })
      .eq('user_id', userId);

    if (state && state.inactivity_level >= 1) {
      const { ReputationEngine } = await import('./reputation-engine');
      await ReputationEngine.applyReputationChange(userId, 'DAILY_ACTIVITY_STREAK', { recovery: true });
    }
  }

  static async getInactivityLevel(userId: string): Promise<number> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('inactivity_level')
      .eq('user_id', userId)
      .single();

    return state?.inactivity_level || 0;
  }
}
