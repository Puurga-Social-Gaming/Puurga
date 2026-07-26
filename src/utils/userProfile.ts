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
  const meta = (raw.user_metadata as Record<string, unknown> | undefined) ?? {};
  const email =
    (raw.email as string | undefined) ||
    emailFallback ||
    '';

  const name = resolveDisplayName({
    full_name: raw.full_name as string | undefined,
    name: raw.name as string | undefined,
    metadata: meta,
    email,
  });

  const username = resolveUsername({
    username: raw.username as string | undefined,
    metadata: meta,
    email,
    userId: raw.id as string | undefined,
  });

  const credits = Number(raw.purga_points ?? raw.credits ?? 0);

  return {
    id: String(raw.id ?? ''),
    name,
    username,
    email,
    avatar: (raw.avatar_url as string | null | undefined) ?? (raw.avatar as string | null | undefined) ?? null,
    coverPhoto: (raw.cover_photo as string | null | undefined) ?? (raw.coverPhoto as string | null | undefined) ?? null,
    bio: (raw.bio as string | undefined) ?? '',
    location: (raw.location as string | undefined) ?? '',
    website: (raw.website as string | undefined) ?? '',
    createdAt: (raw.created_at as string | undefined) ?? (raw.createdAt as string | undefined) ?? new Date().toISOString(),
    role: (raw.role as AppUser['role']) ?? 'user',
    isBlocked: Boolean(raw.is_blocked ?? false),
    isOnline: Boolean(raw.isOnline ?? false),
    isFriend: Boolean(raw.isFriend ?? false),
    occupation: (raw.occupation as string | undefined) ?? '',
    education: (raw.education as string | undefined) ?? '',
    relationship: (raw.relationship as string | undefined) ?? '',
    isPrivate: Boolean(raw.is_private ?? false),
    hideFromSuggestions: Boolean(raw.hide_from_suggestions ?? false),
    messageRequests: (raw.message_requests as AppUser['messageRequests']) ?? 'everyone',
    showReadReceipts: Boolean(raw.show_read_receipts ?? true),
    showOnlineStatus: Boolean(raw.show_online_status ?? true),
    commentPrivacy: (raw.comment_privacy as AppUser['commentPrivacy']) ?? 'everyone',
    storyPrivacy: (raw.story_privacy as AppUser['storyPrivacy']) ?? 'everyone',
    isVerified: Boolean(raw.isVerified ?? false),
    joinDate: (raw.joinDate as string | undefined) ?? (raw.created_at as string | undefined),
    postCount: Number(raw.postCount ?? 0),
    totalLikes: Number(raw.totalLikes ?? 0),
    stats: (raw.stats as AppUser['stats']) ?? {
      posts: 0,
      followers: 0,
      following: 0,
      puurgas: 0,
      purges: 0,
      credits,
    },
    credits,
    purga_points: credits,
    isGhost: Boolean(raw.is_ghost ?? raw.isGhost ?? false),
    purgeCount: Number(raw.purge_count ?? raw.purgeCount ?? 0),
    certificationSlug:
      (raw.certificationSlug as string | null | undefined) ??
      (raw.certification_slug as string | null | undefined) ??
      null,
    logoCertified: Boolean(raw.logoCertified ?? raw.logo_certified ?? false),
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
