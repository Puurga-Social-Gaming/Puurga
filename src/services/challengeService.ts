import api from '../lib/axios';

export const STAKE_PRESETS = [10, 25, 50, 100, 250, 500, 1000] as const;

export interface GamePresenceUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  gameId: string;
  gameTitle: string;
  startedAt: string;
  status?: 'playing';
}

export interface GameChallenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  game_id: string;
  game_title?: string;
  stake: number;
  status: string;
  stakes_locked?: boolean;
  challenger_score?: number | null;
  opponent_score?: number | null;
  winner_id?: string | null;
  created_at: string;
  expires_at?: string;
}

export async function setGamePresence(gameId: string, gameTitle?: string) {
  const { data } = await api.post('/games/presence', { gameId, gameTitle });
  return data;
}

export async function clearGamePresence() {
  await api.delete('/games/presence');
}

export async function heartbeatGamePresence() {
  await api.patch('/games/presence/heartbeat');
}

export async function getGamePresence(): Promise<GamePresenceUser[]> {
  const { data } = await api.get('/games/presence');
  return data || [];
}

export async function createChallenge(params: {
  opponentId: string;
  gameId: string;
  stake: number;
  gameTitle?: string;
}): Promise<GameChallenge> {
  const { data } = await api.post('/games/challenges', params);
  return data;
}

export async function listChallenges(status?: string): Promise<GameChallenge[]> {
  const { data } = await api.get('/games/challenges', { params: status ? { status } : {} });
  return data || [];
}

export async function acceptChallenge(id: string) {
  const { data } = await api.post(`/games/challenges/${id}/accept`);
  return data;
}

export async function declineChallenge(id: string) {
  const { data } = await api.post(`/games/challenges/${id}/decline`);
  return data;
}

export async function cancelChallenge(id: string) {
  const { data } = await api.post(`/games/challenges/${id}/cancel`);
  return data;
}

export async function submitChallengeScore(id: string, score: number) {
  const { data } = await api.post(`/games/challenges/${id}/score`, { score });
  return data;
}

export async function finishChallenge(id: string, winnerId: string) {
  const { data } = await api.post(`/games/challenges/${id}/finish`, { winnerId });
  return data;
}

export async function getChallengeHistory(range: 'today' | 'week' | 'month' | 'all' = 'all') {
  const { data } = await api.get('/games/history', { params: { range } });
  return data || [];
}

export async function getChallengeLeaderboard() {
  const { data } = await api.get('/games/challenge-leaderboard');
  return data || [];
}

export async function getChallengeFeed() {
  const { data } = await api.get('/games/feed');
  return data || [];
}
