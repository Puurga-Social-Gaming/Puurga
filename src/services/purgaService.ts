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
    return response.data || [];
  } catch (error: any) {
    // Don't log error for this - it's expected to return empty if no one is playing
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
    return response.data;
  } catch (error) {
    console.error('Error fetching ghosted friends:', error);
    return [];
  }
};

export const redeemFriend = async (friendId: string): Promise<{ success: boolean; newCredits: number }> => {
  try {
    const response = await api.post(`/friends/${friendId}/redeem`);
    return response.data;
  } catch (error) {
    console.error('Error redeeming friend:', error);
    throw error;
  }
};

export const subscribeToPlayingUsers = (callback: (users: PlayingUser[]) => void) => {
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
