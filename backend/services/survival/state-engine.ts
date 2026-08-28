import { requireSupabase } from '../../config/supabase';
import { SURVIVAL_THRESHOLDS, SurvivalState } from '../../constants/survivalConstants';
import { AllianceEngine } from '../social/alliance-engine';

export class StateEngine {
  static async determineState(userId: string): Promise<{
    current_survival_state: SurvivalState;
    warning_level: number;
    ghost_status: boolean;
  }> {
    const supabaseClient = requireSupabase();
    const [state, thresholdMod] = await Promise.all([
      supabaseClient
        .from('user_survival_state')
        .select('*')
        .eq('user_id', userId)
        .single(),
      AllianceEngine.getStateThresholdModifier(userId),
    ]);

    if (!state.data) {
      return {
        current_survival_state: 'SAFE',
        warning_level: 0,
        ghost_status: false,
      };
    }

    const adjustedPurgeLimit = (limit: number) => Math.round(limit * thresholdMod);
    const adjustedRepMin = (min: number) => Math.round(min / thresholdMod);

    const isGhosted = await this.checkGhosted(state.data, adjustedPurgeLimit, adjustedRepMin);
    if (isGhosted) {
      await this.transitionTo(state.data, 'GHOSTED');
      return {
        current_survival_state: 'GHOSTED',
        warning_level: 5,
        ghost_status: true,
      };
    }

    const isCollapsing = this.checkCollapsing(state.data, adjustedPurgeLimit, adjustedRepMin);
    if (isCollapsing) {
      await this.transitionTo(state.data, 'COLLAPSING');
      return {
        current_survival_state: 'COLLAPSING',
        warning_level: 4,
        ghost_status: false,
      };
    }

    const isHunted = this.checkHunted(state.data, adjustedPurgeLimit, adjustedRepMin);
    if (isHunted) {
      await this.transitionTo(state.data, 'HUNTED');
      return {
        current_survival_state: 'HUNTED',
        warning_level: 3,
        ghost_status: false,
      };
    }

    const isWarning = this.checkWarning(state.data, adjustedPurgeLimit, adjustedRepMin);
    if (isWarning) {
      await this.transitionTo(state.data, 'WARNING');
      return {
        current_survival_state: 'WARNING',
        warning_level: Math.min(
          Math.floor((SURVIVAL_THRESHOLDS.STATE.SAFE_REPUTATION_MIN - state.data.reputation_score) / 10) + 1,
          3
        ),
        ghost_status: false,
      };
    }

    if (state.data.current_survival_state !== 'SAFE') {
      await this.transitionTo(state.data, 'SAFE');
    }

    return {
      current_survival_state: 'SAFE',
      warning_level: 0,
      ghost_status: false,
    };
  }

  private static async checkGhosted(state: any, adjustedLimit: (n: number) => number, adjustedRepMin: (n: number) => number): Promise<boolean> {
    if (state.purge_count >= adjustedLimit(SURVIVAL_THRESHOLDS.STATE.GHOSTED_PURGE_LIMIT)) return true;
    if (state.reputation_score <= adjustedRepMin(SURVIVAL_THRESHOLDS.STATE.GHOSTED_REPUTATION_MAX)) return true;
    return false;
  }

  private static checkCollapsing(state: any, adjustedLimit: (n: number) => number, adjustedRepMin: (n: number) => number): boolean {
    if (state.purge_count >= adjustedLimit(SURVIVAL_THRESHOLDS.STATE.COLLAPSING_PURGE_LIMIT)) return true;
    if (state.reputation_score < adjustedRepMin(SURVIVAL_THRESHOLDS.STATE.COLLAPSING_REPUTATION_MAX)) return true;
    if (state.inactivity_level >= SURVIVAL_THRESHOLDS.STATE.COLLAPSING_INACTIVITY_MIN) return true;
    return false;
  }

  private static checkHunted(state: any, adjustedLimit: (n: number) => number, adjustedRepMin: (n: number) => number): boolean {
    if (state.purge_count >= adjustedLimit(SURVIVAL_THRESHOLDS.STATE.HUNTED_PURGE_LIMIT)) return true;
    if (state.reputation_score < adjustedRepMin(SURVIVAL_THRESHOLDS.STATE.HUNTED_REPUTATION_MAX)) return true;
    return false;
  }

  private static checkWarning(state: any, adjustedLimit: (n: number) => number, adjustedRepMin: (n: number) => number): boolean {
    const supabaseClient = requireSupabase();
    if (state.purge_count >= adjustedLimit(SURVIVAL_THRESHOLDS.STATE.WARNING_PURGE_LIMIT)) return true;
    if (state.reputation_score < adjustedRepMin(SURVIVAL_THRESHOLDS.STATE.WARNING_REPUTATION_MAX)) return true;
    if (state.inactivity_level >= SURVIVAL_THRESHOLDS.STATE.WARNING_INACTIVITY_MIN) return true;
    return false;
  }

  private static async transitionTo(state: any, newState: SurvivalState): Promise<void> {
    const supabaseClient = requireSupabase();
    if (state.current_survival_state === newState) return;

    const now = new Date().toISOString();

    await supabaseClient
      .from('user_survival_state')
      .update({
        current_survival_state: newState,
        last_state_change_at: now,
        ghost_status: newState === 'GHOSTED',
      })
      .eq('user_id', state.user_id);

    await supabaseClient.from('survival_events').insert({
      user_id: state.user_id,
      event_type: 'STATE_CHANGED',
      event_value: SURVIVAL_STATE_VALUES[newState] || 0,
      metadata: JSON.stringify({
        from: state.current_survival_state,
        to: newState,
      }),
    });
  }
}

const SURVIVAL_STATE_VALUES: Record<string, number> = {
  SAFE: 0,
  WARNING: 1,
  HUNTED: 2,
  COLLAPSING: 3,
  GHOSTED: 4,
};
