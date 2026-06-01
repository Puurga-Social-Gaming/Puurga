import { useEffect, useRef, useCallback } from 'react';
import { websocketService } from '../services/websocketService';

interface UseWebSocketOptions {
  onNotification?: (notification: any) => void;
  onMessage?: (message: any) => void;
  onTyping?: (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onUserStatusChange?: (status: { userId: string; isOnline: boolean }) => void;
  onCreditUpdate?: (payload: { userId: string; credits: number; change?: number; source?: string }) => void;
  onProfileUpdate?: (payload: { userId: string; isGhost: boolean; purgeCount?: number }) => void;
  onSurvivalUpdate?: (payload: { userId: string; survivalState: string; reputationScore: number; threatLevel: number; socialRank: string; inactivityLevel: number; ghostStatus: boolean; warningLevel?: number; visibilityScore?: number; purgePressure?: number; collapseRisk?: number; purgeCount?: number; purgatoryStatus?: boolean; purgatoryEnteredAt?: string; redemptionProgress?: number; redemptionRequested?: boolean }) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current = [];
  }, []);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Set up event listeners
    if (options.onNotification) {
      const unsubscribe = websocketService.on('notification', options.onNotification);
      unsubscribers.push(unsubscribe);
    }

    if (options.onMessage) {
      const unsubscribe = websocketService.on('new_message', options.onMessage);
      unsubscribers.push(unsubscribe);
    }

    if (options.onTyping) {
      const unsubscribe = websocketService.on('typing', options.onTyping);
      unsubscribers.push(unsubscribe);
    }

    if (options.onUserStatusChange) {
      const unsubscribe = websocketService.on('user_status_change', options.onUserStatusChange);
      unsubscribers.push(unsubscribe);
    }

    if (options.onCreditUpdate) {
      const unsubscribe = websocketService.on('credit_update', options.onCreditUpdate);
      unsubscribers.push(unsubscribe);
    }

    if (options.onProfileUpdate) {
      const unsubscribe = websocketService.on('profile_update', options.onProfileUpdate);
      unsubscribers.push(unsubscribe);
    }

    if (options.onSurvivalUpdate) {
      const unsubscribe = websocketService.on('survival_update', options.onSurvivalUpdate);
      unsubscribers.push(unsubscribe);
    }

    if (options.onConnectionChange) {
      const unsubscribe = websocketService.on('connection', (data: { connected: boolean }) => {
        options.onConnectionChange!(data.connected);
      });
      unsubscribers.push(unsubscribe);
    }

    unsubscribersRef.current = unsubscribers;

    return cleanup;
  }, [options.onNotification, options.onMessage, options.onTyping, options.onUserStatusChange, options.onCreditUpdate, options.onProfileUpdate, options.onSurvivalUpdate, options.onConnectionChange, cleanup]);

  return {
    isConnected: websocketService.isConnected(),
    isUserOnline: websocketService.isUserOnline.bind(websocketService),
    getOnlineUsers: websocketService.getOnlineUsers.bind(websocketService),
    send: websocketService.send.bind(websocketService),
    disconnect: websocketService.disconnect.bind(websocketService)
  };
};
