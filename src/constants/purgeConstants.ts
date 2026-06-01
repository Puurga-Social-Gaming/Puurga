// Purge system constants
export const PURGE_THRESHOLD = 20;
export const PURGE_TIER_LABELS: Record<number, string> = {
  0: 'STABLE',
  5: 'WATCHED',
  10: 'HUNTED',
  15: 'COLLAPSING',
  20: 'GHOSTED',
};

export const PURGE_TIER_MESSAGES: Record<string, string> = {
  STABLE: '',
  WATCHED: 'You are being watched.',
  HUNTED: 'Your influence is weakening.',
  COLLAPSING: 'Your visibility is collapsing.',
  GHOSTED: 'You are approaching social death.',
};
