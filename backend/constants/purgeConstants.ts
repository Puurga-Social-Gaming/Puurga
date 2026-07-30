// Purge system constants
export const POST_PURGE_THRESHOLD = 250; // Number of purges to remove a post from public feed
export const PROFILE_PURGE_THRESHOLD = 300; // Number of purges to trigger ghost mode on a profile
export const PURGE_THRESHOLD = PROFILE_PURGE_THRESHOLD; // Backward-compatible alias
export const PURGE_GHOST_THRESHOLD = PROFILE_PURGE_THRESHOLD; // Alias for clarity

export const PURGE_EFFECTS = {
  REPUTATION_LOSS_PER_PURGE: -5,
  PURGE_SURVIVED_REPUTATION_GAIN: 10,
  SAME_POST_COOLDOWN_HOURS: 24,
  HOURLY_LIMIT: 5,
  DAILY_LIMIT: 20,
};

export const PURGE_TIER_LABELS: Record<number, string> = {
  0: 'STABLE',
  75: 'WATCHED',
  150: 'HUNTED',
  225: 'COLLAPSING',
  300: 'GHOSTED',
};

export const PURGE_VISIBILITY_DROPS: Record<number, number> = {
  0: 0,
  75: 10,
  150: 25,
  225: 50,
  300: 80,
};
