import api from '../api/api';
import { supabase } from '../lib/supabaseClient';

export interface GameStats {
  gameId: string;
  lastScore: number;
  highScore: number;
  gamesPlayed: number;
  lastPlayed: string;
}

export interface PlayingUser {
  id: string;
  username: string;
  avatar: string;
  name?: string;
  currentGame?: string;
  gameStartedAt?: string;
}

export interface GhostedFriend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  ghostedAt: string;
  purgeDuration: number;
  creditsRequired: number;
  isGhost: boolean;
}

export const getGameStats = async (): Promise<GameStats[]> => {
  try {
    const response = await api.get('/games/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return [];
  }
};

export const getCurrentlyPlaying = async (): Promise<PlayingUser[]> => {
  try {
    const response = await api.get('/games/playing');
    return (response.data || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      name: u.name,
      currentGame: u.currentGame || u.gameTitle,
      gameStartedAt: u.gameStartedAt || u.startedAt,
    }));
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    console.warn('Could not fetch currently playing users:', error.message);
    return [];
  }
};

export const getGhostedFriends = async (): Promise<GhostedFriend[]> => {
  try {
    const response = await api.get('/redeem/ghosted-friends');
    return response.data || [];
  } catch {
    return [];
  }
};

export const redeemFriend = async (friendId: string): Promise<{ success: boolean; newCredits: number }> => {
  try {
    const response = await api.post(`/redeem/friends/${friendId}/redeem`);
    return response.data;
  } catch (error) {
    console.error('Error redeeming friend:', error);
    throw error;
  }
};

export const subscribeToPlayingUsers = (callback: (users: PlayingUser[]) => void) => {
  if (!supabase) return () => {};
  const channel = supabase.channel('playing-users')
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: PlayingUser[] = [];
      
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.status === 'playing' && presence.gameId) {
            users.push({
              id: presence.userId,
              username: presence.username,
              avatar: presence.avatar,
              name: presence.name,
              currentGame: presence.gameId,
              gameStartedAt: presence.gameStartedAt
            });
          }
        });
      });
      
      callback(users);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
