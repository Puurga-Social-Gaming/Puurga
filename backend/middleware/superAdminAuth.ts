import { Response, NextFunction } from 'express';
import { AuthRequest } from './supabaseAuth';

/**
 * Middleware to restrict access to super admins only.
 * Must be used AFTER supabaseAuth middleware.
 */
export const superAdminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'super_admin' && user.role !== 'superadmin') {
      console.warn(`Access denied for user ${user.id} with role ${user.role}`);
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Super Admin privileges required for this action' 
      });
    }

    next();
  } catch (error) {
    console.error('Super Admin Auth error:', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
  }
};
