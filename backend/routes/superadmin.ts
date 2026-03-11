import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { supabaseAuth } from '../middleware/supabaseAuth';
import { superAdminAuth } from '../middleware/superAdminAuth';
import { logSuperAdminAction } from '../utils/auditLogger';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(supabaseAuth);
router.use(superAdminAuth);

/**
 * GET /api/admin/users
 * Returns paginated list of users with stats.
 */
router.get('/users', async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      role = 'all',
      startDate,
      endDate,
      minPosts,
      minPurges,
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Search by multiple fields
    // ... (rest of search logic)
    if (search) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
      if (isUUID) {
        query = query.eq('id', search);
      } else {
        query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
    }

    // Filter by status (ghosted/active)
    if (status === 'ghosted') {
      query = query.eq('is_ghost', true);
    } else if (status === 'active') {
      query = query.eq('is_ghost', false);
    }

    // Filter by Role
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Filter by Date Range
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Filter by Activity (New cached columns!)
    if (minPosts) {
      query = query.gte('posts_count', Number(minPosts));
    }
    if (minPurges) {
      query = query.gte('purges_count', Number(minPurges));
    }

    // Sort
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Paginate
    const { data: users, count, error } = await query.range(from, to);

    if (error) throw error;

    res.json({
      users: users || [],
      total: count,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Securely updates password for target user.
 */
router.post('/users/:id/reset-password', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Use admin client to update user password in auth.users
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: password
    });

    if (error) throw error;

    // Log the action
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'RESET_PASSWORD',
      targetId: id,
      targetType: 'user',
      details: { message: 'Password reset by Super Admin' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user info (status, role, profile data).
 */
router.put('/users/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, role, is_ghost, bio } = req.body;

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_ghost !== undefined) {
      updateData.is_ghost = is_ghost;
      if (is_ghost) {
        updateData.ghosted_at = new Date().toISOString();
      } else {
        updateData.ghosted_at = null;
      }
    }
    if (bio !== undefined) updateData.bio = bio;
    
    updateData.updated_at = new Date().toISOString();

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (profileError) throw profileError;

    // Also update 'users' table for consistency
    const { error: usersError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (usersError) {
      console.warn('⚠️ Could not update users table (might not exist), but profiles table updated.');
    }


    // Log the action
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'UPDATE_USER',
      targetId: id,
      targetType: 'user',
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/bulk-update
 * Updates multiple users at once.
 */
router.post('/users/bulk-update', async (req: any, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid user IDs array required' });
    }

    const { is_ghost, role } = updates;
    const finalUpdates: any = { updated_at: new Date().toISOString() };
    
    if (is_ghost !== undefined) {
      finalUpdates.is_ghost = is_ghost;
      finalUpdates.ghosted_at = is_ghost ? new Date().toISOString() : null;
    }
    if (role !== undefined) finalUpdates.role = role;

    const { error } = await supabase
      .from('profiles')
      .update(finalUpdates)
      .in('id', ids);

    if (error) throw error;

    // Log the action
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'BULK_UPDATE_USERS',
      targetId: 'multiple',
      targetType: 'user',
      details: { count: ids.length, fields: Object.keys(finalUpdates), userIds: ids },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: `Updated ${ids.length} users successfully` });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: error.message || 'Bulk update failed' });
  }
});

/**
 * POST /api/admin/users/bulk-reset-password
 * Resets passwords for multiple users.
 */
router.post('/users/bulk-reset-password', async (req: any, res) => {
  try {
    const { ids, password } = req.body;
    if (!Array.isArray(ids) || !password || password.length < 6) {
      return res.status(400).json({ error: 'Valid IDs and secure password required' });
    }

    // Auth updates must be done one by one via admin client
    const results = await Promise.all(
      ids.map(id => supabaseAdmin.auth.admin.updateUserById(id, { password }))
    );

    const failures = results.filter(r => r.error);
    
    // Log the action
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'BULK_RESET_PASSWORD',
      targetId: 'multiple',
      targetType: 'user',
      details: { count: ids.length, successCount: ids.length - failures.length, failureCount: failures.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ 
      success: failures.length === 0, 
      message: `Reset passwords for ${ids.length - failures.length} users. ${failures.length} failed.`,
      failures: failures.map(f => f.error?.message)
    });
  } catch (error: any) {
    console.error('Bulk password reset error:', error);
    res.status(500).json({ error: error.message || 'Bulk password reset failed' });
  }
});

/**
 * POST /api/admin/users/bulk-delete
 * Permanently deletes multiple users.
 */
router.post('/users/bulk-delete', async (req: any, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid user IDs array required' });
    }

    // 1. Delete from Auth (sequentially or parallel)
    await Promise.all(ids.map(id => supabaseAdmin.auth.admin.deleteUser(id)));

    // 2. Delete from profiles
    await supabase.from('profiles').delete().in('id', ids);

    // 3. Delete from users table
    await supabase.from('users').delete().in('id', ids);

    // Log the action
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'BULK_DELETE_USERS',
      targetId: 'multiple',
      targetType: 'user',
      details: { count: ids.length, userIds: ids },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: `Permanently deleted ${ids.length} users` });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: error.message || 'Bulk deletion failed' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently deletes a user from the system.
 */
router.delete('/users/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    // First delete from Auth metadata (this cascade deletes in most standard Supabase setups, but we do explicit to be safe)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
       console.warn('Auth deletion failed or user missing in auth:', authError.message);
       // We still proceed to clean up profiles and users tables
    }

    // Delete from profiles
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
    if (profileError) throw profileError;

    // Delete from users table if it exists
    await supabase.from('users').delete().eq('id', id);

    // Log the action
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'DELETE_USER',
      targetId: id,
      targetType: 'user',
      details: { deletedUserId: id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'User permanently deleted' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/logs
 * Returns recent audit logs for the Super Admin dashboard.
 */
router.get('/logs', async (req: any, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data: logs, count, error } = await supabase
      .from('superadmin_audit_logs')
      .select('*, profiles:superadmin_id(username, full_name, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      logs: logs || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/admin/error-logs
 * Returns system error logs for the dashboard.
 */
router.get('/error-logs', async (req: any, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data: logs, count, error } = await supabase
      .from('system_error_logs')
      .select('*, profiles:user_id(username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      logs: logs || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/admin/stats
 * Returns high-level system metrics.
 */
router.get('/stats', async (req: any, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    // Execute multiple counts in parallel for performance
    const [
      totalUsersResult,
      activeUsersResult,
      totalPostsResult,
      totalPurgesResult,
      newUsersTodayResult
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ghost', false),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('post_purges').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today)
    ]);

    // Check for errors
    if (totalUsersResult.error) throw totalUsersResult.error;
    if (activeUsersResult.error) throw activeUsersResult.error;
    if (totalPostsResult.error) throw totalPostsResult.error;
    if (totalPurgesResult.error) throw totalPurgesResult.error;
    if (newUsersTodayResult.error) throw newUsersTodayResult.error;

    // Fetch posts per day for the last 7 days for a chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentPosts, error: postsError } = await supabase
      .from('posts')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (postsError) throw postsError;

    // Process recent posts into counts per day
    const postsPerDay = new Array(7).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = (recentPosts || []).filter(p => p.created_at.startsWith(dateStr)).length;
      return { date: dateStr, count };
    }).reverse();

    res.json({
      totalUsers: totalUsersResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      totalPosts: totalPostsResult.count || 0,
      totalPurges: totalPurgesResult.count || 0,
      newUsersToday: newUsersTodayResult.count || 0,
      postsPerDay,
      health: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
