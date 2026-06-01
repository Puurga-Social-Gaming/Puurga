import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from './supabaseAuth';

export const validateNotGhosted = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (req.user?.role === 'super_admin' || req.user?.role === 'superadmin') {
      return next();
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_ghost')
      .eq('id', userId)
      .single();

    if (profile?.is_ghost) {
      return res.status(403).json({
        error: 'Account is suspended',
        code: 'GHOST_SUSPENDED',
        message: 'Your account is currently suspended. You cannot perform this action while in ghost mode.',
      });
    }

    next();
  } catch (error) {
    console.error('Ghost restriction check error:', error);
    return res.status(500).json({ error: 'Internal server error during restriction check' });
  }
};
