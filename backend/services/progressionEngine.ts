import { EventEmitter } from 'events';
import { XPEngine, XP_REWARDS } from './xpEngine';
import { wsManager } from '../websocketManager';

export type ProgressionEvent =
  | 'PostCreated'
  | 'PostLiked'
  | 'CommentCreated'
  | 'GameFinished'
  | 'UserLogin'
  | 'FriendAdded'
  | 'MessageSent'
  | 'ProfileUpdated'
  | 'PurgeGiven'
  | 'PurgeReceived'
  | 'AllianceFormed'
  | 'CertificationEarned'
  | 'RedemptionCompleted'
  | 'GhostModeEntered'
  | 'GhostModeExited';

export interface ProgressionEventData {
  userId: string;
  [key: string]: any;
}

/**
 * ProgressionEngine — Central event-driven hub for all progression rewards.
 *
 * Routes emit domain events. This engine listens and fans out to:
 * - XPEngine (awards XP, calculates levels)
 * - WebSocket broadcasts (real-time updates to client)
 *
 * Future: AchievementEngine, MissionEngine, StatsEngine will also subscribe.
 *
 * Usage from routes:
 *   import { progressionEngine } from '../services/progressionEngine';
 *   progressionEngine.emit('PostCreated', { userId, postId });
 */
class ProgressionEngineClass extends EventEmitter {
  private static instance: ProgressionEngineClass;
  private initialized = false;

  private constructor() {
    super();
    this.setMaxListeners(20);
  }

  static getInstance(): ProgressionEngineClass {
    if (!ProgressionEngineClass.instance) {
      ProgressionEngineClass.instance = new ProgressionEngineClass();
    }
    return ProgressionEngineClass.instance;
  }

  /**
   * Initialize event listeners. Call once on server startup.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.on('PostCreated', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.POST_CREATED, 'post_created');
    });

    this.on('PostLiked', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.POST_LIKED, 'post_liked');
      if (data.authorId && data.authorId !== data.userId) {
        await XPEngine.awardXP(data.authorId, XP_REWARDS.RECEIVE_LIKE, 'receive_like');
      }
    });

    this.on('CommentCreated', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.COMMENT_CREATED, 'comment_created');
      if (data.postAuthorId && data.postAuthorId !== data.userId) {
        await XPEngine.awardXP(data.postAuthorId, XP_REWARDS.RECEIVE_COMMENT, 'receive_comment');
      }
    });

    this.on('GameFinished', async (data: ProgressionEventData) => {
      const xp = data.isWin ? XP_REWARDS.GAME_WIN : XP_REWARDS.GAME_PLAY;
      await XPEngine.awardXP(data.userId, xp, `game_${data.gameId || 'unknown'}`);
    });

    this.on('UserLogin', async (data: ProgressionEventData) => {
      if (data.isDailyBonus) {
        await XPEngine.awardXP(data.userId, XP_REWARDS.DAILY_LOGIN, 'daily_login');
      }
    });

    this.on('FriendAdded', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.FRIEND_ADDED, 'friend_added');
      if (data.friendId && data.friendId !== data.userId) {
        await XPEngine.awardXP(data.friendId, XP_REWARDS.FRIEND_ADDED, 'friend_added');
      }
    });

    this.on('MessageSent', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.MESSAGE_SENT, 'message_sent');
    });

    this.on('AllianceFormed', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.ALLIANCE_FORMED, 'alliance_formed');
      if (data.allyId && data.allyId !== data.userId) {
        await XPEngine.awardXP(data.allyId, XP_REWARDS.ALLIANCE_FORMED, 'alliance_formed');
      }
    });

    this.on('CertificationEarned', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.CERTIFICATION, 'certification');
    });

    this.on('PurgeSurvived', async (data: ProgressionEventData) => {
      await XPEngine.awardXP(data.userId, XP_REWARDS.PURGE_SURVIVED, 'purge_survived');
    });

    console.log('ProgressionEngine: Initialized with event listeners');
  }

  /**
   * Safe emit — catches errors from listeners to prevent cascade failures.
   */
  safeEmit(event: string, data: any): void {
    try {
      this.emit(event, data);
    } catch (error) {
      console.error(`ProgressionEngine: Error in listener for ${event}:`, error);
    }
  }
}

export const progressionEngine = ProgressionEngineClass.getInstance();
