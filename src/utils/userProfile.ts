import type { User as AppUser } from '../context/UserContext';

/** Detects placeholder display names created by broken signup/login fallbacks */
export function isPlaceholderName(name?: string | null): boolean {
  if (!name?.trim()) return true;
  const n = name.trim().toLowerCase();
  return n === 'new user' || n === 'user' || n === 'unknown' || n === 'anonymous';
}

/** Detects auto-generated usernames like user_56e7474e */
export function isPlaceholderUsername(username?: string | null): boolean {
  if (!username?.trim()) return true;
  return /^user_[a-f0-9]{6,12}$/i.test(username.trim());
}

export function resolveDisplayName(
  sources: {
    full_name?: string | null;
    name?: string | null;
    metadata?: Record<string, unknown> | null;
    email?: string | null;
  },
): string {
  const meta = sources.metadata ?? {};
  const candidates = [
    sources.full_name,
    sources.name,
    meta.full_name,
    meta.name,
    meta.fullName,
    sources.email?.split('@')[0],
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && !isPlaceholderName(value)) {
      return value.trim();
    }
  }

  return sources.email?.split('@')[0]?.trim() || 'User';
}

export function resolveUsername(
  sources: {
    username?: string | null;
    metadata?: Record<string, unknown> | null;
    email?: string | null;
    userId?: string;
  },
): string {
  const meta = sources.metadata ?? {};
  const candidates = [
    sources.username,
    meta.username,
    sources.email?.split('@')[0],
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && !isPlaceholderUsername(value)) {
      return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
    }
  }

  const seed = (sources.email?.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20);
  const suffix = (sources.userId || Math.random().toString(36).slice(2, 8)).slice(0, 6);
  return `${seed}_${suffix}`;
}

/** Normalize any profile / auth payload into the frontend User shape */
export function normalizeAppUser(
  raw: Record<string, unknown>,
  emailFallback?: string | null,
): AppUser {
  // Some endpoints serialize a Sequelize model instance directly, so the real
  // columns live under `dataValues` (alongside `_previousDataValues`, `uniqno`,
  // `_changed`, `_options`). Flatten first — otherwise the id lookup is
  // undefined, `user.id` becomes '' and ownership checks fail everywhere.
  const dataValues = raw?.dataValues as Record<string, unknown> | undefined;
  const src: Record<string, unknown> =
    dataValues && typeof dataValues === 'object' ? { ...dataValues, ...raw } : raw;

  const meta = (src.user_metadata as Record<string, unknown> | undefined) ?? {};
  const email =
    (src.email as string | undefined) ||
    emailFallback ||
    '';

  const name = resolveDisplayName({
    full_name: src.full_name as string | undefined,
    name: src.name as string | undefined,
    metadata: meta,
    email,
  });

  const username = resolveUsername({
    username: src.username as string | undefined,
    metadata: meta,
    email,
    userId: src.id as string | undefined,
  });

  const credits = Number(src.purga_points ?? src.credits ?? 0);

  return {
    id: String(src.id ?? ''),
    name,
    username,
    email,
    avatar: (src.avatar_url as string | null | undefined) ?? (src.avatar as string | null | undefined) ?? null,
    coverPhoto: (src.cover_photo as string | null | undefined) ?? (src.coverPhoto as string | null | undefined) ?? null,
    bio: (src.bio as string | undefined) ?? '',
    location: (src.location as string | undefined) ?? '',
    website: (src.website as string | undefined) ?? '',
    createdAt: (src.created_at as string | undefined) ?? (src.createdAt as string | undefined) ?? new Date().toISOString(),
    role: (src.role as AppUser['role']) ?? 'user',
    isBlocked: Boolean(src.is_blocked ?? false),
    isOnline: Boolean(src.isOnline ?? false),
    isFriend: Boolean(src.isFriend ?? false),
    occupation: (src.occupation as string | undefined) ?? '',
    education: (src.education as string | undefined) ?? '',
    relationship: (src.relationship as string | undefined) ?? '',
    isPrivate: Boolean(src.is_private ?? false),
    hideFromSuggestions: Boolean(src.hide_from_suggestions ?? false),
    messageRequests: (src.message_requests as AppUser['messageRequests']) ?? 'everyone',
    showReadReceipts: Boolean(src.show_read_receipts ?? true),
    showOnlineStatus: Boolean(src.show_online_status ?? true),
    commentPrivacy: (src.comment_privacy as AppUser['commentPrivacy']) ?? 'everyone',
    storyPrivacy: (src.story_privacy as AppUser['storyPrivacy']) ?? 'everyone',
    isVerified: Boolean(src.isVerified ?? false),
    joinDate: (src.joinDate as string | undefined) ?? (src.created_at as string | undefined),
    postCount: Number(src.postCount ?? 0),
    totalLikes: Number(src.totalLikes ?? 0),
    stats: (src.stats as AppUser['stats']) ?? {
      posts: 0,
      followers: 0,
      following: 0,
      puurgas: 0,
      purges: 0,
      credits,
    },
    credits,
    purga_points: credits,
    isGhost: Boolean(src.is_ghost ?? src.isGhost ?? false),
    purgeCount: Number(src.purge_count ?? src.purgeCount ?? 0),
    certificationSlug:
      (src.certificationSlug as string | null | undefined) ??
      (src.certification_slug as string | null | undefined) ??
      null,
    logoCertified: Boolean(src.logoCertified ?? src.logo_certified ?? false),
  };
}

export function needsProfileHeal(profile: {
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
} | null | undefined): boolean {
  if (!profile) return true;
  return (
    isPlaceholderName(profile.full_name ?? profile.name) ||
    isPlaceholderUsername(profile.username)
  );
}
