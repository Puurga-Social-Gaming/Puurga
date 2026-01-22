export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  language?: string;
  createdAt: string;
  lastEdited?: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  likes: number;
  liked?: boolean;
  puurgas: number;
  puurged?: boolean;
  purges: number;
  purged?: boolean;
  comments: number;
  Comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatar: string;
    };
  }>;
  visibility: 'friends' | 'public' | 'private';
  images?: string[];
  media_layout?: string;
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
  reactions: { [key: string]: ReactionCount };
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  location?: string;
  website?: string;
  occupation?: string;
  education?: string;
  relationship?: string;
  isPrivate: boolean;
  hideFromSuggestions: boolean;
  messageRequests: 'everyone' | 'followers' | 'none';
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
  commentPrivacy: 'everyone' | 'followers' | 'none';
  storyPrivacy: 'everyone' | 'followers' | 'close_friends';
  isVerified: boolean;
  joinDate: string;
  stats: {
    followers: number;
    following: number;
    posts: number;
    puurgas: number;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface ReactionCount {
  count: number;
  users: Array<{
    id: string;
    name: string;
    username: string;
    avatar?: string;
  }>;
}