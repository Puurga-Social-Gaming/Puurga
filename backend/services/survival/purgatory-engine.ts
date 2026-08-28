import { requireSupabase } from '../../config/supabase';
import { wsManager } from '../../websocketManager';
import { SurvivalEngine } from './survival-engine';

interface PurgatoryStatus {
  purgatory_status: boolean;
  purgatory_entered_at: string | null;
  redemption_progress: number;
  redemption_requested: boolean;
  redemption_request_at: string | null;
  purge_count: number;
  survival_state: string;
  reputation_score: number;
}

interface RedemptionProgressBreakdown {
  timeSurvived: number;
  dailyLogin: number;
  profileCompletion: number;
  emailVerified: number;
  spectating: number;
  total: number;
}

export class PurgatoryEngine {
  static async getStatus(userId: string): Promise<PurgatoryStatus | null> {
    const supabaseClient = requireSupabase();
    const { data: state } = await supabaseClient
      .from('user_survival_state')
      .select('purgatory_status, purgatory_entered_at, redemption_progress, redemption_requested, redemption_request_at, purge_count, current_survival_state, reputation_score')
      .eq('user_id', userId)
      .single();

    if (!state) return null;

    return {
      purgatory_status: state.purgatory_status || false,
      purgatory_entered_at: state.purgatory_entered_at,
      redemption_progress: state.redemption_progress || 0,
      redemption_requested: state.redemption_requested || false,
      redemption_request_at: state.redemption_request_at,
      purge_count: state.purge_count || 0,
      survival_state: state.current_survival_state,
      reputation_score: state.reputation_score,
    };
  }

  static async calculateRedemptionProgress(userId: string): Promise<RedemptionProgressBreakdown> {
    const supabaseClient = requireSupabase();
    const breakdown: RedemptionProgressBreakdown = {
      timeSurvived: 0,
      dailyLogin: 0,
      profileCompletion: 0,
      emailVerified: 0,
      spectating: 0,
      total: 0,
    };

    const [stateResult, profileResult] = await Promise.all([
      supabaseClient
        .from('user_survival_state')
        .select('purgatory_entered_at, redemption_progress')
        .eq('user_id', userId)
        .single(),
      supabaseClient
        .from('profiles')
        .select('login_streak, avatar_url, bio, email_verified')
        .eq('id', userId)
        .single(),
    ]);

    const state = stateResult.data;
    const profile = profileResult.data;

    if (!state || !profile) return breakdown;

    if (state.purgatory_entered_at) {
      const daysSinceEntry = Math.floor(
        (Date.now() - new Date(state.purgatory_entered_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      breakdown.timeSurvived = Math.min(daysSinceEntry * 2, 20);
    }

    if (profile.login_streak && profile.login_streak > 0) {
      breakdown.dailyLogin = Math.min(profile.login_streak * 3, 15);
    }

    let profileScore = 0;
    if (profile.bio && profile.bio.trim().length > 0) profileScore += 5;
    if (profile.avatar_url && profile.avatar_url.trim().length > 0) profileScore += 5;
    breakdown.profileCompletion = profileScore;

    if (profile.email_verified) {
      breakdown.emailVerified = 20;
    }

    const total = breakdown.timeSurvived + breakdown.dailyLogin +
      breakdown.profileCompletion + breakdown.emailVerified + breakdown.spectating;

    breakdown.total = Math.min(total, 50);

    return breakdown;
  }

  static async updateRedemptionProgress(userId: string): Promise<number> {
    const supabaseClient = requireSupabase();
    const breakdown = await this.calculateRedemptionProgress(userId);

    await supabaseClient
      .from('user_survival_state')
      .update({ redemption_progress: breakdown.total })
      .eq('user_id', userId);

    if (breakdown.total > 0) {
      await SurvivalEngine.recordEvent(userId, 'REPUTATION_GAIN', breakdown.total, {
        source: 'redemption_progress',
        breakdown,
      });

      wsManager.sendToUser(userId, {
        type: 'survival_update',
        payload: {
          userId,
          redemptionProgress: breakdown.total,
        } as any,
      });
    }

    return breakdown.total;
  }

  static async requestRedemption(userId: string): Promise<{ success: boolean; requestId?: string; error?: string }> {
    const supabaseClient = requireSupabase();
    const status = await this.getStatus(userId);

    if (!status) {
      return { success: false, error: 'Survival state not found' };
    }

    if (!status.purgatory_status) {
      return { success: false, error: 'Not in purgatory status' };
    }

    if (status.redemption_requested) {
      return { success: false, error: 'Redemption already requested' };
    }

    const { data: existingRequest } = await supabaseClient
      .from('redemption_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .single();

    if (existingRequest) {
      return { success: false, error: 'A pending redemption request already exists' };
    }

    const progress = await this.calculateRedemptionProgress(userId);

    const { data: request, error } = await supabaseClient
      .from('redemption_requests')
      .insert({
        user_id: userId,
        status: 'PENDING',
        progress_at_request: progress.total,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !request) {
      return { success: false, error: 'Failed to create redemption request' };
    }

    await supabaseClient
      .from('user_survival_state')
      .update({
        redemption_requested: true,
        redemption_request_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    await SurvivalEngine.recordEvent(userId, 'REPUTATION_GAIN', 0, {
      action: 'redemption_requested',
      requestId: request.id,
      progressAtRequest: progress.total,
    });

    wsManager.sendToUser(userId, {
      type: 'notification',
      payload: {
        id: `redemption-request-${Date.now()}`,
        type: 'survival_alert',
        fromUser: { id: '', name: '', username: '' },
        title: 'Redemption Request Submitted',
        message: 'Your request for redemption has been recorded. Seek supporters to approve it.',
        createdAt: new Date().toISOString(),
      },
    });

    return { success: true, requestId: request.id };
  }

  static async getPendingRequests(): Promise<any[]> {
    const supabaseClient = requireSupabase();
    const { data: requests } = await supabaseClient
      .from('redemption_requests')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (!requests) return [];

    const userIds = Array.from(new Set(requests.map(r => r.user_id)));
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const { data: survivalStates } = await supabaseClient
      .from('user_survival_state')
      .select('user_id, redemption_progress, purge_count, purgatory_entered_at, current_survival_state')
      .in('user_id', userIds);

    const stateMap = new Map((survivalStates || []).map(s => [s.user_id, s]));

    return requests.map(req => {
      const profile = profileMap.get(req.user_id);
      const st = stateMap.get(req.user_id);
      return {
        id: req.id,
        userId: req.user_id,
        username: profile?.username || 'Unknown',
        name: profile?.full_name || profile?.username || 'Unknown',
        avatar: profile?.avatar_url || null,
        status: req.status,
        progressAtRequest: req.progress_at_request,
        redemptionProgress: st?.redemption_progress || 0,
        purgeCount: st?.purge_count || 0,
        daysInPurgatory: st?.purgatory_entered_at
          ? Math.floor((Date.now() - new Date(st.purgatory_entered_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        survivalState: st?.current_survival_state || 'GHOSTED',
        createdAt: req.created_at,
      };
    });
  }

  static async approveRequest(requestId: string, supporterId: string): Promise<{ success: boolean; error?: string }> {
    const supabaseClient = requireSupabase();
    const { data: request } = await supabaseClient
      .from('redemption_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'PENDING')
      .single();

    if (!request) {
      return { success: false, error: 'Pending redemption request not found' };
    }

    const { data: supporterProfile } = await supabaseClient
      .from('profiles')
      .select('credits, purga_points')
      .eq('id', supporterId)
      .single();

    const supporterCredits = Number(supporterProfile?.credits ?? supporterProfile?.purga_points ?? 0);
    if (supporterCredits < 100) {
      return { success: false, error: 'You need at least 100 credits to support a redemption' };
    }

    const { data: ghostState } = await supabaseClient
      .from('user_survival_state')
      .select('redemption_progress')
      .eq('user_id', request.user_id)
      .single();

    const currentProgress = ghostState?.redemption_progress || 0;
    const newProgress = Math.min(100, currentProgress + 25);

    const now = new Date().toISOString();

    await supabaseClient
      .from('redemption_requests')
      .update({
        status: 'APPROVED',
        supporter_id: supporterId,
        updated_at: now,
      })
      .eq('id', requestId);

    await supabaseClient
      .from('user_survival_state')
      .update({
        redemption_progress: newProgress,
        supporter_id: supporterId,
      })
      .eq('user_id', request.user_id);

    if (newProgress >= 100) {
      await this.exitPurgatory(request.user_id, supporterId);
    }

    await SurvivalEngine.recordEvent(request.user_id, 'REPUTATION_GAIN', newProgress, {
      action: 'redemption_approved',
      requestId,
      supporterId,
      newProgress,
    });

    wsManager.sendToUser(request.user_id, {
      type: 'notification',
      payload: {
        id: `redemption-approved-${Date.now()}`,
        type: 'survival_alert',
        fromUser: { id: supporterId, name: '', username: '' },
        title: 'Redemption Approved',
        message: `A supporter has approved your redemption. Progress: ${newProgress}%.`,
        createdAt: now,
      },
    });

    wsManager.sendToUser(request.user_id, {
      type: 'survival_update',
      payload: {
        userId: request.user_id,
        redemptionProgress: newProgress,
      } as any,
    });

    return { success: true };
  }

  static async enterPurgatory(userId: string): Promise<void> {
    const supabaseClient = requireSupabase();
    const now = new Date().toISOString();

    await supabaseClient
      .from('user_survival_state')
      .update({
        purgatory_status: true,
        purgatory_entered_at: now,
        visibility_score: 0,
        collapse_risk: 100,
        purge_pressure: 100,
      })
      .eq('user_id', userId);

    await SurvivalEngine.recordEvent(userId, 'GHOST_ENTERED', 0, {
      action: 'purgatory_entry',
      enteredAt: now,
    });

    wsManager.sendToUser(userId, {
      type: 'survival_update',
      payload: {
        userId,
        purgatoryStatus: true,
        purgatoryEnteredAt: now,
        survivalState: 'GHOSTED',
      } as any,
    });

    wsManager.sendToUser(userId, {
      type: 'notification',
      payload: {
        id: `purgatory-entry-${Date.now()}`,
        type: 'survival_alert',
        fromUser: { id: '', name: '', username: '' },
        title: 'You have fallen beyond visibility.',
        message: 'You now exist in purgatory. The living continue without you.',
        createdAt: now,
      },
    });
  }

  static async exitPurgatory(userId: string, redeemedBy?: string): Promise<void> {
    const supabaseClient = requireSupabase();
    const now = new Date().toISOString();

    await supabaseClient
      .from('profiles')
      .update({
        is_ghost: false,
        ghosted_at: null,
      })
      .eq('id', userId);

    await supabaseClient
      .from('user_survival_state')
      .update({
        purgatory_status: false,
        purgatory_entered_at: null,
        redemption_progress: 0,
        redemption_requested: false,
        redemption_request_at: null,
        ghost_status: false,
        purge_count: 0,
        visibility_score: 100,
        collapse_risk: 0,
        purge_pressure: 0,
      })
      .eq('user_id', userId);

    await SurvivalEngine.recordEvent(userId, 'GHOST_EXITED', 0, {
      action: 'purgatory_exit',
      redeemedBy: redeemedBy || 'self',
    });

    const survivalState = await SurvivalEngine.recalculate(userId);

    wsManager.sendToUser(userId, {
      type: 'survival_update',
      payload: {
        userId,
        purgatoryStatus: false,
        survivalState: 'SAFE',
        ghostStatus: false,
        purgeCount: 0,
        visibilityScore: 100,
        collapseRisk: 0,
        purgePressure: 0,
        redemptionProgress: 0,
      } as any,
    });

    wsManager.sendToUser(userId, {
      type: 'notification',
      payload: {
        id: `purgatory-exit-${Date.now()}`,
        type: 'survival_alert',
        fromUser: { id: '', name: '', username: '' },
        title: 'You have been redeemed.',
        message: 'Your presence has been restored. The living world welcomes you back.',
        createdAt: now,
      },
    });
  }

  static async getHistory(userId: string): Promise<any[]> {
    const supabaseClient = requireSupabase();
    const { data: events } = await supabaseClient
      .from('survival_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['GHOST_ENTERED', 'GHOST_EXITED', 'PURGE_RECEIVED'])
      .order('created_at', { ascending: false })
      .limit(50);

    return events || [];
  }
}
