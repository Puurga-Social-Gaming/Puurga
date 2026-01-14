interface WebSocketMessage {
  type: 'new_message' | 'message_read' | 'typing' | 'notification' | 'user_online' | 'user_offline';
  payload: any;
}

interface NotificationPayload {
  id: string;
  type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment';
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  data?: {
    friendRequestId?: string;
    postId?: string;
    commentId?: string;
  };
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

  constructor() {
    this.connect();
  }

  private connect() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, cannot connect to WebSocket');
      return;
    }

    try {
      const wsUrl = `ws://localhost:3005?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('connection', { connected: false });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage) {
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
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
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
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
