import i18n from '../i18n';

export type GameDifficulty = 'Easy' | 'Medium' | 'Hard';
export type GameAction = 'embed' | 'navigate';
export type EmbedKey = 'purgaslicer' | 'integrated';
export type IntegratedSlotId = 'rift' | 'slot2';

export interface PuurgaGameCatalogEntry {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  difficulty: GameDifficulty;
  rewardCoins: number;
  playTime: string;
  players: number;
  featured: boolean;
  isNew?: boolean;
  action: GameAction;
  target?: string;
  embedKey?: EmbedKey;
  /** Which paste-in module to load when embedKey is `integrated` */
  integratedSlot?: IntegratedSlotId;
}

export const INTEGRATED_GAME_RIFT_ID = 'purga-rift';
export const INTEGRATED_GAME_SLOT_2_ID = 'puurga-slot-2';

/** @deprecated use INTEGRATED_GAME_RIFT_ID */
export const INTEGRATED_GAME_ID = INTEGRATED_GAME_RIFT_ID;

export const NEW_GAME_PROMO_STORAGE_PREFIX = 'puurga_new_game_promo_dismissed_';

export const PUURGA_GAMES_CATALOG: PuurgaGameCatalogEntry[] = [
  {
    id: 'judgment',
    title: 'Judgment',
    description:
      'Decide the fate of souls. Your judgment must be swift and fair. Pass verdict on users based on their actions.',
    image: '/images/games/judgment.jpg',
    category: 'Strategy',
    difficulty: 'Hard',
    rewardCoins: 600,
    playTime: '15-20 min',
    players: 1500,
    featured: true,
    action: 'embed',
    embedKey: 'purgaslicer',
  },
  {
    id: 'watchman',
    title: 'The Watchman',
    description:
      'Defend the realm from incoming threats. Vigilance is key. Protect your tower from purge attacks.',
    image: '/images/games/watchman.jpg',
    category: 'Action',
    difficulty: 'Hard',
    rewardCoins: 500,
    playTime: '10-15 min',
    players: 1240,
    featured: true,
    action: 'navigate',
    target: '/next-game',
  },
  {
    id: 'redemption',
    title: 'Redemption',
    description:
      'A moral scenario game. Make the right choices to restore your status and redeem ghosted users.',
    image: '/images/games/redemption.jpg',
    category: 'Strategy',
    difficulty: 'Medium',
    rewardCoins: 300,
    playTime: '5-10 min',
    players: 890,
    featured: true,
    action: 'navigate',
    target: '/new-game',
  },
  {
    id: INTEGRATED_GAME_RIFT_ID,
    title: 'Purga Rift',
    description:
      'Decode dimension patterns, survive rift storms, and outsmart deception in this elite strategy arena.',
    image: '/images/games/purga-rift-cover.svg',
    category: 'Strategy',
    difficulty: 'Hard',
    rewardCoins: 520,
    playTime: '8-15 min',
    players: 480,
    featured: true,
    action: 'embed',
    embedKey: 'integrated',
    integratedSlot: 'rift',
  },
  {
    id: INTEGRATED_GAME_SLOT_2_ID,
    title: 'Cyber Runner',
    description:
      'Run, slash, and slide through five network phases. Upgrade gear, beat the weekly boss, and climb the leaderboard.',
    image: 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Gamevids/GameIcon.png',
    category: 'Action',
    difficulty: 'Medium',
    rewardCoins: 480,
    playTime: '5-12 min',
    players: 1240,
    featured: true,
    isNew: true,
    action: 'embed',
    embedKey: 'integrated',
    integratedSlot: 'slot2',
  },
];

export function getNewGames(): PuurgaGameCatalogEntry[] {
  return PUURGA_GAMES_CATALOG.filter((g) => g.isNew);
}

export function getGameById(id: string): PuurgaGameCatalogEntry | undefined {
  return PUURGA_GAMES_CATALOG.find((g) => g.id === id);
}

export function isPromoDismissed(gameId: string): boolean {
  return localStorage.getItem(`${NEW_GAME_PROMO_STORAGE_PREFIX}${gameId}`) === '1';
}

export function dismissPromo(gameId: string): void {
  localStorage.setItem(`${NEW_GAME_PROMO_STORAGE_PREFIX}${gameId}`, '1');
}

/**
 * Get translated game title based on current language
 */
export function getTranslatedGameTitle(gameId: string): string {
  const titleKey = `games.titles.${gameId}`;
  return i18n.t(titleKey) as string;
}

/**
 * Get translated game description based on current language
 */
export function getTranslatedGameDescription(gameId: string): string {
  const descKey = `games.descriptions.${gameId}`;
  return i18n.t(descKey) as string;
}

/**
 * Get translated game difficulty based on current language
 */
export function getTranslatedDifficulty(difficulty: GameDifficulty): string {
  const diffKey = `games.difficulty.${difficulty.toLowerCase()}`;
  return i18n.t(diffKey) as string;
}

/**
 * Get translated game category based on current language
 */
export function getTranslatedCategory(category: string): string {
  const catKey = `games.category.${category.toLowerCase()}`;
  return i18n.t(catKey) as string;
}

/**
 * Get game entry with translated title and description
 */
export function getTranslatedGameEntry(game: PuurgaGameCatalogEntry): PuurgaGameCatalogEntry {
  return {
    ...game,
    title: getTranslatedGameTitle(game.id),
    description: getTranslatedGameDescription(game.id),
    difficulty: game.difficulty,
    category: getTranslatedCategory(game.category),
  };
}

/**
 * Get all games with translated titles and descriptions
 */
export function getTranslatedGamesCatalog(): PuurgaGameCatalogEntry[] {
  return PUURGA_GAMES_CATALOG.map(getTranslatedGameEntry);
}
