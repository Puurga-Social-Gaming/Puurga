import { supabase } from '../../config/supabase';
import { wsManager } from '../../websocketManager';
import { SurvivalEngine } from '../survival/survival-engine';
import { ReputationEngine } from '../survival/reputation-engine';
import { PurgatoryEngine } from '../survival/purgatory-engine';

const MAX_ALLIANCES = 5;
const ALLIANCE_CREATE_COOLDOWN_HOURS = 24;
const ALLIANCE_BREAK_COOLDOWN_DAYS = 7;
const SUPPORT_COOLDOWN_HOURS = 24;
const MIN_REPUTATION_FOR_ALLIANCE = 50;
const MIN_LOYALTY_FOR_SUPPORT = 50;
const MIN_LOYALTY_FOR_CONSEQUENCES = 30;
const AUTO_BREAK_LOYALTY = 10;
const ABANDON_THRESHOLD_DAYS = 7;
const ABANDON_LOYALTY_PENALTY = -20;
const DAILY_LOYALTY_DECAY = -1;
const SUPPORT_LOYALTY_GAIN = 5;
const SURVIVE_TOGETHER_LOYALTY_GAIN = 2;
const INTERACTION_LOYALTY_GAIN = 1;

interface AllianceResult {
  success: boolean;
  error?: string;
  alliance?: any;
}

export class AllianceEngine {
  static async requestAlliance(requesterId: string, targetId: string): Promise<AllianceResult> {
    if (requesterId === targetId) {
      return { success: false, error: 'Cannot form alliance with yourself' };
    }

    const [reqStatus, targetStatus, existingAlliance, reqCooldown, reqAllianceCount] = await Promise.all([
      this.getSurvivalEligibility(requesterId),
      this.getSurvivalEligibility(targetId),
      this.getExistingAlliance(requesterId, targetId),
      this.getCooldown(requesterId, 'CREATE'),
      this.getActiveAllianceCount(requesterId),
    ]);

    if (!reqStatus.eligible) {
      return { success: false, error: reqStatus.error || 'You are not eligible to form alliances' };
    }

    if (!targetStatus.eligible) {
      return { success: false, error: 'Target user is not eligible for alliances' };
    }

    if (existingAlliance) {
      if (existingAlliance.alliance_status === 'PENDING') {
        if (existingAlliance.target_id === requesterId) {
          return await this.acceptAlliance(existingAlliance.id, requesterId);
        }
        return { success: false, error: 'Alliance request already pending' };
      }
      if (existingAlliance.alliance_status === 'ACTIVE') {
        return { success: false, error: 'Already in an alliance with this user' };
      }
      if (existingAlliance.alliance_status === 'BROKEN' || existingAlliance.alliance_status === 'BETRAYED') {
        return { success: false, error: 'Cannot re-establish a broken alliance' };
      }
    }

    if (reqCooldown) {
      const hoursLeft = Math.ceil((new Date(reqCooldown.expires_at).getTime() - Date.now()) / (1000 * 60 * 60));
      return { success: false, error: `Must wait ${hoursLeft}h before creating a new alliance` };
    }

    if (reqAllianceCount >= MAX_ALLIANCES) {
      return { success: false, error: `Maximum of ${MAX_ALLIANCES} active alliances reached` };
    }

    const targetAllianceCount = await this.getActiveAllianceCount(targetId);
    if (targetAllianceCount >= MAX_ALLIANCES) {
      return { success: false, error: 'Target user has reached their maximum alliances' };
    }

    const { data: alliance, error } = await supabase
      .from('user_alliances')
      .insert({
        requester_id: requesterId,
        target_id: targetId,
        alliance_status: 'PENDING',
        loyalty_score: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !alliance) {
      return { success: false, error: 'Failed to create alliance request' };
    }

    await SurvivalEngine.recordEvent(requesterId, 'REPUTATION_GAIN', 0, {
      action: 'alliance_requested',
      targetId,
      allianceId: alliance.id,
    });

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', requesterId)
      .single();

    wsManager.sendToUser(targetId, {
      type: 'notification',
      payload: {
        id: `alliance-request-${Date.now()}`,
        type: 'survival_alert',
        fromUser: {
          id: requesterId,
          name: requesterProfile?.full_name || requesterProfile?.username || 'Unknown',
          username: requesterProfile?.username || 'unknown',
          avatar: requesterProfile?.avatar_url || undefined,
        },
        title: 'An alliance has been proposed.',
        message: `${requesterProfile?.username || 'A user'} seeks to form a survival bond with you.`,
        createdAt: new Date().toISOString(),
      },
    });

    return { success: true, alliance };
  }

  static async acceptAlliance(allianceId: string, userId: string): Promise<AllianceResult> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('id', allianceId)
      .eq('alliance_status', 'PENDING')
      .single();

    if (!alliance) {
      return { success: false, error: 'Pending alliance request not found' };
    }

    if (alliance.target_id !== userId) {
      return { success: false, error: 'This alliance request is not addressed to you' };
    }

    const now = new Date().toISOString();

    await supabase
      .from('user_alliances')
      .update({
        alliance_status: 'ACTIVE',
        updated_at: now,
      })
      .eq('id', allianceId);

    await Promise.all([
      this.incrementAllianceCount(alliance.requester_id),
      this.incrementAllianceCount(alliance.target_id),
    ]);

    await SurvivalEngine.recordEvent(alliance.requester_id, 'REPUTATION_GAIN', 5, {
      action: 'alliance_accepted',
      allianceId,
      partnerId: alliance.target_id,
    });

    await SurvivalEngine.recordEvent(alliance.target_id, 'REPUTATION_GAIN', 5, {
      action: 'alliance_accepted',
      allianceId,
      partnerId: alliance.requester_id,
    });

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', userId)
      .single();

    wsManager.sendToUser(alliance.requester_id, {
      type: 'notification',
      payload: {
        id: `alliance-accepted-${Date.now()}`,
        type: 'survival_alert',
        fromUser: {
          id: userId,
          name: targetProfile?.full_name || targetProfile?.username || 'Unknown',
          username: targetProfile?.username || 'unknown',
          avatar: targetProfile?.avatar_url || undefined,
        },
        title: 'An alliance has formed.',
        message: `${targetProfile?.username || 'A user'} has accepted your alliance. You are bound.`,
        createdAt: now,
      },
    });

    wsManager.sendToUser(userId, {
      type: 'notification',
      payload: {
        id: `alliance-confirmed-${Date.now()}`,
        type: 'survival_alert',
        fromUser: { id: '', name: '', username: '' },
        title: 'An alliance has formed.',
        message: 'You have accepted the alliance. Your survival bond is active.',
        createdAt: now,
      },
    });

    return { success: true, alliance: { ...alliance, alliance_status: 'ACTIVE' } };
  }

  static async breakAlliance(allianceId: string, userId: string): Promise<AllianceResult> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('id', allianceId)
      .eq('alliance_status', 'ACTIVE')
      .single();

    if (!alliance) {
      return { success: false, error: 'Active alliance not found' };
    }

    if (alliance.requester_id !== userId && alliance.target_id !== userId) {
      return { success: false, error: 'You are not part of this alliance' };
    }

    const cooldown = await this.getCooldown(userId, 'BREAK');
    if (cooldown) {
      const daysLeft = Math.ceil((new Date(cooldown.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return { success: false, error: `Must wait ${daysLeft}d before breaking another alliance` };
    }

    const partnerId = alliance.requester_id === userId ? alliance.target_id : alliance.requester_id;
    const now = new Date().toISOString();

    await supabase
      .from('user_alliances')
      .update({
        alliance_status: 'BROKEN',
        updated_at: now,
      })
      .eq('id', allianceId);

    await Promise.all([
      this.decrementAllianceCount(alliance.requester_id),
      this.decrementAllianceCount(alliance.target_id),
    ]);

    await this.setCooldown(userId, 'BREAK', now);

    await SurvivalEngine.recordEvent(userId, 'REPUTATION_LOSS', -10, {
      action: 'alliance_broken',
      allianceId,
      partnerId,
    });

    await SurvivalEngine.recordEvent(partnerId, 'REPUTATION_LOSS', -5, {
      action: 'alliance_broken_by_partner',
      allianceId,
      brokenBy: userId,
    });

    const { data: breakerProfile } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', userId)
      .single();

    wsManager.sendToUser(partnerId, {
      type: 'notification',
      payload: {
        id: `alliance-broken-${Date.now()}`,
        type: 'survival_alert',
        fromUser: {
          id: userId,
          name: breakerProfile?.full_name || breakerProfile?.username || 'Unknown',
          username: breakerProfile?.username || 'unknown',
          avatar: breakerProfile?.avatar_url || undefined,
        },
        title: 'An alliance has broken.',
        message: `${breakerProfile?.username || 'A user'} has broken your alliance. The bond is severed.`,
        createdAt: now,
      },
    });

    return { success: true };
  }

  static async rejectAlliance(allianceId: string, userId: string): Promise<AllianceResult> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('id', allianceId)
      .eq('alliance_status', 'PENDING')
      .single();

    if (!alliance) {
      return { success: false, error: 'Pending alliance request not found' };
    }

    if (alliance.target_id !== userId) {
      return { success: false, error: 'This alliance request is not addressed to you' };
    }

    const now = new Date().toISOString();

    await supabase
      .from('user_alliances')
      .update({
        alliance_status: 'BROKEN',
        updated_at: now,
      })
      .eq('id', allianceId);

    await SurvivalEngine.recordEvent(alliance.requester_id, 'REPUTATION_LOSS', -2, {
      action: 'alliance_rejected',
      allianceId,
      rejectedBy: userId,
    });

    const { data: rejecterProfile } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', userId)
      .single();

    wsManager.sendToUser(alliance.requester_id, {
      type: 'notification',
      payload: {
        id: `alliance-rejected-${Date.now()}`,
        type: 'survival_alert',
        fromUser: {
          id: userId,
          name: rejecterProfile?.full_name || rejecterProfile?.username || 'Unknown',
          username: rejecterProfile?.username || 'unknown',
          avatar: rejecterProfile?.avatar_url || undefined,
        },
        title: 'An alliance was rejected.',
        message: `${rejecterProfile?.username || 'A user'} has rejected your alliance proposal.`,
        createdAt: now,
      },
    });

    return { success: true };
  }

  static async getAlliances(userId: string): Promise<any[]> {
    const { data: alliances } = await supabase
      .from('user_alliances')
      .select('*')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!alliances) return [];

    const partnerIds = alliances.map(a =>
      a.requester_id === userId ? a.target_id : a.requester_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', partnerIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const { data: survivalStates } = await supabase
      .from('user_survival_state')
      .select('user_id, current_survival_state, purgatory_status, ghost_status')
      .in('user_id', partnerIds);

    const stateMap = new Map((survivalStates || []).map(s => [s.user_id, s]));

    return alliances.map(a => {
      const partnerId = a.requester_id === userId ? a.target_id : a.requester_id;
      const profile = profileMap.get(partnerId);
      const state = stateMap.get(partnerId);
      return {
        id: a.id,
        partnerId,
        username: profile?.username || 'Unknown',
        name: profile?.full_name || profile?.username || 'Unknown',
        avatar: profile?.avatar_url || null,
        allianceStatus: a.alliance_status,
        loyaltyScore: a.loyalty_score,
        lastInteractionAt: a.last_interaction_at,
        partnerState: state?.current_survival_state || 'SAFE',
        partnerGhosted: state?.purgatory_status || state?.ghost_status || false,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      };
    });
  }

  static async getPendingRequests(userId: string): Promise<any[]> {
    const { data: requests } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('target_id', userId)
      .eq('alliance_status', 'PENDING')
      .order('created_at', { ascending: false });

    if (!requests) return [];

    const requesterIds = requests.map(r => r.requester_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', requesterIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return requests.map(r => {
      const profile = profileMap.get(r.requester_id);
      return {
        id: r.id,
        requesterId: r.requester_id,
        username: profile?.username || 'Unknown',
        name: profile?.full_name || profile?.username || 'Unknown',
        avatar: profile?.avatar_url || null,
        createdAt: r.created_at,
      };
    });
  }

  static async supportGhostedAlly(
    allianceId: string,
    supporterId: string,
    supportType: 'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE'
  ): Promise<AllianceResult> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('id', allianceId)
      .eq('alliance_status', 'ACTIVE')
      .single();

    if (!alliance) {
      return { success: false, error: 'Active alliance not found' };
    }

    const ghostedUserId = alliance.requester_id === supporterId
      ? alliance.target_id
      : alliance.requester_id;

    if (alliance.loyalty_score < MIN_LOYALTY_FOR_SUPPORT) {
      return { success: false, error: `Loyalty too low (${alliance.loyalty_score}). Minimum ${MIN_LOYALTY_FOR_SUPPORT} required for support.` };
    }

    const cooldown = await this.getCooldown(supporterId, 'SUPPORT');
    if (cooldown) {
      const hoursLeft = Math.ceil((new Date(cooldown.expires_at).getTime() - Date.now()) / (1000 * 60 * 60));
      return { success: false, error: `Must wait ${hoursLeft}h before providing support again` };
    }

    const { data: ghostState } = await supabase
      .from('user_survival_state')
      .select('purgatory_status, ghost_status')
      .eq('user_id', ghostedUserId)
      .single();

    if (!ghostState?.purgatory_status && !ghostState?.ghost_status) {
      return { success: false, error: 'Your ally is not in purgatory or ghosted status' };
    }

    const recentSupportCount = await this.getRecentSupportCount(ghostedUserId);
    if (recentSupportCount >= 3) {
      return { success: false, error: 'This user already has the maximum 3 active supporters' };
    }

    let supportValue = 0;
    let supporterPenalty = 0;

    switch (supportType) {
      case 'ENDORSEMENT':
        supportValue = 10;
        break;
      case 'REPUTATION_SACRIFICE': {
        const { data: supporterState } = await supabase
          .from('user_survival_state')
          .select('reputation_score')
          .eq('user_id', supporterId)
          .single();
        const repScore = supporterState?.reputation_score || 0;
        supporterPenalty = Math.min(20, Math.floor(repScore * 0.2));
        supportValue = 5;
        await ReputationEngine.applyReputationChange(supporterId, 'PURGE_RECEIVED', {
          source: 'alliance_support_sacrifice',
          sacrifice: supporterPenalty,
        });
        break;
      }
      case 'VISIBILITY_SACRIFICE': {
        const { data: supporterState } = await supabase
          .from('user_survival_state')
          .select('visibility_score')
          .eq('user_id', supporterId)
          .single();
        const visScore = supporterState?.visibility_score || 100;
        supporterPenalty = Math.min(10, Math.floor(visScore * 0.15));
        supportValue = 3;
        await supabase
          .from('user_survival_state')
          .update({ visibility_score: Math.max(0, visScore - supporterPenalty) })
          .eq('user_id', supporterId);
        break;
      }
    }

    const now = new Date().toISOString();

    await supabase.from('alliance_support_actions').insert({
      alliance_id: allianceId,
      supporter_id: supporterId,
      support_type: supportType,
      support_value: supportValue,
      created_at: now,
    });

    await this.setCooldown(supporterId, 'SUPPORT', now);

    await this.updateLoyalty(alliance.id, SUPPORT_LOYALTY_GAIN);

    const redemptionResult = await PurgatoryEngine.calculateRedemptionProgress(ghostedUserId);
    const newProgress = Math.min(100, (redemptionResult.total || 0) + supportValue);

    await supabase
      .from('user_survival_state')
      .update({ redemption_progress: newProgress })
      .eq('user_id', ghostedUserId);

    await PurgatoryEngine.calculateRedemptionProgress(ghostedUserId);

    await SurvivalEngine.recordEvent(ghostedUserId, 'REPUTATION_GAIN', supportValue, {
      action: 'alliance_support_received',
      supportType,
      supporterId,
      supportValue,
    });

    await SurvivalEngine.recordEvent(supporterId, 'REPUTATION_GAIN', 0, {
      action: 'alliance_support_given',
      supportType,
      targetId: ghostedUserId,
      supportValue,
      penalty: supporterPenalty,
    });

    const { data: supporterProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', supporterId)
      .single();

    wsManager.sendToUser(ghostedUserId, {
      type: 'notification',
      payload: {
        id: `support-received-${Date.now()}`,
        type: 'survival_alert',
        fromUser: {
          id: supporterId,
          name: supporterProfile?.full_name || supporterProfile?.username || 'Unknown',
          username: supporterProfile?.username || 'unknown',
        },
        title: 'Your ally has supported you.',
        message: `${supporterProfile?.username || 'An ally'} has supported your redemption (+${supportValue}%).`,
        createdAt: now,
      },
    });

    wsManager.sendToUser(supporterId, {
      type: 'notification',
      payload: {
        id: `support-given-${Date.now()}`,
        type: 'survival_alert',
        fromUser: { id: '', name: '', username: '' },
        title: 'You have supported your ally.',
        message: supportType === 'ENDORSEMENT'
          ? 'Your endorsement has strengthened their redemption.'
          : `Your sacrifice has aided their redemption (${supporterPenalty} penalty).`,
        createdAt: now,
      },
    });

    return { success: true, alliance: { supportValue, supporterPenalty, newProgress } };
  }

  static async getSupportHistory(allianceId: string): Promise<any[]> {
    const { data: actions } = await supabase
      .from('alliance_support_actions')
      .select('*')
      .eq('alliance_id', allianceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!actions) return [];

    const supporterIds = Array.from(new Set(actions.map(a => a.supporter_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', supporterIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return actions.map(a => ({
      id: a.id,
      supporterId: a.supporter_id,
      supporterName: profileMap.get(a.supporter_id)?.full_name || profileMap.get(a.supporter_id)?.username || 'Unknown',
      supportType: a.support_type,
      supportValue: a.support_value,
      createdAt: a.created_at,
    }));
  }

  static async updateLoyaltyOnInteraction(userId: string, targetUserId: string): Promise<void> {
    const alliance = await this.getActiveAlliance(userId, targetUserId);
    if (!alliance) return;
    await this.updateLoyalty(alliance.id, INTERACTION_LOYALTY_GAIN);
  }

  static async processDailyLoyaltyDecay(): Promise<void> {
    const { data: alliances } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('alliance_status', 'ACTIVE');

    if (!alliances) return;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - ABANDON_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    for (const alliance of alliances) {
      const lastInteraction = alliance.last_interaction_at ? new Date(alliance.last_interaction_at) : null;

      if (!lastInteraction || lastInteraction < sevenDaysAgo) {
        await supabase
          .from('user_alliances')
          .update({
            loyalty_score: Math.max(0, alliance.loyalty_score + ABANDON_LOYALTY_PENALTY),
            updated_at: now.toISOString(),
          })
          .eq('id', alliance.id);

        for (const uid of [alliance.requester_id, alliance.target_id]) {
          wsManager.sendToUser(uid, {
            type: 'notification',
            payload: {
              id: `loyalty-drop-${Date.now()}`,
              type: 'survival_alert',
              fromUser: { id: '', name: '', username: '' },
              title: 'Your loyalty is weakening.',
              message: 'Your alliance bond weakens from neglect. Interact to maintain it.',
              createdAt: now.toISOString(),
            },
          });
        }

        if (alliance.loyalty_score + ABANDON_LOYALTY_PENALTY <= AUTO_BREAK_LOYALTY) {
          await this.autoBreakAlliance(alliance.id, alliance.requester_id, alliance.target_id);
        }
      } else {
        const newLoyalty = Math.max(0, alliance.loyalty_score + DAILY_LOYALTY_DECAY);
        await supabase
          .from('user_alliances')
          .update({
            loyalty_score: newLoyalty,
            updated_at: now.toISOString(),
          })
          .eq('id', alliance.id);

        if (newLoyalty < MIN_LOYALTY_FOR_SUPPORT) {
          for (const uid of [alliance.requester_id, alliance.target_id]) {
            wsManager.sendToUser(uid, {
              type: 'notification',
              payload: {
                id: `loyalty-warning-${Date.now()}`,
                type: 'survival_alert',
                fromUser: { id: '', name: '', username: '' },
                title: 'Your loyalty is weakening.',
                message: `Loyalty has dropped below ${MIN_LOYALTY_FOR_SUPPORT}. Support actions are disabled.`,
                createdAt: now.toISOString(),
              },
            });
          }
        }

        if (newLoyalty <= AUTO_BREAK_LOYALTY) {
          await this.autoBreakAlliance(alliance.id, alliance.requester_id, alliance.target_id);
        }
      }
    }
  }

  static async getAllianceCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('user_alliances')
      .select('*', { count: 'exact', head: true })
      .eq('alliance_status', 'ACTIVE')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`);

    return count || 0;
  }

  static async getReputationDecayModifier(userId: string): Promise<number> {
    const count = await this.getAllianceCount(userId);
    if (count >= 3) return 0.5;
    if (count >= 1) return 0.75;
    return 1.0;
  }

  static async getPurgeResistanceModifier(userId: string): Promise<number> {
    const count = await this.getAllianceCount(userId);
    if (count >= 3) return 0.5;
    if (count >= 1) return 0.75;
    return 1.0;
  }

  static async getStateThresholdModifier(userId: string): Promise<number> {
    const alliances = await this.getAlliancesWithHighLoyalty(userId);
    if (alliances >= 3) return 1.2;
    if (alliances >= 1) return 1.1;
    return 1.0;
  }

  private static async getAlliancesWithHighLoyalty(userId: string): Promise<number> {
    const { data: alliances } = await supabase
      .from('user_alliances')
      .select('loyalty_score')
      .eq('alliance_status', 'ACTIVE')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .gte('loyalty_score', 70);

    return alliances?.length || 0;
  }

  private static async getSurvivalEligibility(userId: string): Promise<{ eligible: boolean; error?: string }> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('reputation_score, ghost_status, purgatory_status')
      .eq('user_id', userId)
      .single();

    if (!state) return { eligible: false, error: 'User state not found' };
    if (state.reputation_score < MIN_REPUTATION_FOR_ALLIANCE) {
      return { eligible: false, error: `Minimum reputation of ${MIN_REPUTATION_FOR_ALLIANCE} required` };
    }
    if (state.ghost_status || state.purgatory_status) {
      return { eligible: false, error: 'Ghosted users cannot form alliances' };
    }

    return { eligible: true };
  }

  private static async getExistingAlliance(userId1: string, userId2: string): Promise<any> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('*')
      .or(`and(requester_id.eq.${userId1},target_id.eq.${userId2}),and(requester_id.eq.${userId2},target_id.eq.${userId1})`)
      .single();

    return alliance;
  }

  private static async getActiveAlliance(userId: string, partnerId: string): Promise<any> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('*')
      .eq('alliance_status', 'ACTIVE')
      .or(`and(requester_id.eq.${userId},target_id.eq.${partnerId}),and(requester_id.eq.${partnerId},target_id.eq.${userId})`)
      .single();

    return alliance;
  }

  private static async getActiveAllianceCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('user_alliances')
      .select('*', { count: 'exact', head: true })
      .eq('alliance_status', 'ACTIVE')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`);

    return count || 0;
  }

  private static async getCooldown(userId: string, type: string): Promise<any> {
    const { data: cooldown } = await supabase
      .from('alliance_cooldowns')
      .select('*')
      .eq('user_id', userId)
      .eq('cooldown_type', type)
      .gte('expires_at', new Date().toISOString())
      .single();

    return cooldown;
  }

  private static async setCooldown(userId: string, type: string, now: string): Promise<void> {
    const durationMs = type === 'BREAK'
      ? ALLIANCE_BREAK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      : type === 'SUPPORT'
        ? SUPPORT_COOLDOWN_HOURS * 60 * 60 * 1000
        : ALLIANCE_CREATE_COOLDOWN_HOURS * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    await supabase.from('alliance_cooldowns').insert({
      user_id: userId,
      cooldown_type: type,
      expires_at: expiresAt,
      created_at: now,
    });
  }

  private static async updateLoyalty(allianceId: string, change: number): Promise<void> {
    const { data: alliance } = await supabase
      .from('user_alliances')
      .select('loyalty_score')
      .eq('id', allianceId)
      .single();

    if (!alliance) return;

    const newScore = Math.max(0, Math.min(100, alliance.loyalty_score + change));
    const now = new Date().toISOString();

    await supabase
      .from('user_alliances')
      .update({
        loyalty_score: newScore,
        last_interaction_at: now,
        updated_at: now,
      })
      .eq('id', allianceId);

    wsManager.sendToUser(allianceId, {
      type: 'survival_update',
      payload: {
        userId: allianceId,
        loyaltyScore: newScore,
      } as any,
    });
  }

  private static async incrementAllianceCount(userId: string): Promise<void> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('alliance_count')
      .eq('user_id', userId)
      .single();

    const current = state?.alliance_count || 0;
    await supabase
      .from('user_survival_state')
      .update({ alliance_count: current + 1 })
      .eq('user_id', userId);
  }

  private static async decrementAllianceCount(userId: string): Promise<void> {
    const { data: state } = await supabase
      .from('user_survival_state')
      .select('alliance_count')
      .eq('user_id', userId)
      .single();

    const current = state?.alliance_count || 0;
    await supabase
      .from('user_survival_state')
      .update({ alliance_count: Math.max(0, current - 1) })
      .eq('user_id', userId);
  }

  private static async getRecentSupportCount(userId: string): Promise<number> {
    const { data: alliances } = await supabase
      .from('user_alliances')
      .select('id')
      .eq('alliance_status', 'ACTIVE')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`);

    if (!alliances || alliances.length === 0) return 0;

    const allianceIds = alliances.map(a => a.id);
    const twentyFourHoursAgo = new Date(Date.now() - SUPPORT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

    const { data: recentActions } = await supabase
      .from('alliance_support_actions')
      .select('supporter_id', { count: 'exact', head: true })
      .in('alliance_id', allianceIds)
      .gte('created_at', twentyFourHoursAgo);

    const supporterIds = new Set((recentActions || []).map(a => a.supporter_id));
    return supporterIds.size;
  }

  private static async autoBreakAlliance(allianceId: string, userId1: string, userId2: string): Promise<void> {
    await supabase
      .from('user_alliances')
      .update({
        alliance_status: 'BROKEN',
        updated_at: new Date().toISOString(),
      })
      .eq('id', allianceId);

    await Promise.all([
      this.decrementAllianceCount(userId1),
      this.decrementAllianceCount(userId2),
    ]);

    for (const uid of [userId1, userId2]) {
      wsManager.sendToUser(uid, {
        type: 'notification',
        payload: {
          id: `alliance-auto-broken-${Date.now()}`,
          type: 'survival_alert',
          fromUser: { id: '', name: '', username: '' },
          title: 'An alliance has broken.',
          message: 'Your alliance has dissolved due to neglect and weakening loyalty.',
          createdAt: new Date().toISOString(),
        },
      });
    }
  }
}
