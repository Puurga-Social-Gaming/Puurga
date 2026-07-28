import { type ComponentType } from 'react';
import i18n from '../i18n';

export type GameDifficulty = 'Easy' | 'Medium' | 'Hard';
export type GameStatus = 'live' | 'coming-soon' | 'disabled';
export type IntegratedSlotId = 'rift' | 'slot2';

export interface GameEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  banner: string;
  difficulty: GameDifficulty;
  category: string;
  rewardCoins: number;
  playTime: string;
  status: GameStatus;
  route: string;
  /** Dynamic import for the game component */
  loader: () => Promise<{ default: ComponentType }>;
  /** Accent color used in loading fallback */
  accentColor?: string;
  /** Loading label */
  loadingLabel?: string;
  /** Whether this game uses the unified credit system */
  usesUnifiedEconomy?: boolean;
  /** Steam-style metadata */
  rating?: number;
  playerCount?: number;
  gradient?: string;
}

// Lazy imports for each game
const judgmentLoader = () => import('../games/judgment');
const watchmanLoader = () => import('../games/watchman');
const redemptionLoader = () => import('../games/redemption');
const purgaRiftLoader = () => import('../games/purga-rift');
const cyberRunnerLoader = () => import('../games/cyber-runner');

export const GAMES_CATALOG: GameEntry[] = [
  {
    id: 'judgment',
    slug: 'judgment',
    name: 'Judgment',
    description: 'Decide the fate of souls. Your judgment must be swift and fair.',
    icon: '/images/games/judgment.jpg',
    banner: '/images/games/judgment.jpg',
    difficulty: 'Hard',
    category: 'Strategy',
    rewardCoins: 600,
    playTime: '15-20 min',
    status: 'live',
    route: '/games/judgment',
    loader: judgmentLoader,
    accentColor: 'text-violet-400',
    loadingLabel: 'JUDGING...',
    usesUnifiedEconomy: true,
    rating: 4.8,
    playerCount: 1523,
    gradient: 'from-violet-600/80 via-purple-500/60 to-indigo-600/80',
  },
  {
    id: 'watchman',
    slug: 'watchman',
    name: 'The Watchman',
    description: 'Defend the realm from incoming threats. Vigilance is key.',
    icon: '/images/games/watchman.jpg',
    banner: '/images/games/watchman.jpg',
    difficulty: 'Hard',
    category: 'Action',
    rewardCoins: 500,
    playTime: '10-15 min',
    status: 'live',
    route: '/games/watchman',
    loader: watchmanLoader,
    accentColor: 'text-amber-400',
    loadingLabel: 'DEFENDING...',
    usesUnifiedEconomy: true,
    rating: 4.6,
    playerCount: 1247,
    gradient: 'from-amber-600/80 via-orange-500/60 to-red-600/80',
  },
  {
    id: 'redemption',
    slug: 'redemption',
    name: 'Redemption',
    description: 'A moral scenario game. Make the right choices to restore your status.',
    icon: '/images/games/redemption.jpg',
    banner: '/images/games/redemption.jpg',
    difficulty: 'Medium',
    category: 'Strategy',
    rewardCoins: 300,
    playTime: '5-10 min',
    status: 'live',
    route: '/games/redemption',
    loader: redemptionLoader,
    accentColor: 'text-emerald-400',
    loadingLabel: 'REDEEMING...',
    usesUnifiedEconomy: true,
    rating: 4.3,
    playerCount: 892,
    gradient: 'from-emerald-600/80 via-teal-500/60 to-cyan-600/80',
  },
  {
    id: 'purga-rift',
    slug: 'purga-rift',
    name: 'Purga Rift',
    description: 'Decode dimension patterns, survive rift storms, and outsmart deception.',
    icon: '/images/games/purga-rift-cover.svg',
    banner: '/images/games/purga-rift-cover.svg',
    difficulty: 'Hard',
    category: 'Strategy',
    rewardCoins: 520,
    playTime: '8-15 min',
    status: 'live',
    route: '/games/purga-rift',
    loader: purgaRiftLoader,
    accentColor: 'text-violet-400',
    loadingLabel: 'OPENING RIFT...',
    usesUnifiedEconomy: true,
    rating: 4.7,
    playerCount: 483,
    gradient: 'from-fuchsia-600/80 via-purple-500/60 to-violet-600/80',
  },
  {
    id: 'cyber-runner',
    slug: 'cyber-runner',
    name: 'Cyber Runner',
    description: 'Run, slash, and slide through five network phases.',
    icon: 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Gamevids/GameIcon.png',
    banner: 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Gamevids/GameIcon.png',
    difficulty: 'Medium',
    category: 'Action',
    rewardCoins: 480,
    playTime: '5-12 min',
    status: 'live',
    route: '/games/cyber-runner',
    loader: cyberRunnerLoader,
    accentColor: 'text-amber-400',
    loadingLabel: 'LOADING...',
    usesUnifiedEconomy: true,
    rating: 4.5,
    playerCount: 1240,
    gradient: 'from-cyan-600/80 via-blue-500/60 to-indigo-600/80',
  },
];

export function getGameBySlug(slug: string): GameEntry | undefined {
  return GAMES_CATALOG.find((g) => g.slug === slug);
}

export function getGameById(id: string): GameEntry | undefined {
  return GAMES_CATALOG.find((g) => g.id === id);
}

export function getLiveGames(): GameEntry[] {
  return GAMES_CATALOG.filter((g) => g.status === 'live');
}

export function getGamesByCategory(category: string): GameEntry[] {
  return GAMES_CATALOG.filter((g) => g.category === category);
}

export function getCategories(): string[] {
  return [...new Set(GAMES_CATALOG.map((g) => g.category))];
}

// Translation helpers
export function getTranslatedGameName(gameId: string): string {
  const key = `games.titles.${gameId}`;
  const translated = i18n.t(key);
  return translated === key ? getGameById(gameId)?.name || gameId : translated;
}

export function getTranslatedGameDescription(gameId: string): string {
  const key = `games.descriptions.${gameId}`;
  const translated = i18n.t(key);
  return translated === key
    ? getGameById(gameId)?.description || ''
    : translated;
}

export function getTranslatedDifficulty(difficulty: GameDifficulty): string {
  const key = `games.difficulty.${difficulty.toLowerCase()}`;
  return i18n.t(key);
}

export function getTranslatedCategory(category: string): string {
  const key = `games.category.${category.toLowerCase()}`;
  return i18n.t(key);
}
