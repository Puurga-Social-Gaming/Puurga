import { useEffect, useRef, useCallback } from 'react';
import { websocketService } from '../services/websocketService';

interface UseWebSocketOptions {
  onNotification?: (notification: any) => void;
  onMessage?: (message: any) => void;
  onMessageEdited?: (payload: {
    conversationId: string;
    messageId: string;
    content: string;
    isEdited: boolean;
    editedAt: string;
    translatedContent?: string | null;
    translatedLanguage?: string | null;
    language?: string | null;
  }) => void;
  onMessageDeleted?: (payload: { conversationId: string; messageId: string; isDeleted: boolean; deletedAt: string; scope?: 'me' | 'everyone' }) => void;
  onMessageHidden?: (payload: { conversationId: string; messageId: string; deletedAt?: string; scope?: 'me' }) => void;
  onMessageReaction?: (payload: { conversationId: string; messageId: string; reactions: Record<string, { count: number; reacted_by_me: boolean }> }) => void;
  onMessageRead?: (payload: { conversationId: string; userId: string; readAt: string; messageIds?: string[] }) => void;
  onGroupMessage?: (payload: any) => void;
  onGroupMessageReaction?: (payload: { groupId: string; messageId: string; reactions: Record<string, { count: number; reacted_by_me: boolean }> }) => void;
  onGroupTyping?: (payload: { groupId: string; userId: string; isTyping: boolean }) => void;
  onMatchFound?: (payload: any) => void;
  onTyping?: (payload: { conversationId: string; userId: string; isTyping: boolean; text?: string }) => void;
  onDraftStarted?: (payload: { conversationId: string; userId: string; text?: string }) => void;
  onDraftUpdated?: (payload: { conversationId: string; userId: string; text?: string }) => void;
  onDraftStopped?: (payload: { conversationId: string; userId: string }) => void;
  onDraftSent?: (payload: { conversationId: string; userId: string }) => void;
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

    if (options.onMessageEdited) {
      const unsubscribe = websocketService.on('message_edited', options.onMessageEdited);
      unsubscribers.push(unsubscribe);
    }

    if (options.onMessageDeleted) {
      const unsubscribe = websocketService.on('message_deleted', options.onMessageDeleted);
      unsubscribers.push(unsubscribe);
    }

    if (options.onMessageHidden) {
      const unsubscribe = websocketService.on('message_hidden', options.onMessageHidden);
      unsubscribers.push(unsubscribe);
    }

    if (options.onMessageReaction) {
      const unsubscribe = websocketService.on('message_reaction', options.onMessageReaction);
      unsubscribers.push(unsubscribe);
    }

    if (options.onMessageRead) {
      const unsubscribe = websocketService.on('message_read', options.onMessageRead);
      unsubscribers.push(unsubscribe);
    }

    if (options.onGroupMessage) {
      const unsubscribe = websocketService.on('group_message', options.onGroupMessage);
      unsubscribers.push(unsubscribe);
    }

    if (options.onGroupMessageReaction) {
      const unsubscribe = websocketService.on('group_message_reaction', options.onGroupMessageReaction);
      unsubscribers.push(unsubscribe);
    }

    if (options.onGroupTyping) {
      const unsubscribe = websocketService.on('group_typing', options.onGroupTyping);
      unsubscribers.push(unsubscribe);
    }

    if (options.onMatchFound) {
      const unsubscribe = websocketService.on('match_found', options.onMatchFound);
      unsubscribers.push(unsubscribe);
    }

    if (options.onTyping) {
      const unsubscribe = websocketService.on('typing', options.onTyping);
      unsubscribers.push(unsubscribe);
    }

    if (options.onDraftStarted) {
      const unsubscribe = websocketService.on('draft_started', options.onDraftStarted);
      unsubscribers.push(unsubscribe);
    }

    if (options.onDraftUpdated) {
      const unsubscribe = websocketService.on('draft_updated', options.onDraftUpdated);
      unsubscribers.push(unsubscribe);
    }

    if (options.onDraftStopped) {
      const unsubscribe = websocketService.on('draft_stopped', options.onDraftStopped);
      unsubscribers.push(unsubscribe);
    }

    if (options.onDraftSent) {
      const unsubscribe = websocketService.on('draft_sent', options.onDraftSent);
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
  }, [options.onNotification, options.onMessage, options.onMessageEdited, options.onMessageDeleted, options.onMessageHidden, options.onMessageReaction, options.onMessageRead, options.onGroupMessage, options.onGroupMessageReaction, options.onGroupTyping, options.onMatchFound, options.onTyping, options.onDraftStarted, options.onDraftUpdated, options.onDraftStopped, options.onDraftSent, options.onUserStatusChange, options.onCreditUpdate, options.onProfileUpdate, options.onSurvivalUpdate, options.onConnectionChange, cleanup]);

  return {
    isConnected: websocketService.isConnected(),
    isUserOnline: websocketService.isUserOnline.bind(websocketService),
    getOnlineUsers: websocketService.getOnlineUsers.bind(websocketService),
    send: websocketService.send.bind(websocketService),
    disconnect: websocketService.disconnect.bind(websocketService)
  };
};
