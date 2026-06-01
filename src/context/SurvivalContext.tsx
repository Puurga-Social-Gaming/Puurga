import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../lib/axios';
import type {
  UserSurvivalState,
  SurvivalPublicState,
  SurvivalEvent,
  SurvivalHistoryEntry,
  PurgatoryStatus,
  RedemptionRequest,
  Alliance,
  PendingAllianceRequest,
  AllianceSupportAction,
} from '../types/survival';

interface SurvivalContextType {
  survivalState: UserSurvivalState | null;
  publicStates: Map<string, SurvivalPublicState>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getHistory: (limit?: number) => Promise<SurvivalHistoryEntry[]>;
  getNotifications: () => Promise<SurvivalEvent[]>;
  getPublicState: (userId: string) => Promise<SurvivalPublicState | null>;
  recordActivity: (eventType: string, eventValue?: number, metadata?: Record<string, any>) => Promise<void>;
  getPurgatoryStatus: () => Promise<PurgatoryStatus | null>;
  requestRedemption: () => Promise<{ success: boolean; requestId?: string; error?: string }>;
  getRedemptionRequests: () => Promise<RedemptionRequest[]>;
  approveRedemptionRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  getPurgatoryHistory: () => Promise<any[]>;
  getAlliances: () => Promise<Alliance[]>;
  getPendingAllianceRequests: () => Promise<PendingAllianceRequest[]>;
  requestAlliance: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  acceptAlliance: (allianceId: string) => Promise<{ success: boolean; error?: string }>;
  rejectAlliance: (allianceId: string) => Promise<{ success: boolean; error?: string }>;
  breakAlliance: (allianceId: string) => Promise<{ success: boolean; error?: string }>;
  supportGhostedAlly: (allianceId: string, supportType: 'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE') => Promise<{ success: boolean; error?: string }>;
  getSupportHistory: (allianceId: string) => Promise<AllianceSupportAction[]>;
}

const SurvivalContext = createContext<SurvivalContextType>({
  survivalState: null,
  publicStates: new Map(),
  loading: true,
  error: null,
  refresh: async () => {},
  getHistory: async () => [],
  getNotifications: async () => [],
  getPublicState: async () => null,
  recordActivity: async () => {},
  getPurgatoryStatus: async () => null,
  requestRedemption: async () => ({ success: false, error: 'Not initialized' }),
  getRedemptionRequests: async () => [],
  approveRedemptionRequest: async () => ({ success: false, error: 'Not initialized' }),
  getPurgatoryHistory: async () => [],
  getAlliances: async () => [],
  getPendingAllianceRequests: async () => [],
  requestAlliance: async () => ({ success: false, error: 'Not initialized' }),
  acceptAlliance: async () => ({ success: false, error: 'Not initialized' }),
  rejectAlliance: async () => ({ success: false, error: 'Not initialized' }),
  breakAlliance: async () => ({ success: false, error: 'Not initialized' }),
  supportGhostedAlly: async () => ({ success: false, error: 'Not initialized' }),
  getSupportHistory: async () => [],
});

export const useSurvival = () => useContext(SurvivalContext);

interface SurvivalProviderProps {
  children: React.ReactNode;
}

export const SurvivalProvider: React.FC<SurvivalProviderProps> = ({ children }) => {
  const [survivalState, setSurvivalState] = useState<UserSurvivalState | null>(null);
  const [publicStates, setPublicStates] = useState<Map<string, SurvivalPublicState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/survival/state');
      setSurvivalState(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to fetch survival state');
      console.error('Error fetching survival state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (limit: number = 30): Promise<SurvivalHistoryEntry[]> => {
    try {
      const response = await api.get(`/survival/history?limit=${limit}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching survival history:', err);
      return [];
    }
  }, []);

  const getNotifications = useCallback(async (): Promise<SurvivalEvent[]> => {
    try {
      const response = await api.get('/survival/notifications');
      return response.data;
    } catch (err) {
      console.error('Error fetching survival notifications:', err);
      return [];
    }
  }, []);

  const getPublicState = useCallback(async (userId: string): Promise<SurvivalPublicState | null> => {
    if (publicStates.has(userId)) {
      return publicStates.get(userId) || null;
    }
    try {
      const response = await api.get(`/survival/public/${userId}`);
      const state = response.data as SurvivalPublicState;
      setPublicStates(prev => new Map(prev).set(userId, state));
      return state;
    } catch (err) {
      console.error('Error fetching public survival state:', err);
      return null;
    }
  }, [publicStates]);

  const recordActivity = useCallback(async (
    eventType: string,
    eventValue: number = 0,
    metadata?: Record<string, any>
  ) => {
    try {
      const response = await api.post('/survival/activity', { eventType, eventValue, metadata });
      if (response.data.state) {
        setSurvivalState(response.data.state);
      }
    } catch (err) {
      console.error('Error recording survival activity:', err);
    }
  }, []);

  const getPurgatoryStatus = useCallback(async (): Promise<PurgatoryStatus | null> => {
    try {
      const response = await api.get('/purgatory/status');
      return response.data;
    } catch (err) {
      console.error('Error fetching purgatory status:', err);
      return null;
    }
  }, []);

  const requestRedemption = useCallback(async (): Promise<{ success: boolean; requestId?: string; error?: string }> => {
    try {
      const response = await api.post('/purgatory/request-redemption');
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to request redemption' };
    }
  }, []);

  const getRedemptionRequests = useCallback(async (): Promise<RedemptionRequest[]> => {
    try {
      const response = await api.get('/purgatory/requests');
      return response.data;
    } catch (err) {
      console.error('Error fetching redemption requests:', err);
      return [];
    }
  }, []);

  const approveRedemptionRequest = useCallback(async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`/purgatory/approve-request/${requestId}`);
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to approve request' };
    }
  }, []);

  const getPurgatoryHistory = useCallback(async (): Promise<any[]> => {
    try {
      const response = await api.get('/purgatory/history');
      return response.data;
    } catch (err) {
      console.error('Error fetching purgatory history:', err);
      return [];
    }
  }, []);

  const getAlliances = useCallback(async (): Promise<Alliance[]> => {
    try {
      const response = await api.get('/alliances');
      return response.data;
    } catch (err) {
      console.error('Error fetching alliances:', err);
      return [];
    }
  }, []);

  const getPendingAllianceRequests = useCallback(async (): Promise<PendingAllianceRequest[]> => {
    try {
      const response = await api.get('/alliances/pending');
      return response.data;
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      return [];
    }
  }, []);

  const requestAlliance = useCallback(async (targetId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post('/alliances/request', { targetId });
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to request alliance' };
    }
  }, []);

  const acceptAlliance = useCallback(async (allianceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`/alliances/accept/${allianceId}`);
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to accept alliance' };
    }
  }, []);


  const rejectAlliance = useCallback(async (allianceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`/alliances/reject/${allianceId}`);
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to reject alliance' };
    }
  }, []);
  const breakAlliance = useCallback(async (allianceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`/alliances/break/${allianceId}`);
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to break alliance' };
    }
  }, []);

  const supportGhostedAlly = useCallback(async (allianceId: string, supportType: 'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE'): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`/alliances/support/${allianceId}`, { supportType });
      return response.data;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || 'Failed to support ally' };
    }
  }, []);

  const getSupportHistory = useCallback(async (allianceId: string): Promise<AllianceSupportAction[]> => {
    try {
      const response = await api.get(`/alliances/support-history/${allianceId}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching support history:', err);
      return [];
    }
  }, []);

  useWebSocket({
    onSurvivalUpdate: (payload) => {
      if (payload.userId && survivalState && payload.userId === survivalState.user_id) {
        setSurvivalState(prev => prev ? {
          ...prev,
          current_survival_state: (payload.survivalState as any) ?? prev.current_survival_state,
          reputation_score: payload.reputationScore ?? prev.reputation_score,
          threat_level: payload.threatLevel ?? prev.threat_level,
          social_rank: (payload.socialRank as any) ?? prev.social_rank,
          inactivity_level: payload.inactivityLevel ?? prev.inactivity_level,
          ghost_status: payload.ghostStatus ?? prev.ghost_status,
          warning_level: payload.warningLevel ?? prev.warning_level,
          visibility_score: payload.visibilityScore ?? prev.visibility_score,
          purge_pressure: payload.purgePressure ?? prev.purge_pressure,
          collapse_risk: payload.collapseRisk ?? prev.collapse_risk,
          purge_count: payload.purgeCount ?? prev.purge_count,
          purgatory_status: payload.purgatoryStatus ?? prev.purgatory_status,
          purgatory_entered_at: payload.purgatoryEnteredAt ?? prev.purgatory_entered_at,
          redemption_progress: payload.redemptionProgress ?? prev.redemption_progress,
          redemption_requested: payload.redemptionRequested ?? prev.redemption_requested,
        } : prev);
      }
    },
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SurvivalContext.Provider
      value={{
        survivalState,
        publicStates,
        loading,
        error,
        refresh,
        getHistory,
        getNotifications,
        getPublicState,
        recordActivity,
        getPurgatoryStatus,
        requestRedemption,
        getRedemptionRequests,
        approveRedemptionRequest,
        getPurgatoryHistory,
        getAlliances,
        getPendingAllianceRequests,
        requestAlliance,
        acceptAlliance,
        rejectAlliance,
        breakAlliance,
        supportGhostedAlly,
        getSupportHistory,
      }}
    >
      {children}
    </SurvivalContext.Provider>
  );
};
