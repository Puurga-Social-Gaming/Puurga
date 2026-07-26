import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useSurvival } from '../context/SurvivalContext';
import api from '../lib/axios';
import { websocketService } from '../services/websocketService';

interface GhostModeStatus {
  isGhost: boolean;
  purgeCount: number;
  ghostedAt: string | null;
  loading: boolean;
}

/**
 * Ghost / purgatory status for the current user.
 * Prefers SurvivalContext (already loaded) to avoid noisy /redeem/status calls.
 */
export const useGhostMode = () => {
  const { user } = useUser();
  const { survivalState, loading: survivalLoading } = useSurvival();
  const [remote, setRemote] = useState<{
    isGhost: boolean;
    purgeCount: number;
    ghostedAt: string | null;
  } | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const hasSurvival = Boolean(survivalState);
  const survivalIsGhost = survivalState?.purgatory_status === true;
  const survivalPurgeCount = survivalState?.purge_count ?? 0;
  const survivalGhostedAt = survivalState?.purgatory_entered_at ?? null;

  useEffect(() => {
    const userId = user?.id;
    // Only hit redeem/status when survival state is unavailable
    if (!userId || hasSurvival) {
      setRemote(null);
      setRemoteLoading(false);
      return;
    }

    let cancelled = false;

    const checkGhostMode = async () => {
      setRemoteLoading(true);
      try {
        const response = await api.get(`redeem/status/${userId}`);
        if (cancelled) return;
        setRemote({
          isGhost: Boolean(response.data?.isGhost),
          purgeCount: Number(response.data?.purgeCount) || 0,
          ghostedAt: response.data?.ghostedAt || null,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Ghost status fallback unavailable:', error);
        }
        if (!cancelled) {
          setRemote({ isGhost: false, purgeCount: 0, ghostedAt: null });
        }
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    };

    void checkGhostMode();

    const unsubscribe = websocketService.on('profile_update', (payload) => {
      if (userId && payload.userId === userId) {
        setRemote((prev) => ({
          isGhost: Boolean(payload.isGhost),
          purgeCount: payload.purgeCount ?? prev?.purgeCount ?? 0,
          ghostedAt: payload.isGhost
            ? prev?.ghostedAt || new Date().toISOString()
            : null,
        }));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id, hasSurvival]);

  // Also listen for profile_update when using survival as source
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !hasSurvival) return;

    return websocketService.on('profile_update', (payload) => {
      if (payload.userId === userId) {
        setRemote({
          isGhost: Boolean(payload.isGhost),
          purgeCount: payload.purgeCount ?? survivalPurgeCount,
          ghostedAt: payload.isGhost
            ? survivalGhostedAt || new Date().toISOString()
            : null,
        });
      }
    });
  }, [user?.id, hasSurvival, survivalPurgeCount, survivalGhostedAt]);

  const resolved = hasSurvival
    ? {
        isGhost: remote?.isGhost ?? survivalIsGhost,
        purgeCount: remote?.purgeCount ?? survivalPurgeCount,
        ghostedAt: remote?.ghostedAt ?? survivalGhostedAt,
      }
    : remote || { isGhost: false, purgeCount: 0, ghostedAt: null };

  const status: GhostModeStatus = {
    ...resolved,
    loading: Boolean(user?.id) && (survivalLoading || (!hasSurvival && remoteLoading)),
  };

  return status;
};
