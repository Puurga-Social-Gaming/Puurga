import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { User, Profile } from '../models';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
  is_private: boolean;
  hide_from_suggestions: boolean;
  message_requests: 'everyone' | 'followers' | 'none';
  show_read_receipts: boolean;
  show_online_status: boolean;
  comment_privacy: 'everyone' | 'followers' | 'none';
  story_privacy: 'everyone' | 'followers' | 'close_friends';
  is_blocked: boolean;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

interface TokenClaims {
  sub?: string;
  email?: string;
  exp?: number;
  user_metadata?: Record<string, string | undefined>;
}

interface CachedAuth {
  user: AuthUser;
  expiresAt: number;
}

const AUTH_CACHE_TTL_MS = 60_000;
const authCache = new Map<string, CachedAuth>();

function isPlaceholderName(name?: string | null): boolean {
  if (!name?.trim()) return true;
  const n = name.trim().toLowerCase();
  return n === 'new user' || n === 'user' || n === 'unknown' || n === 'anonymous';
}

function isPlaceholderUsername(username?: string | null): boolean {
  if (!username?.trim()) return true;
  return /^user_[a-f0-9]{6,12}$/i.test(username.trim());
}

function pickName(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    if (typeof c === 'string' && !isPlaceholderName(c)) return c.trim();
  }
  return '';
}

function pickUsername(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    if (typeof c === 'string' && !isPlaceholderUsername(c)) {
      return c.trim().toLowerCase();
    }
  }
  return '';
}

function isTransientAuthError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  const status = (error as any)?.status;
  return (
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('socket') ||
    status === 0 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function decodeSupabaseToken(token: string): TokenClaims | null {
  const decoded = jwt.decode(token) as TokenClaims | null;
  if (!decoded?.sub) return null;
  if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
  return decoded;
}

function tryVerifyLocally(token: string): TokenClaims | null {
  const secrets = [
    process.env.SUPABASE_JWT_SECRET,
    process.env.JWT_SECRET,
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      const verified = jwt.verify(token, secret) as TokenClaims;
      if (verified?.sub) return verified;
    } catch {
      // try next secret
    }
  }
  return null;
}

async function getUserWithRetry(token: string, attempts = 2) {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await supabase.auth.getUser(token);
      if (!result.error) return result;
      lastError = result.error;
      if (!isTransientAuthError(result.error) || i === attempts - 1) {
        return result;
      }
    } catch (error) {
      lastError = error;
      if (!isTransientAuthError(error) || i === attempts - 1) {
        throw error;
      }
    }
    await new Promise((r) => setTimeout(r, 150 * (i + 1)));
  }
  return { data: { user: null }, error: lastError as any };
}

async function buildAuthUser(
  userId: string,
  email: string,
  meta: Record<string, string | undefined> = {}
): Promise<AuthUser> {
  let user: any = null;
  let profile: any = null;

  try {
    // Try to get user from local database first
    user = await User.findByPk(userId);
    
    if (!user) {
      // Fallback to Supabase profiles if local user not found
      console.warn(`supabaseAuth: Local user not found for ${userId}, checking Supabase`);
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        if (!isTransientAuthError(profileError)) {
          console.warn('supabaseAuth: profiles fetch error (non-fatal):', profileError.message);
        }
      } else {
        profile = data;
      }
    } else {
      // Get local profile if user exists
      try {
        profile = await Profile.findByPk(userId);
      } catch (profileError) {
        console.warn('supabaseAuth: Local profile fetch failed:', profileError);
      }
    }
  } catch (error) {
    console.warn('supabaseAuth: local database fetch threw (non-fatal):', error);
    
    // Fallback to Supabase
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileError) {
        profile = data;
      }
    } catch (fallbackError) {
      console.warn('supabaseAuth: Supabase fallback also failed:', fallbackError);
    }
  }

  let full_name =
    pickName(profile?.full_name, user?.name, meta.full_name, meta.name, email.split('@')[0]) ||
    email ||
    'User';

  let username =
    pickUsername(profile?.username, user?.username, meta.username, email.split('@')[0]) ||
    `user_${userId.slice(0, 8)}`;

  // Update local profile if it has placeholder data
  if (profile && (isPlaceholderName(profile.full_name) || isPlaceholderUsername(profile.username))) {
    const healed = {
      full_name,
      username,
      email: email.trim().toLowerCase() || profile.email || user?.email || null,
      updated_at: new Date(),
    };
    
    try {
      // Try to update local profile first
      if (profile instanceof Profile) {
        await profile.update(healed);
      } else {
        // Fallback to Supabase
        const { data: updated } = await supabase
          .from('profiles')
          .update(healed)
          .eq('id', userId)
          .select('full_name, username')
          .maybeSingle();
        if (updated) {
          full_name = updated.full_name || full_name;
          username = updated.username || username;
        }
      }
    } catch {
      // non-fatal
    }
  }

  return {
    id: userId,
    full_name,
    email,
    username,
    role: (user?.role || profile?.role as AuthUser['role']) || 'user',
    is_private: Boolean(user?.is_private ?? profile?.is_private ?? false),
    hide_from_suggestions: Boolean(user?.hide_from_suggestions ?? profile?.hide_from_suggestions ?? false),
    message_requests: (user?.message_requests || profile?.message_requests as AuthUser['message_requests']) || 'everyone',
    show_read_receipts: Boolean(user?.show_read_receipts ?? profile?.show_read_receipts ?? true),
    show_online_status: Boolean(user?.show_online_status ?? profile?.show_online_status ?? true),
    comment_privacy: (user?.comment_privacy || profile?.comment_privacy as AuthUser['comment_privacy']) || 'everyone',
    story_privacy: (user?.story_privacy || profile?.story_privacy as AuthUser['story_privacy']) || 'everyone',
    is_blocked: Boolean(user?.is_blocked ?? profile?.is_blocked ?? false),
  };
}

export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const cached = authCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      (req as AuthRequest).user = cached.user;
      return next();
    }

    // Prefer local JWT verification — avoids remote Auth round-trips
    let claims = tryVerifyLocally(token);

    if (!claims) {
      const { data: { user }, error } = await getUserWithRetry(token);

      if (user) {
        const authUser = await buildAuthUser(
          user.id,
          user.email ?? '',
          (user.user_metadata ?? {}) as Record<string, string | undefined>
        );
        authCache.set(token, { user: authUser, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
        (req as AuthRequest).user = authUser;
        return next();
      }

      if (error && isTransientAuthError(error)) {
        // Network blip: fall back to decoded (non-expired) Supabase JWT — same as WebSocket
        claims = decodeSupabaseToken(token);
        if (!claims?.sub) {
          console.warn('supabaseAuth: transient auth service error:', (error as any)?.message);
          return res.status(503).json({ message: 'Auth service temporarily unavailable' });
        }
        console.warn('supabaseAuth: using local JWT fallback after transient Auth error');
      } else {
        return res.status(401).json({ message: 'Invalid token' });
      }
    }

    const authUser = await buildAuthUser(
      claims.sub!,
      claims.email ?? '',
      claims.user_metadata ?? {}
    );
    authCache.set(token, { user: authUser, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
    (req as AuthRequest).user = authUser;
    next();
  } catch (error: any) {
    // Last resort: valid non-expired JWT structure
    const token = req.headers.authorization?.replace('Bearer ', '');
    const claims = token ? decodeSupabaseToken(token) : null;
    if (claims?.sub && isTransientAuthError(error)) {
      try {
        const authUser = await buildAuthUser(
          claims.sub,
          claims.email ?? '',
          claims.user_metadata ?? {}
        );
        authCache.set(token!, { user: authUser, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
        (req as AuthRequest).user = authUser;
        return next();
      } catch {
        // fall through
      }
      console.warn('supabaseAuth: transient auth error with JWT fallback failed');
      return res.status(503).json({ message: 'Auth service temporarily unavailable' });
    }

    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
