import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import { websocketService } from '../services/websocketService';

interface GhostModeStatus {
  isGhost: boolean;
  purgeCount: number;
  ghostedAt: string | null;
  loading: boolean;
}

export const useGhostMode = () => {
  const { user } = useUser();
  const [ghostStatus, setGhostStatus] = useState<GhostModeStatus>({
    isGhost: false,
    purgeCount: 0,
    ghostedAt: null,
    loading: true
  });

  useEffect(() => {
    const checkGhostMode = async () => {
      if (!user) {
        setGhostStatus({
          isGhost: false,
          purgeCount: 0,
          ghostedAt: null,
          loading: false
        });
        return;
      }

      try {
        const response = await api.get(`redeem/status/${user.id}`);
        setGhostStatus({
          isGhost: response.data.isGhost,
          purgeCount: response.data.purgeCount,
          ghostedAt: response.data.ghostedAt,
          loading: false
        });
      } catch (error) {
        console.error('Error checking ghost mode:', error);
        setGhostStatus({
          isGhost: false,
          purgeCount: 0,
          ghostedAt: null,
          loading: false
        });
      }
    };

    checkGhostMode();

    // Add WebSocket listener for instant ghost status updates
    const unsubscribe = websocketService.on('profile_update', (payload) => {
      if (user && payload.userId === user.id) {
        console.log('Real-time ghost status update:', payload);
        setGhostStatus(prev => ({
          ...prev,
          isGhost: payload.isGhost,
          purgeCount: payload.purgeCount ?? prev.purgeCount,
          ghostedAt: payload.isGhost ? (prev.ghostedAt || new Date().toISOString()) : null
        }));
      }
    });

    // Check every 30 seconds
    const interval = setInterval(checkGhostMode, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user]);

  return ghostStatus;
};
