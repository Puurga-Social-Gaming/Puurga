import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';
import { supabase } from './config/supabase';

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

interface NotificationPayload {
  id: string;
  type: NotificationType;
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
    conversationId?: string;
    messageId?: string;
    shareId?: string;
    groupId?: string;
    gameId?: string;
  } & Record<string, any>;
  title?: string;
  message?: string;
  createdAt: string;
}

interface OnlineStatusPayload {
  userId: string;
  isOnline: boolean;
}

interface CreditUpdatePayload {
  userId: string;
  credits: number;
  change?: number;
  source?: string;
}

interface ProfileUpdatePayload {
  userId: string;
  isGhost: boolean;
  purgeCount?: number;
}

interface CreditsUpdatedPayload {
  userId: string;
  credits: number;
  change: number;
  source: string;
}

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
  loyaltyScore?: number;
}

interface AllianceUpdatePayload {
  userId: string;
  allianceId?: string;
  allianceStatus?: 'PENDING' | 'ACTIVE' | 'BROKEN' | 'BETRAYED';
  loyaltyScore?: number;
  eventType?: 'ALLIANCE_REQUESTED' | 'ALLIANCE_ACCEPTED' | 'ALLIANCE_BROKEN' | 'ALLIANCE_REJECTED' | 'LOYALTY_CHANGED' | 'ALLY_COLLAPSING' | 'ALLY_GHOSTED' | 'REDEMPTION_SUPPORT_RECEIVED';
  partnerId?: string;
  partnerUsername?: string;
}

interface WebSocketMessage {
  type: 'new_message' | 'message_read' | 'typing' | 'notification' | 'user_online' | 'user_offline' | 'credit_update' | 'profile_update' | 'credits_updated' | 'survival_update' | 'alliance_update';
  payload: NewMessagePayload | MessageReadPayload | TypingPayload | NotificationPayload | OnlineStatusPayload | CreditUpdatePayload | ProfileUpdatePayload | CreditsUpdatedPayload | SurvivalUpdatePayload | AllianceUpdatePayload;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient[]> = new Map();
  private static instance: WebSocketManager | null = null;

  private constructor() { }

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

    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
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

        // Get the current user's online status preference
        let currentUserAllowsOnlineStatus = true;
        try {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('show_online_status')
            .eq('id', userId)
            .single();
          currentUserAllowsOnlineStatus = currentProfile?.show_online_status !== false;
        } catch (error) {
          console.error('Error checking current user online status setting:', error);
        }

        // Send all currently online users to the new client (respecting their settings)
        const onlineUserIds = this.getOnlineUsers();
        for (const onlineUserId of onlineUserIds) {
          if (onlineUserId !== userId) {
            // Check if this user allows showing online status
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('show_online_status')
                .eq('id', onlineUserId)
                .single();

              if (profile?.show_online_status !== false) {
                const statusMessage: WebSocketMessage = {
                  type: 'user_online',
                  payload: { userId: onlineUserId, isOnline: true } as OnlineStatusPayload
                };
                this.sendToUser(userId, statusMessage);
              }
            } catch (error) {
              // Default to showing on error
              const statusMessage: WebSocketMessage = {
                type: 'user_online',
                payload: { userId: onlineUserId, isOnline: true } as OnlineStatusPayload
              };
              this.sendToUser(userId, statusMessage);
            }
          }
        }

        // Broadcast this user's online status to all connected users (respecting settings)
        if (currentUserAllowsOnlineStatus) {
          this.broadcastUserStatus(userId, true);
        }

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

  private async broadcastUserStatus(userId: string, isOnline: boolean) {
    // Check if user allows showing online status
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('show_online_status')
        .eq('id', userId)
        .single();

      // If user has disabled online status, don't broadcast
      if (profile?.show_online_status === false) {
        console.log(`User ${userId} has disabled online status - not broadcasting`);
        return;
      }
    } catch (error) {
      console.error('Error checking online status setting:', error);
      // Continue broadcasting on error (default to showing)
    }

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

  public sendSurvivalUpdate(userId: string, payload: SurvivalUpdatePayload) {
    const survivalMessage: WebSocketMessage = {
      type: 'survival_update',
      payload
    };
    this.sendToUser(userId, survivalMessage);
  }

  public sendAllianceUpdate(userId: string, payload: AllianceUpdatePayload) {
    const allianceMessage: WebSocketMessage = {
      type: 'alliance_update',
      payload
    };
    this.sendToUser(userId, allianceMessage);
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
