export const SURVIVAL_THRESHOLDS = {
  REPUTATION: {
    MIN: 0,
    MAX: 1000,
    DEFAULT: 100,
  },
  SURVIVAL_SCORE: {
    MIN: 0,
    MAX: 1000,
    DEFAULT: 100,
  },
  THREAT_LEVEL: {
    MIN: 0,
    MAX: 100,
  },
  STATE: {
    SAFE_PURGE_LIMIT: 5,
    SAFE_REPUTATION_MIN: 80,
    WARNING_PURGE_LIMIT: 5,
    WARNING_REPUTATION_MAX: 80,
    WARNING_INACTIVITY_MIN: 1,
    HUNTED_PURGE_LIMIT: 10,
    HUNTED_REPUTATION_MAX: 60,
    COLLAPSING_PURGE_LIMIT: 15,
    COLLAPSING_REPUTATION_MAX: 40,
    COLLAPSING_INACTIVITY_MIN: 3,
    GHOSTED_PURGE_LIMIT: 20,
    GHOSTED_REPUTATION_MAX: 0,
  },
  INACTIVITY: {
    LEVEL_0_DAYS: 3,
    LEVEL_1_DAYS: 7,
    LEVEL_2_DAYS: 14,
    LEVEL_3_DAYS: 21,
    LEVEL_4_DAYS: 30,
    LEVEL_5_DAYS: 30,
  },
};

export const REPUTATION_EFFECTS = {
  POST_CREATED: 3,
  LIKE_RECEIVED: 1,
  COMMENT_RECEIVED: 2,
  PUURGA_RECEIVED: 4,
  DAILY_ACTIVITY_STREAK: 5,
  PURGE_SURVIVED: 10,
  GHOST_RECOVERY: 25,
  PURGE_RECEIVED: -5,
  INACTIVITY_PER_DAY: -2,
  GHOST_PER_DAY: -3,
  REDEMPTION_FAILED: -10,
  SPAM_DETECTED: -15,
  MASS_PURGE_ABUSE: -20,
};

export const THREAT_FACTORS = {
  ENGAGEMENT_VELOCITY_MIN: 0,
  ENGAGEMENT_VELOCITY_MAX: 20,
  PURGE_ACTIVITY_MIN: 0,
  PURGE_ACTIVITY_MAX: 25,
  CONTROVERSIAL_INTERACTIONS_MIN: 0,
  CONTROVERSIAL_INTERACTIONS_MAX: 20,
  RAPID_INFLUENCE_GROWTH_MIN: 0,
  RAPID_INFLUENCE_GROWTH_MAX: 15,
};

export const THREAT_TIERS = [
  { min: 0, max: 20, label: 'LOW' },
  { min: 21, max: 40, label: 'RISING' },
  { min: 41, max: 60, label: 'DANGEROUS' },
  { min: 61, max: 80, label: 'HUNTED' },
  { min: 81, max: 100, label: 'LEGENDARY_THREAT' },
];

export const SURVIVAL_STATES = [
  'SAFE',
  'WARNING',
  'HUNTED',
  'COLLAPSING',
  'GHOSTED',
] as const;

export type SurvivalState = typeof SURVIVAL_STATES[number];

export const PURGE_TIERS = [
  { min: 0, max: 4, label: 'STABLE', visibilityDrop: 0 },
  { min: 5, max: 9, label: 'WATCHED', visibilityDrop: 10 },
  { min: 10, max: 14, label: 'HUNTED', visibilityDrop: 25 },
  { min: 15, max: 19, label: 'COLLAPSING', visibilityDrop: 50 },
  { min: 20, max: Infinity, label: 'GHOSTED', visibilityDrop: 80 },
] as const;

export type PurgeTierLabel = typeof PURGE_TIERS[number]['label'];

export const PURGE_RATE_LIMITS = {
  HOURLY_MAX: 5,
  DAILY_MAX: 20,
  SAME_POST_COOLDOWN_HOURS: 24,
};

export const PURGE_WEIGHTS = {
  LOW_REPUTATION: { max: 50, weight: 0.5 },
  NORMAL_REPUTATION: { max: 150, weight: 1.0 },
  HIGH_REPUTATION: { max: Infinity, weight: 1.5 },
  LEGENDARY_THREAT_THRESHOLD: 80,
  LEGENDARY_THREAT_WEIGHT: 2.0,
};

export const VISIBILITY = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 100,
  HIGH_MIN: 80,
  NORMAL_MIN: 50,
  LOW_MIN: 20,
};

export const EVENT_TYPES = {
  POST_CREATED: 'POST_CREATED',
  POST_PURGED: 'POST_PURGED',
  PURGE_RECEIVED: 'PURGE_RECEIVED',
  PURGE_SURVIVED: 'PURGE_SURVIVED',
  REPUTATION_GAIN: 'REPUTATION_GAIN',
  REPUTATION_LOSS: 'REPUTATION_LOSS',
  INACTIVITY_WARNING: 'INACTIVITY_WARNING',
  STATE_CHANGED: 'STATE_CHANGED',
  GHOST_ENTERED: 'GHOST_ENTERED',
  GHOST_EXITED: 'GHOST_EXITED',
  VISIBILITY_CHANGED: 'VISIBILITY_CHANGED',
  PURGE_PRESSURE_CHANGED: 'PURGE_PRESSURE_CHANGED',
  TIER_CHANGED: 'TIER_CHANGED',
  COLLAPSE_WARNING: 'COLLAPSE_WARNING',
} as const;

export type SurvivalEventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export const SOCIAL_RANKS = [
  { minRep: 0, rank: 'UNKNOWN' },
  { minRep: 50, rank: 'SURVIVOR' },
  { minRep: 150, rank: 'CONTENDER' },
  { minRep: 300, rank: 'WARRIOR' },
  { minRep: 500, rank: 'ELITE' },
  { minRep: 750, rank: 'LEGEND' },
  { minRep: 900, rank: 'IMMORTAL' },
];
