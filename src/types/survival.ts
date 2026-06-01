export type SurvivalState = 'SAFE' | 'WARNING' | 'HUNTED' | 'COLLAPSING' | 'GHOSTED';

export type SocialRank = 'UNKNOWN' | 'SURVIVOR' | 'CONTENDER' | 'WARRIOR' | 'ELITE' | 'LEGEND' | 'IMMORTAL';

export type ThreatTier = 'LOW' | 'RISING' | 'DANGEROUS' | 'HUNTED' | 'LEGENDARY_THREAT';

export type SurvivalEventType =
  | 'POST_CREATED'
  | 'POST_PURGED'
  | 'PURGE_RECEIVED'
  | 'PURGE_SURVIVED'
  | 'REPUTATION_GAIN'
  | 'REPUTATION_LOSS'
  | 'INACTIVITY_WARNING'
  | 'STATE_CHANGED'
  | 'GHOST_ENTERED'
  | 'GHOST_EXITED'
  | 'VISIBILITY_CHANGED'
  | 'PURGE_PRESSURE_CHANGED'
  | 'TIER_CHANGED'
  | 'COLLAPSE_WARNING'
  | 'PURGATORY_ENTERED'
  | 'PURGATORY_EXITED'
  | 'REDEMPTION_PROGRESS_UPDATED'
  | 'REDEMPTION_REQUESTED'
  | 'PURGATORY_STATUS_CHANGED'
  | 'ALLIANCE_REQUESTED'
  | 'ALLIANCE_ACCEPTED'
  | 'ALLIANCE_BROKEN'
  | 'LOYALTY_CHANGED'
  | 'ALLY_COLLAPSING'
  | 'ALLY_GHOSTED'
  | 'REDEMPTION_SUPPORT_RECEIVED';

export interface UserSurvivalState {
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
  social_rank: SocialRank;
  current_survival_state: SurvivalState;
  last_active_at: string | null;
  last_state_change_at: string | null;
  created_at: string;
  updated_at: string;
  visibility_score: number;
  purge_pressure: number;
  collapse_risk: number;
  last_purge_at: string | null;
  purgatory_status: boolean;
  purgatory_entered_at: string | null;
  redemption_progress: number;
  redemption_requested: boolean;
  redemption_request_at: string | null;
  alliance_count: number;
}

export interface Alliance {
  id: string;
  partnerId: string;
  username: string;
  name: string;
  avatar: string | null;
  allianceStatus: 'PENDING' | 'ACTIVE' | 'BROKEN' | 'BETRAYED';
  loyaltyScore: number;
  lastInteractionAt: string | null;
  partnerState: string;
  partnerGhosted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PendingAllianceRequest {
  id: string;
  requesterId: string;
  username: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

export interface AllianceSupportAction {
  id: string;
  supporterId: string;
  supporterName: string;
  supportType: 'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE';
  supportValue: number;
  createdAt: string;
}

export interface PurgatoryStatus {
  purgatory_status: boolean;
  purgatory_entered_at: string | null;
  redemption_progress: number;
  redemption_requested: boolean;
  redemption_request_at: string | null;
  purge_count: number;
  survival_state: string;
  reputation_score: number;
  progressBreakdown?: RedemptionProgressBreakdown;
}

export interface RedemptionProgressBreakdown {
  timeSurvived: number;
  dailyLogin: number;
  profileCompletion: number;
  emailVerified: number;
  spectating: number;
  total: number;
}

export interface RedemptionRequest {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  status: string;
  progressAtRequest: number;
  redemptionProgress: number;
  purgeCount: number;
  daysInPurgatory: number;
  survivalState: string;
  createdAt: string;
}

export interface SurvivalPublicState {
  reputation_score: number;
  survival_score: number;
  threat_level: number;
  purge_count: number;
  survived_purges: number;
  social_rank: SocialRank;
  current_survival_state: SurvivalState;
  ghost_status: boolean;
  purgatory_status?: boolean;
  redemption_progress?: number;
  alliance_count?: number;
}

export interface SurvivalEvent {
  id: string;
  user_id: string;
  event_type: SurvivalEventType;
  event_value: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SurvivalHistoryEntry {
  id: string;
  user_id: string;
  reputation_score: number;
  survival_score: number;
  threat_level: number;
  purge_count: number;
  survival_state: SurvivalState;
  recorded_at: string;
}

export const SURVIVAL_STATE_COLORS: Record<SurvivalState, string> = {
  SAFE: 'text-green-400 border-green-500/30 bg-green-500/10',
  WARNING: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  HUNTED: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  COLLAPSING: 'text-red-500 border-red-500/30 bg-red-500/10',
  GHOSTED: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
};

export const SURVIVAL_STATE_BG: Record<SurvivalState, string> = {
  SAFE: 'bg-green-500',
  WARNING: 'bg-amber-500',
  HUNTED: 'bg-orange-500',
  COLLAPSING: 'bg-red-500',
  GHOSTED: 'bg-gray-400',
};

export const SURVIVAL_STATE_LABELS: Record<SurvivalState, string> = {
  SAFE: 'Safe',
  WARNING: 'Warning',
  HUNTED: 'Hunted',
  COLLAPSING: 'Collapsing',
  GHOSTED: 'Ghosted',
};

export const THREAT_COLORS: Record<string, string> = {
  LOW: 'text-green-400',
  RISING: 'text-yellow-400',
  DANGEROUS: 'text-orange-400',
  HUNTED: 'text-red-400',
  LEGENDARY_THREAT: 'text-purple-400',
};

export type PurgeTier = 'STABLE' | 'WATCHED' | 'HUNTED' | 'COLLAPSING' | 'GHOSTED';

export const PURGE_TIER_CONFIG: Record<PurgeTier, { min: number; max: number; visibilityDrop: number; label: string; color: string; barColor: string }> = {
  STABLE: { min: 0, max: 4, visibilityDrop: 0, label: 'Stable', color: 'text-green-400 border-green-500/30 bg-green-500/10', barColor: 'bg-green-500' },
  WATCHED: { min: 5, max: 9, visibilityDrop: 10, label: 'Watched', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', barColor: 'bg-amber-500' },
  HUNTED: { min: 10, max: 14, visibilityDrop: 25, label: 'Hunted', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', barColor: 'bg-orange-500' },
  COLLAPSING: { min: 15, max: 19, visibilityDrop: 50, label: 'Collapsing', color: 'text-red-500 border-red-500/30 bg-red-500/10', barColor: 'bg-red-500' },
  GHOSTED: { min: 20, max: Infinity, visibilityDrop: 80, label: 'Ghosted', color: 'text-gray-400 border-gray-500/30 bg-gray-500/10', barColor: 'bg-gray-400' },
};

export function getPurgeTier(purgeCount: number): PurgeTier {
  if (purgeCount >= 20) return 'GHOSTED';
  if (purgeCount >= 15) return 'COLLAPSING';
  if (purgeCount >= 10) return 'HUNTED';
  if (purgeCount >= 5) return 'WATCHED';
  return 'STABLE';
}

export function getNextTierThreshold(purgeCount: number): number {
  if (purgeCount < 5) return 5;
  if (purgeCount < 10) return 10;
  if (purgeCount < 15) return 15;
  if (purgeCount < 20) return 20;
  return 20;
}
