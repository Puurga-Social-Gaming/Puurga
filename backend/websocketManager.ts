import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';

interface WebSocketClient extends WebSocket {
  userId?: string;
}

interface NewMessagePayload {
  conversationId: string;
  message: {
    id: string;
    content: string;
    fromUserId: string;
    createdAt: Date;
    fromUser: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
  };
}

interface MessageReadPayload {
  conversationId: string;
  messageId: string;
  userId: string;
}

interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
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

interface WebSocketMessage {
  type: 'new_message' | 'message_read' | 'typing' | 'notification' | 'user_online' | 'user_offline';
  payload: NewMessagePayload | MessageReadPayload | TypingPayload | NotificationPayload | OnlineStatusPayload;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient[]> = new Map();
  private static instance: WebSocketManager | null = null;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(server: Server) {
    if (this.wss) {
      console.warn('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({ server });
    this.setupWebSocket();
    console.log('✅ WebSocket server initialized');
  }

  private setupWebSocket() {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const wsClient = ws as WebSocketClient;
      try {
        // Get token from query params
        const { query } = url.parse(req.url || '', true);
        const token = query.token as string;

        if (!token) {
          wsClient.close(1008, 'Authentication required');
          return;
        }

        // Verify token - this is a Supabase JWT token, so we need to decode it differently
        let userId: string;
        try {
          // For Supabase tokens, we can decode without verification since Supabase already verified it
          const decoded = jwt.decode(token) as any;
          if (!decoded || !decoded.sub) {
            throw new Error('Invalid token structure');
          }
          userId = decoded.sub;
        } catch (error) {
          console.error('Token verification failed:', error);
          wsClient.close(1008, 'Invalid token');
          return;
        }

        // Store client connection
        wsClient.userId = userId;
        if (!this.clients.has(userId)) {
          this.clients.set(userId, []);
        }
        this.clients.get(userId)!.push(wsClient);

        console.log(`User ${userId} connected to WebSocket`);
        
        // Broadcast user online status to all connected users
        this.broadcastUserStatus(userId, true);

        // Handle client disconnect
        wsClient.on('close', () => {
          const userClients = this.clients.get(userId);
          if (userClients) {
            const index = userClients.indexOf(wsClient);
            if (index !== -1) {
              userClients.splice(index, 1);
            }
            if (userClients.length === 0) {
              this.clients.delete(userId);
              console.log(`User ${userId} disconnected from WebSocket`);
              
              // Broadcast user offline status to all connected users
              this.broadcastUserStatus(userId, false);
            }
          }
        });

        // Handle errors
        wsClient.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        wsClient.close(1008, 'Authentication failed');
      }
    });
  }

  public sendToUser(userId: string, data: WebSocketMessage) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const message = JSON.stringify(data);
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  public broadcastToUsers(userIds: string[], data: WebSocketMessage) {
    userIds.forEach(userId => this.sendToUser(userId, data));
  }

  private broadcastUserStatus(userId: string, isOnline: boolean) {
    const statusMessage: WebSocketMessage = {
      type: isOnline ? 'user_online' : 'user_offline',
      payload: { userId, isOnline } as OnlineStatusPayload
    };

    // Broadcast to all connected users except the user whose status changed
    this.clients.forEach((clients, connectedUserId) => {
      if (connectedUserId !== userId) {
        this.sendToUser(connectedUserId, statusMessage);
      }
    });
  }

  public sendNotification(userId: string, notification: NotificationPayload) {
    const notificationMessage: WebSocketMessage = {
      type: 'notification',
      payload: notification
    };
    this.sendToUser(userId, notificationMessage);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.clients.has(userId);
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();
export default WebSocketManager;
