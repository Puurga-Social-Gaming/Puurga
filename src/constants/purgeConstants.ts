// Purge system constants
export const POST_PURGE_THRESHOLD = 250; // Purges to remove a post from public feed
export const PROFILE_PURGE_THRESHOLD = 300; // Purges to trigger ghost mode on a profile
export const PURGE_THRESHOLD = PROFILE_PURGE_THRESHOLD;

export const PURGE_TIER_LABELS: Record<number, string> = {
  0: 'STABLE',
  75: 'WATCHED',
  150: 'HUNTED',
  225: 'COLLAPSING',
  300: 'GHOSTED',
};

export const PURGE_TIER_MESSAGES: Record<string, string> = {
  STABLE: '',
  WATCHED: 'You are being watched.',
  HUNTED: 'Your influence is weakening.',
  COLLAPSING: 'Your visibility is collapsing.',
  GHOSTED: 'You are approaching social death.',
};
