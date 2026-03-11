import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
// import { User } from '../models';

// Define the user interface
interface AuthUser {
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

// Extend Express Request type to include user
declare module 'express' {
  interface Request {
    user: AuthUser;
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string };
    
    // Fetch user data from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user data to request
    (req as AuthRequest).user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      role: user.role,
      is_private: user.is_private,
      hide_from_suggestions: user.hide_from_suggestions,
      message_requests: user.message_requests,
      show_read_receipts: user.show_read_receipts,
      show_online_status: user.show_online_status,
      comment_privacy: user.comment_privacy,
      story_privacy: user.story_privacy,
      is_blocked: user.is_blocked
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
}; 