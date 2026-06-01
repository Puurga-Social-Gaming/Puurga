import { supabase } from '../../config/supabase';
import { wsManager } from '../../websocketManager';
import { ReputationEngine } from './reputation-engine';
import { ThreatEngine } from './threat-engine';
import { StateEngine } from './state-engine';
import { InactivityEngine } from './inactivity-engine';
import { SurvivalState } from '../../constants/survivalConstants';

interface SurvivalStateResult {
  id: string;
  user_id: string;
  reputation_score: number;
  survival_score: number;
  threat_level: number;
  purge_count: number;
  survived_purges: number;
  redemption_count: number;
  ghost_status: boolean;
  inactivity_level: number;
  warning_level: number;
  social_rank: string;
  current_survival_state: SurvivalState;
  last_active_at: string | null;
  last_state_change_at: string | null;
  created_at: string;
  updated_at: string;
  visibility_score: number;
  purge_pressure: number;
  collapse_risk: number;
  last_purge_at: string | null;
}

export class SurvivalEngine {
  static async recalculate(userId: string): Promise<SurvivalStateResult | null> {
    const [repResult, threatResult, stateResult, inactivityResult] = await Promise.all([
      ReputationEngine.calculateReputation(userId),
      ThreatEngine.calculateThreatLevel(userId),
      StateEngine.determineState(userId),
      InactivityEngine.checkInactivity(userId),
    ]);

    const survival_score = this.calculateSurvivalScore(
      repResult.reputation_score,
      threatResult.threat_level,
      inactivityResult.inactivity_level
    );

    const now = new Date().toISOString();

    await supabase
      .from('user_survival_state')
      .update({
        survival_score,
        threat_level: threatResult.threat_level,
        current_survival_state: stateResult.current_survival_state,
        warning_level: stateResult.warning_level,
        ghost_status: stateResult.ghost_status,
        social_rank: repResult.social_rank,
      })
      .eq('user_id', userId);

    await supabase.from('survival_history').insert({
      user_id: userId,
      reputation_score: repResult.reputation_score,
      survival_score,
      threat_level: threatResult.threat_level,
      purge_count: 0,
      survival_state: stateResult.current_survival_state,
      recorded_at: now,
    });

    const { data: finalState } = await supabase
      .from('user_survival_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    const result = finalState as SurvivalStateResult | null;

    if (result) {
      this.emitWebSocketEvents(userId, result);
    }

    return result;
  }

  static async getState(userId: string): Promise<SurvivalStateResult | null> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    return state as SurvivalStateResult | null;
  }

  static async getHistory(userId: string, limit: number = 30): Promise<any[]> {
    const { data: history } = await supabase
      .from('survival_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    return history || [];
  }

  static async getNotifications(userId: string): Promise<any[]> {
    const { data: events } = await supabase
      .from('survival_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['INACTIVITY_WARNING', 'STATE_CHANGED', 'REPUTATION_GAIN', 'REPUTATION_LOSS', 'GHOST_ENTERED', 'GHOST_EXITED'])
      .order('created_at', { ascending: false })
      .limit(20);

    return events || [];
  }

  static async recordEvent(
    userId: string,
    eventType: string,
    eventValue: number = 0,
    metadata?: Record<string, any>
  ): Promise<void> {
    await supabase.from('survival_events').insert({
      user_id: userId,
      event_type: eventType,
      event_value: eventValue,
      metadata: metadata ? JSON.stringify(metadata) : '{}',
    });
  }

  private static calculateSurvivalScore(
    reputation: number,
    threatLevel: number,
    inactivityLevel: number
  ): number {
    let score = reputation;
    score -= threatLevel * 2;
    score -= inactivityLevel * 15;
    return Math.max(0, Math.min(1000, score));
  }

  private static async emitWebSocketEvents(userId: string, state: SurvivalStateResult): Promise<void> {
    wsManager.sendSurvivalUpdate(userId, {
      userId,
      survivalState: state.current_survival_state,
      reputationScore: state.reputation_score,
      threatLevel: state.threat_level,
      socialRank: state.social_rank,
      inactivityLevel: state.inactivity_level,
      ghostStatus: state.ghost_status,
      warningLevel: state.warning_level,
      visibilityScore: state.visibility_score,
      purgePressure: state.purge_pressure,
      collapseRisk: state.collapse_risk,
      purgeCount: state.purge_count,
    });
  }
}
