export type NotificationType =
  // Social
  | 'like' | 'dislike' | 'comment' | 'reply' | 'mention'
  | 'follow' | 'follow_accepted' | 'share' | 'profile_visit'
  // Messaging
  | 'message' | 'group_message' | 'message_reaction' | 'missed_call'
  // Gaming
  | 'resume_game' | 'reward_reminder' | 'tournament_reminder' | 'challenge'
  | 'game_score' | 'game_high_score'
  // System
  | 'welcome' | 'verification' | 'security_alert' | 'maintenance'
  // Legacy
  | 'friend_request' | 'friend_request_accepted'
  | 'redemption' | 'redemption_contribution' | 'friend_ghosted' | 'purge';

export interface NotificationData {
  friendRequestId?: string;
  postId?: string;
  commentId?: string;
  conversationId?: string;
  messageId?: string;
  shareId?: string;
  groupId?: string;
  gameId?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: NotificationType;
  read: boolean;
  title?: string;
  message?: string;
  createdAt: string;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  data?: NotificationData;
}

export interface NotificationPreferences {
  push: boolean;
  sound: boolean;
  vibration: boolean;
  social: boolean;
  messaging: boolean;
  gaming: boolean;
  system: boolean;
  likes: boolean;
  dislikes: boolean;
  comments: boolean;
  replies: boolean;
  mentions: boolean;
  follows: boolean;
  shares: boolean;
  profile_visits: boolean;
  messages: boolean;
  group_messages: boolean;
  message_reactions: boolean;
  missed_calls: boolean;
  resume_game: boolean;
  reward_reminders: boolean;
  tournament_reminders: boolean;
  challenges: boolean;
  welcome: boolean;
  verification: boolean;
  security_alerts: boolean;
  maintenance: boolean;
}

const NOTIFICATION_CATEGORIES: Record<string, NotificationType[]> = {
  social: [
    'like', 'dislike', 'comment', 'reply', 'mention',
    'follow', 'follow_accepted', 'share', 'profile_visit',
    'friend_request', 'friend_request_accepted',
    'friend_ghosted', 'redemption', 'redemption_contribution', 'purge',
  ],
  messaging: ['message', 'group_message', 'message_reaction', 'missed_call'],
  gaming: [
    'resume_game',
    'reward_reminder',
    'tournament_reminder',
    'challenge',
    'game_score',
    'game_high_score',
  ],
  system: ['welcome', 'verification', 'security_alert', 'maintenance'],
};

export function getNotificationCategory(type: NotificationType): string {
  for (const [category, types] of Object.entries(NOTIFICATION_CATEGORIES)) {
    if (types.includes(type)) return category;
  }
  return 'system';
}

export const FILTER_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'social', label: 'Social' },
  { id: 'messaging', label: 'Messages' },
  { id: 'gaming', label: 'Games' },
  { id: 'system', label: 'System' },
];
