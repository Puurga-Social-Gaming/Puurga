// Purge system constants
export const PURGE_THRESHOLD = 20; // Number of purges required to trigger ghost mode
export const PURGE_GHOST_THRESHOLD = PURGE_THRESHOLD; // Alias for clarity

export const PURGE_EFFECTS = {
  REPUTATION_LOSS_PER_PURGE: -5,
  PURGE_SURVIVED_REPUTATION_GAIN: 10,
  SAME_POST_COOLDOWN_HOURS: 24,
  HOURLY_LIMIT: 5,
  DAILY_LIMIT: 20,
};

export const PURGE_TIER_LABELS: Record<number, string> = {
  0: 'STABLE',
  5: 'WATCHED',
  10: 'HUNTED',
  15: 'COLLAPSING',
  20: 'GHOSTED',
};

export const PURGE_VISIBILITY_DROPS: Record<number, number> = {
  0: 0,
  5: 10,
  10: 25,
  15: 50,
  20: 80,
};
