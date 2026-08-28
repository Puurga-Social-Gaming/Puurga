import { requireSupabase } from '../../config/supabase';
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

/** True once we know user_survival_state is missing on this DB (migration not applied). */
let survivalSchemaMissing = false;
let survivalSchemaMissingLogged = false;

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || Boolean(error.message?.includes('does not exist'));
}

function defaultSurvivalState(userId: string): SurvivalStateResult {
  const now = new Date().toISOString();
  return {
    id: `temp-${userId}`,
    user_id: userId,
    reputation_score: 100,
    survival_score: 100,
    threat_level: 0,
    purge_count: 0,
    survived_purges: 0,
    redemption_count: 0,
    ghost_status: false,
    inactivity_level: 0,
    warning_level: 0,
    social_rank: 'UNKNOWN',
    current_survival_state: 'SAFE',
    last_active_at: now,
    last_state_change_at: now,
    created_at: now,
    updated_at: now,
    visibility_score: 100,
    purge_pressure: 0,
    collapse_risk: 0,
    last_purge_at: null,
  };
}

function markSchemaMissing(context: string): void {
  survivalSchemaMissing = true;
  if (!survivalSchemaMissingLogged) {
    survivalSchemaMissingLogged = true;
    console.warn(
      `[Survival] Schema missing (${context}). Apply backend/scripts/apply-survival-schema.sql in the supabaseClient SQL editor. Returning SAFE defaults until then.`
    );
  }
}

export class SurvivalEngine {
  static async recalculate(userId: string): Promise<SurvivalStateResult | null> {
    const supabaseClient = requireSupabase();
    if (survivalSchemaMissing) {
      return defaultSurvivalState(userId);
    }

    // Ensure row exists before engines try to update it
    await this.ensureState(userId);

    if (survivalSchemaMissing) {
      return defaultSurvivalState(userId);
    }

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

    await supabaseClient
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

    await supabaseClient.from('survival_history').insert({
      user_id: userId,
      reputation_score: repResult.reputation_score,
      survival_score,
      threat_level: threatResult.threat_level,
      purge_count: 0,
      survival_state: stateResult.current_survival_state,
      recorded_at: now,
    });

    const { data: finalState } = await supabaseClient
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

  static async ensureState(userId: string): Promise<SurvivalStateResult | null> {
    const supabaseClient = requireSupabase();
    if (survivalSchemaMissing) {
      return defaultSurvivalState(userId);
    }

    const existing = await this.getState(userId);
    if (existing) return existing;
    if (survivalSchemaMissing) {
      return defaultSurvivalState(userId);
    }

    const now = new Date().toISOString();
    const defaults = {
      user_id: userId,
      reputation_score: 100,
      survival_score: 100,
      threat_level: 0,
      purge_count: 0,
      survived_purges: 0,
      redemption_count: 0,
      ghost_status: false,
      inactivity_level: 0,
      warning_level: 0,
      social_rank: 'UNKNOWN',
      current_survival_state: 'SAFE' as SurvivalState,
      last_active_at: now,
      last_state_change_at: now,
      visibility_score: 100,
      purge_pressure: 0,
      collapse_risk: 0,
    };

    const { data, error } = await supabaseClient
      .from('user_survival_state')
      .upsert(defaults, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        markSchemaMissing('ensureState upsert');
        return defaultSurvivalState(userId);
      }
      console.error('Failed to ensure survival state:', error);
      return defaultSurvivalState(userId);
    }

    return data as SurvivalStateResult;
  }

  static async getState(userId: string): Promise<SurvivalStateResult | null> {
    const supabaseClient = requireSupabase();
    if (survivalSchemaMissing) {
      return defaultSurvivalState(userId);
    }

    const { data: state, error } = await supabaseClient
      .from('user_survival_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        markSchemaMissing('getState');
        return defaultSurvivalState(userId);
      }
      console.error('Error fetching survival state:', error);
      return null;
    }

    return state as SurvivalStateResult | null;
  }

  static async getHistory(userId: string, limit: number = 30): Promise<any[]> {
    const supabaseClient = requireSupabase();
    if (survivalSchemaMissing) return [];

    const { data: history, error } = await supabaseClient
      .from('survival_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error && isMissingRelationError(error)) {
      markSchemaMissing('getHistory');
      return [];
    }

    return history || [];
  }

  static async getNotifications(userId: string): Promise<any[]> {
    const supabaseClient = requireSupabase();
    if (survivalSchemaMissing) return [];

    const { data: events, error } = await supabaseClient
      .from('survival_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['INACTIVITY_WARNING', 'STATE_CHANGED', 'REPUTATION_GAIN', 'REPUTATION_LOSS', 'GHOST_ENTERED', 'GHOST_EXITED'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error && isMissingRelationError(error)) {
      markSchemaMissing('getNotifications');
      return [];
    }

    return events || [];
  }

  static async recordEvent(
    userId: string,
    eventType: string,
    eventValue: number = 0,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabaseClient = requireSupabase();
    if (survivalSchemaMissing) return;

    try {
      await supabaseClient.from('survival_events').insert({
        user_id: userId,
        event_type: eventType,
        event_value: eventValue,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      });

      if (eventType === 'GAME_PLAYER_BANKRUPT') {
        await supabaseClient.from('survival_history').insert({
          user_id: userId,
          event_type: eventType,
          event_value: eventValue,
          metadata: metadata ? JSON.stringify(metadata) : '{}',
        });
      }
    } catch (error) {
      if (isMissingRelationError(error as any)) {
        markSchemaMissing('recordEvent');
      }
    }
  }

  /**
   * Gaming emits GAME_PLAYER_BANKRUPT — Survival alone decides Ghost / Purgatory.
   * Does not let the games layer mutate profiles.is_ghost directly.
   */
  static async handleGamePlayerBankrupt(
    userId: string,
    meta?: { reason?: string; challengeId?: string; message?: string }
  ): Promise<SurvivalStateResult | null> {
    await this.recordEvent(userId, 'GAME_PLAYER_BANKRUPT', 0, meta || {});

    // Raise threat pressure via recalculation; StateEngine / ThreatEngine react to low engagement + events
    const state = await this.recalculate(userId);

    // If already critically low survival, Survival may already have ghost_status true.
    // Soft notify via WS only — no direct profile purge write from games.
    if (state) {
      this.emitWebSocketEvents(userId, state);
    }

    // Mark purge event processed when table exists
    try {
      const { requireSupabaseAdmin } = await import('../../config/supabase');
      const supabaseAdminClient = requireSupabaseAdmin();
      await supabaseAdminClient
        .from('game_purge_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('processed', false);
    } catch {
      // ignore
    }

    return state;
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
