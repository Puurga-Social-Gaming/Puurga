type NotificationType =
  | 'like' | 'dislike' | 'comment' | 'reply' | 'mention'
  | 'follow' | 'follow_accepted' | 'share' | 'profile_visit'
  | 'message' | 'group_message' | 'message_reaction' | 'missed_call'
  | 'resume_game' | 'reward_reminder' | 'tournament_reminder' | 'challenge'
  | 'welcome' | 'verification' | 'security_alert' | 'maintenance'
  | 'friend_request' | 'friend_request_accepted'
  | 'redemption' | 'redemption_contribution' | 'friend_ghosted' | 'purge'
  | 'state_changed' | 'reputation_updated' | 'threat_level_changed'
  | 'ghost_status_changed' | 'inactivity_warning' | 'survival_alert';

interface SurvivalUpdatePayload {
  userId: string;
  survivalState: string;
  reputationScore: number;
  threatLevel: number;
  socialRank: string;
  inactivityLevel: number;
  ghostStatus: boolean;
  warningLevel?: number;
  visibilityScore?: number;
  purgePressure?: number;
  collapseRisk?: number;
  purgeCount?: number;
  purgatoryStatus?: boolean;
  purgatoryEnteredAt?: string;
  redemptionProgress?: number;
  redemptionRequested?: boolean;
}

interface WebSocketMessage {
  type: 'new_message' | 'message_edited' | 'message_deleted' | 'message_hidden' | 'message_read' | 'message_reaction' | 'typing' | 'draft_started' | 'draft_updated' | 'draft_stopped' | 'draft_sent' | 'group_message' | 'group_message_reaction' | 'group_typing' | 'notification' | 'user_online' | 'user_offline' | 'credit_update' | 'profile_update' | 'survival_update' | 'match_found' | 'call_invite_update' | 'challenge_sent' | 'challenge_received' | 'challenge_accepted' | 'challenge_declined' | 'challenge_started' | 'challenge_finished' | 'challenge_reward' | 'friend_started_game' | 'friend_left_game' | 'leaderboard_updated';
  payload: any;
}

interface NotificationPayload {
  id: string;
  type: NotificationType;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  data?: Record<string, any>;
  title?: string;
  message?: string;
  createdAt: string;
}

interface OnlineStatusPayload {
  userId: string;
  isOnline: boolean;
}

const IS_DEV = import.meta.env.DEV;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private onlineUsers: Set<string> = new Set();
  private currentUserId: string | null = null;
  private lastToken: string | null = null;
  private isConnecting = false;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectPromise: Promise<void> | null = null;

  public setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      this.ensureConnected();
    }
  }

  public ensureConnected() {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.lastToken && this.lastToken !== token) {
      this.closeSocket(1000, 'Token refreshed');
      this.lastToken = token;
    }

    const state = this.ws?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING || this.isConnecting) {
      return;
    }

    void this.connect();
  }

  private getWebSocketUrl(token: string): string {
    const tokenQ = `token=${encodeURIComponent(token)}`;
    const explicit = (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '');
    if (explicit) {
      return `${explicit}${explicit.includes('?') ? '&' : '?'}${tokenQ}`;
    }
    // DEV: talk to backend WS directly (avoids broken Vite /ws proxy during restarts)
    if (IS_DEV) {
      return `ws://localhost:3005/ws?${tokenQ}`;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws?${tokenQ}`;
  }

  private log(...args: unknown[]) {
    if (IS_DEV) console.log('[WebSocket]', ...args);
  }

  private closeSocket(code = 1000, reason = 'Client closing') {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isConnecting = false;
    this.connectPromise = null;
  }

  private async connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;

    const token = localStorage.getItem('token');
    if (!token) {
      this.log('No token found, cannot connect');
      return;
    }

    const state = this.ws?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING || this.isConnecting) {
      return;
    }

    this.connectPromise = new Promise<void>((resolve) => {
      this.isConnecting = true;
      this.lastToken = token;

      try {
        const wsUrl = this.getWebSocketUrl(token);
        this.log('Connecting…');

        if (this.ws) {
          this.closeSocket(1000, 'Replacing connection');
        }

        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          if (this.ws !== socket) return;
          this.log('Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.intentionalClose = false;
          this.emit('connection', { connected: true });
          resolve();
        };

        socket.onmessage = (event) => {
          if (this.ws !== socket) return;
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        socket.onclose = (event) => {
          if (this.ws !== socket) return;
          this.ws = null;
          this.isConnecting = false;
          this.connectPromise = null;
          this.emit('connection', { connected: false });

          if (this.intentionalClose || event.code === 1000) {
            this.intentionalClose = false;
            resolve();
            return;
          }

          this.log(`Disconnected (code: ${event.code})`);
          this.scheduleReconnect();
          resolve();
        };

    socket.onerror = () => {
          if (this.ws !== socket) return;
          // Browser fires onerror then onclose — avoid double-noisy logs
          // Only warn once per connection attempt in dev
          if (IS_DEV && this.reconnectAttempts <= 1) {
            console.warn('[WebSocket] Connection error — will retry');
          }
        };
      } catch (error) {
        this.isConnecting = false;
        this.connectPromise = null;
        console.error('[WebSocket] Error creating connection:', error);
        this.scheduleReconnect();
        resolve();
      }
    });

    return this.connectPromise;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalClose) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached — retrying in 60s');
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        void this.connect();
      }, 60000);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    if (IS_DEV) {
      this.log(`Reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    if (message.type === 'new_message' && message.payload) {
      const payload = message.payload as { conversationId: string; message: { fromUserId: string } };
      if (this.currentUserId && payload.message?.fromUserId === this.currentUserId) {
        return;
      }
    }

    switch (message.type) {
      case 'notification':
        this.emit('notification', message.payload as NotificationPayload);
        break;
      case 'new_message':
        this.emit('new_message', message.payload);
        break;
      case 'message_edited':
        this.emit('message_edited', message.payload);
        break;
      case 'message_deleted':
        this.emit('message_deleted', message.payload);
        break;
      case 'message_hidden':
        this.emit('message_hidden', message.payload);
        break;
      case 'message_reaction':
        this.emit('message_reaction', message.payload);
        break;
      case 'message_read':
        this.emit('message_read', message.payload);
        break;
      case 'group_message':
        this.emit('group_message', message.payload);
        break;
      case 'group_message_reaction':
        this.emit('group_message_reaction', message.payload);
        break;
      case 'group_typing':
        this.emit('group_typing', message.payload);
        break;
      case 'match_found':
        this.emit('match_found', message.payload);
        break;
      case 'typing':
        this.emit('typing', message.payload);
        break;
      case 'draft_started':
        this.emit('draft_started', message.payload);
        break;
      case 'draft_updated':
        this.emit('draft_updated', message.payload);
        break;
      case 'draft_stopped':
        this.emit('draft_stopped', message.payload);
        break;
      case 'draft_sent':
        this.emit('draft_sent', message.payload);
        break;
      case 'user_online': {
        const onlinePayload = message.payload as OnlineStatusPayload;
        this.onlineUsers.add(onlinePayload.userId);
        this.emit('user_status_change', onlinePayload);
        break;
      }
      case 'user_offline': {
        const offlinePayload = message.payload as OnlineStatusPayload;
        this.onlineUsers.delete(offlinePayload.userId);
        this.emit('user_status_change', offlinePayload);
        break;
      }
      case 'credit_update':
        this.emit('credit_update', message.payload);
        break;
      case 'profile_update':
        this.emit('profile_update', message.payload);
        break;
      case 'survival_update':
        this.emit('survival_update', message.payload as SurvivalUpdatePayload);
        break;
      case 'challenge_sent':
      case 'challenge_received':
      case 'challenge_accepted':
      case 'challenge_declined':
      case 'challenge_started':
      case 'challenge_finished':
      case 'challenge_reward':
      case 'friend_started_game':
      case 'friend_left_game':
      case 'leaderboard_updated':
        this.emit(message.type, message.payload);
        break;
      default:
        // Forward unknown event types so new features work without client updates
        this.emit(message.type, message.payload);
        if (IS_DEV) console.debug('[WebSocket] event:', message.type);
    }
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  public send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  public disconnect() {
    this.closeSocket(1000, 'Logout');
    this.listeners.clear();
    this.onlineUsers.clear();
    this.lastToken = null;
    this.reconnectAttempts = 0;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
