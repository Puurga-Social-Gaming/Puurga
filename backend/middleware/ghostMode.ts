import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from './supabaseAuth';
import { PURGE_THRESHOLD } from '../constants/purgeConstants';

export const checkGhostMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user is in ghost mode
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, ghosted_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking ghost mode:', error);
      return next();
    }

    // Super admins bypass ghost mode checks
    if (req.user?.role === 'super_admin' || req.user?.role === 'superadmin') {
      return next();
    }

    if (profile?.is_ghost) {

      return res.status(403).json({ 
        error: 'Account is in ghost mode',
        ghostMode: true,
        purgeCount: profile.purge_count,
        ghostedAt: profile.ghosted_at,
        message: `Your account has been frozen due to receiving ${PURGE_THRESHOLD}+ purges. You need to be redeemed by another user with credits to restore your account.`
      });
    }

    next();
  } catch (error) {
    console.error('Ghost mode check error:', error);
    next();
  }
};
