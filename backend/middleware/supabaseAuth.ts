import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'super_admin' | 'business';
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

    // Try to fetch canonical profile from 'profiles'
    const [{ data: prof, error: profErr }, { data: usersRow, error: usersErr }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username').eq('id', user.id).maybeSingle(),
      supabase.from('users').select('*').eq('id', user.id).maybeSingle()
    ]);

    if (profErr) {
      // Non-fatal; continue with users table or auth user metadata
      console.warn('supabaseAuth: profiles fetch error (non-fatal):', profErr.message);
    }
    if (usersErr) {
      // Non-fatal as well
      console.warn('supabaseAuth: users fetch error (non-fatal):', usersErr.message);
    }

    // Merge data with sensible defaults
    const full_name = (prof?.full_name as string) || (usersRow?.full_name as string) || (user.user_metadata?.full_name as string) || (user.email ?? '');
    const username = (prof?.username as string) || (usersRow?.username as string) || (user.user_metadata?.username as string) || (user.email?.split('@')[0] ?? 'user');
    const email = (usersRow?.email as string) || (user.email ?? '');

    const role = (usersRow?.role as AuthUser['role']) || 'user';
    const is_private = Boolean(usersRow?.is_private);
    const hide_from_suggestions = Boolean(usersRow?.hide_from_suggestions);
    const message_requests = (usersRow?.message_requests as AuthUser['message_requests']) || 'everyone';
    const show_read_receipts = Boolean(usersRow?.show_read_receipts);
    const show_online_status = Boolean(usersRow?.show_online_status);
    const comment_privacy = (usersRow?.comment_privacy as AuthUser['comment_privacy']) || 'everyone';
    const story_privacy = (usersRow?.story_privacy as AuthUser['story_privacy']) || 'everyone';
    const is_blocked = Boolean(usersRow?.is_blocked);

    // Add user data to request (never 401 just because rows are missing; use defaults)
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