type NotificationType =
  | 'like' | 'dislike' | 'comment' | 'reply' | 'mention'
  | 'follow' | 'follow_accepted' | 'share' | 'profile_visit'
  | 'message' | 'group_message' | 'message_reaction' | 'missed_call'
  | 'resume_game' | 'reward_reminder' | 'tournament_reminder' | 'challenge'
  | 'welcome' | 'verification' | 'security_alert' | 'maintenance'
  | 'friend_request' | 'friend_request_accepted'
  | 'redemption' | 'redemption_contribution' | 'friend_ghosted' | 'purge'
  // Survival system events
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
  type: 'new_message' | 'message_read' | 'typing' | 'notification' | 'user_online' | 'user_offline' | 'credit_update' | 'profile_update' | 'survival_update';
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

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private onlineUsers: Set<string> = new Set();
  private currentUserId: string | null = null;
  private lastToken: string | null = null;

  constructor() {
    // Connection is deferred until auth confirms — see setCurrentUserId()
  }

  public setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
    this.ensureConnected();
  }

  public ensureConnected() {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.lastToken && this.lastToken !== token) {
      this.disconnect();
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
  }

  private getWebSocketUrl(token: string): string {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
      return `ws://localhost:3005/ws?token=${encodeURIComponent(token)}`;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3005'
        : '';
      
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[WebSocket] Backend health check passed:', data);
        return true;
      }
    } catch (error) {
      console.error('[WebSocket] Backend health check failed:', error);
    }
    return false;
  }

  private async connect() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[WebSocket] No token found, cannot connect');
      return;
    }

    this.lastToken = token;

    try {
      const wsUrl = this.getWebSocketUrl(token);
      console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.emit('connection', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
        this.emit('connection', { connected: false });
        
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        console.error('[WebSocket] Error details:', {
          url: wsUrl.replace(/token=[^&]+/, 'token=***'),
          readyState: this.ws?.readyState,
          readyStateText: this.getReadyStateText(this.ws?.readyState)
        });
      };

      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          console.warn('[WebSocket] Connection timeout - backend may not be reachable');
        }
      }, 10000);

    } catch (error) {
      console.error('[WebSocket] Error creating connection:', error);
      this.attemptReconnect();
    }
  }

  private getReadyStateText(state?: number): string {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  private handleMessage(message: WebSocketMessage) {
    // For new_message type, validate that the message is not from the current user
    if (message.type === 'new_message' && message.payload) {
      const payload = message.payload as { conversationId: string; message: { fromUserId: string } };
      // Skip messages from self - they were already added optimistically
      if (this.currentUserId && payload.message?.fromUserId === this.currentUserId) {
        return; // Don't emit to listeners - prevents duplicate/echo
      }
    }

    switch (message.type) {
      case 'notification':
        this.emit('notification', message.payload as NotificationPayload);
        break;
      case 'new_message':
        this.emit('new_message', message.payload);
        break;
      case 'message_read':
        this.emit('message_read', message.payload);
        break;
      case 'typing':
        this.emit('typing', message.payload);
        break;
      case 'user_online':
        const onlinePayload = message.payload as OnlineStatusPayload;
        this.onlineUsers.add(onlinePayload.userId);
        this.emit('user_status_change', onlinePayload);
        break;
      case 'user_offline':
        const offlinePayload = message.payload as OnlineStatusPayload;
        this.onlineUsers.delete(offlinePayload.userId);
        this.emit('user_status_change', offlinePayload);
        break;
      case 'credit_update':
        this.emit('credit_update', message.payload);
        break;
      case 'profile_update':
        this.emit('profile_update', message.payload);
        break;
      case 'survival_update':
        this.emit('survival_update', message.payload as SurvivalUpdatePayload);
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached. Will retry after 60 seconds.');

      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 60000);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    const isHealthy = await this.checkBackendHealth();
    if (!isHealthy) {
      console.warn('[WebSocket] Backend health check failed - skipping reconnect attempt');
      setTimeout(() => this.attemptReconnect(), delay);
      return;
    }

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  public send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.onlineUsers.clear();
    this.lastToken = null;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
