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

interface WebSocketMessage {
  type: 'new_message' | 'message_read' | 'typing';
  payload: NewMessagePayload | MessageReadPayload | TypingPayload;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocket();
  }

  private setupWebSocket() {
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

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
        const userId = decoded.id;

        // Store client connection
        wsClient.userId = userId;
        if (!this.clients.has(userId)) {
          this.clients.set(userId, []);
        }
        this.clients.get(userId)!.push(wsClient);

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
}

export default WebSocketManager; 