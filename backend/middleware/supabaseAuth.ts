import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

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

export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Fetch profile data from 'profiles' table only
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      // Log but don't fail - we can use defaults
      console.warn('supabaseAuth: profiles fetch error (non-fatal):', profileError.message);
    }

    // Merge data with sensible defaults from profile or auth user
    const full_name = (profile?.full_name as string) || (user.user_metadata?.full_name as string) || (user.email ?? '');
    const username = (profile?.username as string) || (user.user_metadata?.username as string) || (user.email?.split('@')[0] ?? 'user');
    const email = user.email ?? '';

    // Get settings from profile table with defaults
    const role = (profile?.role as AuthUser['role']) || 'user';
    const is_private = Boolean(profile?.is_private ?? false);
    const hide_from_suggestions = Boolean(profile?.hide_from_suggestions ?? false);
    const message_requests = (profile?.message_requests as AuthUser['message_requests']) || 'everyone';
    const show_read_receipts = Boolean(profile?.show_read_receipts ?? true);
    const show_online_status = Boolean(profile?.show_online_status ?? true);
    const comment_privacy = (profile?.comment_privacy as AuthUser['comment_privacy']) || 'everyone';
    const story_privacy = (profile?.story_privacy as AuthUser['story_privacy']) || 'everyone';
    const is_blocked = Boolean(profile?.is_blocked ?? false);

    // Add user data to request (never 401 just because profile is missing; use defaults)
    (req as AuthRequest).user = {
      id: user.id,
      full_name,
      email,
      username,
      role,
      is_private,
      hide_from_suggestions,
      message_requests,
      show_read_receipts,
      show_online_status,
      comment_privacy,
      story_privacy,
      is_blocked
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};