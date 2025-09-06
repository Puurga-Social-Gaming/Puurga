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

    // Get user profile from the database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: 'User profile not found' });
    }

    // Add user data to request
    (req as AuthRequest).user = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      username: profile.username,
      role: profile.role,
      is_private: profile.is_private,
      hide_from_suggestions: profile.hide_from_suggestions,
      message_requests: profile.message_requests,
      show_read_receipts: profile.show_read_receipts,
      show_online_status: profile.show_online_status,
      comment_privacy: profile.comment_privacy,
      story_privacy: profile.story_privacy,
      is_blocked: profile.is_blocked
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
}; 