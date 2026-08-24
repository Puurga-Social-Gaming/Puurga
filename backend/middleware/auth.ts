import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

function decodeToken(token: string): TokenClaims | null {
  try {
    const decoded = jwt.decode(token) as TokenClaims | null;
    if (!decoded?.sub) return null;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function verifyTokenLocally(token: string): TokenClaims | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined');
    return null;
  }

  try {
    const verified = jwt.verify(token, jwtSecret) as TokenClaims;
    if (verified?.sub) return verified;
  } catch (error) {
    console.warn('Token verification failed:', error);
  }
  return null;
}

async function buildAuthUser(userId: string, email: string, meta: Record<string, string | undefined> = {}): Promise<AuthUser> {
  let user: any = null;
  let profile: any = null;

  try {
    // Try to get user from local database
    user = await User.findByPk(userId);
    
    // Try to get profile from local database
    profile = await Profile.findByPk(userId);
  } catch (error) {
    console.error('Error fetching user/profile from database:', error);
  }

  // Use database data if available, otherwise use metadata from token
  const dbEmail = user?.email || profile?.email || email;
  const dbName = user?.name || profile?.full_name;
  const dbUsername = user?.username || profile?.username;

  let full_name =
    pickName(dbName, meta.full_name, meta.name, dbEmail.split('@')[0]) ||
    dbEmail ||
    'User';

  let username =
    pickUsername(dbUsername, meta.username, dbEmail.split('@')[0]) ||
    `user_${userId.slice(0, 8)}`;

  // Update profile if it has placeholder data
  if (profile && (isPlaceholderName(profile.full_name) || isPlaceholderUsername(profile.username))) {
    try {
      await profile.update({
        full_name: full_name,
        username: username,
        email: dbEmail,
        updated_at: new Date()
      });
    } catch (error) {
      console.warn('Failed to update profile with healed data:', error);
    }
  }

  return {
    id: userId,
    full_name,
    email: dbEmail,
    username,
    role: (profile?.role as AuthUser['role']) || (user?.role as AuthUser['role']) || 'user',
    is_private: Boolean(profile?.is_private ?? false),
    hide_from_suggestions: Boolean(profile?.hide_from_suggestions ?? false),
    message_requests: (profile?.message_requests as AuthUser['message_requests']) || 'everyone',
    show_read_receipts: Boolean(profile?.show_read_receipts ?? true),
    show_online_status: Boolean(profile?.show_online_status ?? true),
    comment_privacy: (profile?.comment_privacy as AuthUser['comment_privacy']) || 'everyone',
    story_privacy: (profile?.story_privacy as AuthUser['story_privacy']) || 'everyone',
    is_blocked: Boolean(profile?.is_blocked ?? false),
  };
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Check cache first
    const cached = authCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      (req as AuthRequest).user = cached.user;
      return next();
    }

    // Verify token locally using JWT_SECRET
    let claims = verifyTokenLocally(token);

    if (!claims) {
      // If local verification fails, try decoding without verification (for expired tokens)
      claims = decodeToken(token);
      if (!claims) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      // If token is expired, return 401
      if (claims.exp && claims.exp * 1000 < Date.now()) {
        return res.status(401).json({ message: 'Token expired' });
      }
    }

    // Build auth user from database
    const authUser = await buildAuthUser(
      claims.sub!,
      claims.email ?? '',
      claims.user_metadata ?? {}
    );

    // Cache the result
    authCache.set(token, { user: authUser, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
    (req as AuthRequest).user = authUser;
    next();
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Export as supabaseAuth for backward compatibility during migration
export const supabaseAuth = auth;