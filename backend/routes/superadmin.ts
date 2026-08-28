import express from 'express';
import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { supabaseAuth } from '../middleware/supabaseAuth';
import { superAdminAuth } from '../middleware/superAdminAuth';
import { logSuperAdminAction } from '../utils/auditLogger';
import {
  CERTIFICATION_TYPES,
  getCertification,
} from '../constants/certifications';
import {
  listCertificationRequests,
  reviewCertificationRequest,
} from './certifications';
import {
  loadCertificationPricing,
  upsertCertificationPricing,
} from '../services/certificationPricing';
import { RDC_MOBILE_MONEY_NETWORKS } from '../constants/paymentMethods';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(supabaseAuth);
router.use(superAdminAuth);

/**
 * GET /api/admin/certifications
 * Catalog of certification types + prices for Super Admin UI.
 */
router.get('/certifications', (_req, res) => {
  res.json({ types: CERTIFICATION_TYPES, mobileMoneyNetworks: RDC_MOBILE_MONEY_NETWORKS });
});

/**
 * GET /api/admin/certification-pricing
 */
router.get('/certification-pricing', async (_req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const pricing = await loadCertificationPricing();
    const types = CERTIFICATION_TYPES.map((t) => {
      const p = pricing.find((row) => row.slug === t.slug);
      return {
        ...t,
        price: p?.price_points ?? t.price,
        price_points: p?.price_points ?? t.price,
        price_cdf: p?.price_cdf ?? 0,
        price_usd: p?.price_usd ?? 0,
        enabled: p?.enabled !== false,
      };
    });
    res.json({ pricing: types });
  } catch (error: any) {
    console.error('admin certification-pricing', error);
    res.status(500).json({ error: error.message || 'Failed to load pricing' });
  }
});

/**
 * PUT /api/admin/certification-pricing
 * body: { pricing: [{ slug, price_points, price_cdf, price_usd, enabled }] }
 */
router.put('/certification-pricing', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const rows = Array.isArray(req.body?.pricing) ? req.body.pricing : null;
    if (!rows?.length) {
      return res.status(400).json({ error: 'pricing array required' });
    }
    const allowed = new Set(CERTIFICATION_TYPES.map((t) => t.slug));
    const clean = rows
      .filter((r: any) => allowed.has(r.slug))
      .map((r: any) => ({
        slug: r.slug,
        price_points: Number(r.price_points),
        price_cdf: Number(r.price_cdf),
        price_usd: Number(r.price_usd),
        enabled: r.enabled !== false,
      }));

    const saved = await upsertCertificationPricing(clean, req.user.id);
    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'CERTIFICATION_PRICING_UPDATE',
      details: { count: clean.length },
    }).catch(() => null);

    res.json({ pricing: saved });
  } catch (error: any) {
    if (error?.code === 'CERT_PRICING_MIGRATION_REQUIRED') {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    console.error('admin certification-pricing save', error);
    res.status(500).json({ error: error.message || 'Failed to save pricing' });
  }
});

/**
 * GET /api/admin/certification-requests
 * Pending / filtered certification requests queue.
 */
router.get('/certification-requests', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const status = (req.query.status as string) || undefined;
    const requests = await listCertificationRequests(status);
    res.json({
      requests: requests.map((r: any) => ({
        ...r,
        certification: getCertification(r.certification_slug),
      })),
    });
  } catch (error: any) {
    if (/certification_requests|42P01/i.test(error.message || '')) {
      return res.status(503).json({
        error:
          'Certification requests table missing. Run migration 20260725_certification_requests.sql',
        code: 'CERT_REQUESTS_MIGRATION_REQUIRED',
      });
    }
    console.error('admin certification-requests', error);
    res.status(500).json({ error: error.message || 'Failed to load requests' });
  }
});

/**
 * POST /api/admin/certification-requests/:id/review
 * body: { action: 'approve' | 'reject', admin_note? }
 */
router.post('/certification-requests/:id/review', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { id } = req.params;
    const action = String(req.body?.action || '').trim();
    const adminNote =
      typeof req.body?.admin_note === 'string' ? req.body.admin_note.trim().slice(0, 500) : undefined;

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'action must be approve or reject' });
    }

    const updated = await reviewCertificationRequest({
      requestId: id,
      adminId: req.user.id,
      action,
      adminNote,
    });

    await logSuperAdminAction({
      superadminId: req.user.id,
      action: action === 'approve' ? 'CERTIFICATION_APPROVE' : 'CERTIFICATION_REJECT',
      targetId: updated.user_id,
      details: {
        requestId: id,
        certification_slug: updated.certification_slug,
        admin_note: adminNote || null,
      },
    }).catch(() => null);

    res.json({ request: updated });
  } catch (error: any) {
    const status = error.status || 500;
    if (error?.code === 'CERT_MIGRATION_REQUIRED') {
      return res.status(503).json({
        error: 'Certification columns missing. Run migration 20260725_user_certifications.sql',
        code: 'CERT_MIGRATION_REQUIRED',
      });
    }
    console.error('admin certification review', error);
    res.status(status).json({ error: error.message || 'Failed to review request' });
  }
});

/**
 * GET /api/admin/users
 * Returns paginated list of users with stats.
 */
router.get('/users', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
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

    let query = supabaseClient
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

    // Filter by status (ghosted/active/blocked)
    if (status === 'ghosted') {
      query = query.eq('is_ghost', true);
    } else if (status === 'active') {
      query = query.eq('is_ghost', false).eq('is_blocked', false);
    } else if (status === 'blocked') {
      query = query.eq('is_blocked', true);
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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { data: userData, error: fetchError } = await supabaseAdminClient.auth.admin.getUserById(id);
    if (fetchError || !userData?.user) {
      console.error('User not found in auth:', fetchError);
      return res.status(404).json({ error: 'User not found in authentication system. The user may have been created outside of the normal auth flow.' });
    }

    const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(id, {
      password: password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      throw updateError;
    }

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
 * POST /api/admin/users
 * Creates a new user account directly via Admin API.
 */
router.post('/users', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { email, password, full_name, username, role = 'user' } = req.body;

    if (!email?.trim() || !password || !full_name?.trim() || !username?.trim()) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      return res.status(400).json({ error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' });
    }

    const validRoles = ['user', 'admin', 'super_admin', 'moderator', 'business'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const { data: existing } = await supabaseClient
      .from('profiles')
      .select('id')
      .or(`username.eq.${normalizedEmail},email.eq.${normalizedEmail}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), username: normalizedUsername }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      console.error('Auth creation error:', authError);
      throw authError;
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create auth user' });
    }

    const userPayload = {
      id: authData.user.id,
      email: normalizedEmail,
      full_name: full_name.trim(),
      username: normalizedUsername,
      role: role,
      is_private: false,
      hide_from_suggestions: false,
      message_requests: 'everyone',
      show_read_receipts: true,
      show_online_status: true,
      comment_privacy: 'everyone',
      story_privacy: 'everyone',
      is_blocked: false
    };

    // Use upsert because the database trigger may have already created a profile row
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert(userPayload, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      // Don't delete auth user - the profile might have been created by a trigger
      return res.status(500).json({ error: 'Failed to update user profile: ' + profileError.message });
    }

    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'CREATE_USER',
      targetId: authData.user.id,
      targetType: 'user',
      details: { email: normalizedEmail, username: normalizedUsername, role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'User created successfully', user: { id: authData.user.id, email: userPayload.email, username: userPayload.username, role: userPayload.role } });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user info (status, role, profile data).
 */
router.put('/users/:id', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    console.log('🔧 PUT /users/:id called');
    console.log('🔧 Params:', req.params);
    console.log('🔧 Body:', req.body);
    console.log('🔧 User:', req.user);
    
    const { id } = req.params;
    const { email, username, full_name, role, is_ghost, is_blocked, bio, certification_slug, logo_certified } = req.body;

    const updateData: any = {};
    let authUpdateNeeded = false;
    const authUpdateData: any = {};

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updateData.email = email.trim().toLowerCase();
      authUpdateData.email = email.trim().toLowerCase();
      authUpdateNeeded = true;
    }

    if (username !== undefined) {
      updateData.username = username;
      authUpdateData.user_metadata = { ...authUpdateData.user_metadata, username: username };
      authUpdateNeeded = true;
    }

    if (full_name !== undefined) {
      updateData.full_name = full_name;
      authUpdateData.user_metadata = { ...authUpdateData.user_metadata, full_name: full_name };
      authUpdateNeeded = true;
    }

    if (role !== undefined) updateData.role = role;
    if (is_ghost !== undefined) {
      updateData.is_ghost = is_ghost;
      if (is_ghost) {
        updateData.ghosted_at = new Date().toISOString();
      } else {
        updateData.ghosted_at = null;
      }
    }
    if (is_blocked !== undefined) {
      updateData.is_blocked = Boolean(is_blocked);
    }
    if (bio !== undefined) updateData.bio = bio;

    // Certifications (Super Admin grant / revoke)
    const allowedChecks = ['blue', 'gold', 'business', 'elite'];
    if (certification_slug !== undefined) {
      if (certification_slug === null || certification_slug === '' || certification_slug === 'none') {
        updateData.certification_slug = null;
      } else if (allowedChecks.includes(String(certification_slug))) {
        updateData.certification_slug = certification_slug;
      } else {
        return res.status(400).json({ error: 'Invalid certification_slug' });
      }
    }
    if (logo_certified !== undefined) {
      updateData.logo_certified = Boolean(logo_certified);
    }
    if (certification_slug !== undefined || logo_certified !== undefined) {
      const granting =
        (certification_slug && certification_slug !== 'none' && certification_slug !== '') ||
        logo_certified === true;
      if (granting) {
        updateData.certified_at = new Date().toISOString();
        updateData.certified_by = req.user?.id || null;
      }
      // If both cleared, clear audit fields
      const nextSlug =
        certification_slug === undefined
          ? undefined
          : certification_slug === null || certification_slug === '' || certification_slug === 'none'
            ? null
            : certification_slug;
      const nextLogo = logo_certified === undefined ? undefined : Boolean(logo_certified);
      // Only clear certified_at when explicitly removing all
      if (nextSlug === null && nextLogo === false) {
        updateData.certified_at = null;
        updateData.certified_by = null;
      }
    }
    
    updateData.updated_at = new Date().toISOString();

    // Update auth if needed
    if (authUpdateNeeded) {
      try {
        const { data: authUser, error: fetchError } = await supabaseAdminClient.auth.admin.getUserById(id);
        if (fetchError || !authUser?.user) {
          console.warn('User not found in auth.users, skipping auth update:', id);
        } else {
          const { error: authError } = await supabaseAdminClient.auth.admin.updateUserById(id, authUpdateData);
          if (authError) {
            console.error('Error updating auth:', authError);
            return res.status(500).json({ error: 'Failed to update authentication record: ' + authError.message });
          }
        }
      } catch (e) {
        console.warn('Could not update auth:', e);
      }
    }

    // Update profiles table
    let { error: profileError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (profileError && /certification_slug|logo_certified|certified_at|certified_by|42703/i.test(profileError.message || '')) {
      return res.status(503).json({
        error: 'Certification columns missing. Run migration 20260725_user_certifications.sql',
        code: 'CERT_MIGRATION_REQUIRED',
        details: profileError.message,
      });
    }

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw profileError;
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
    console.error('❌ Error updating user:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:id/warn
 * Send an official admin warning notification to a user.
 */
router.post('/users/:id/warn', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { id } = req.params;
    const message =
      (typeof req.body?.message === 'string' && req.body.message.trim()) ||
      'You have received an official warning from Puurga Super Admin. Please review the community guidelines.';

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .eq('id', id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { NotificationService } = await import('../services/notificationService');
    await NotificationService.securityAlert(id, message, {
      source: 'super_admin',
      kind: 'admin_warning',
      adminId: req.user.id,
    });

    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'WARN_USER',
      targetId: id,
      targetType: 'user',
      details: { message, username: profile.username },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Warning sent' });
  } catch (error: any) {
    console.error('Warn user error:', error);
    res.status(500).json({ error: error.message || 'Failed to warn user' });
  }
});

/**
 * PUT /api/admin/users/:id/toggle-block
 * Toggle is_blocked on a user profile.
 */
router.put('/users/:id/toggle-block', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { id } = req.params;
    const { data: profile, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id, is_blocked, username')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nextBlocked = !Boolean(profile.is_blocked);
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ is_blocked: nextBlocked, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    await logSuperAdminAction({
      superadminId: req.user.id,
      action: nextBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetId: id,
      targetType: 'user',
      details: { username: profile.username, is_blocked: nextBlocked },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, is_blocked: nextBlocked });
  } catch (error: any) {
    console.error('Toggle block error:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle block' });
  }
});

/**
 * POST /api/admin/users/bulk-update
 * Updates multiple users at once.
 */
router.post('/users/bulk-update', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid user IDs array required' });
    }

    const { is_ghost, role, is_blocked } = updates;
    const finalUpdates: any = { updated_at: new Date().toISOString() };
    
    if (is_ghost !== undefined) {
      finalUpdates.is_ghost = is_ghost;
      finalUpdates.ghosted_at = is_ghost ? new Date().toISOString() : null;
    }
    if (role !== undefined) finalUpdates.role = role;
    if (is_blocked !== undefined) finalUpdates.is_blocked = Boolean(is_blocked);

    const { error } = await supabaseClient
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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { ids, password } = req.body;
    if (!Array.isArray(ids) || !password || password.length < 6) {
      return res.status(400).json({ error: 'Valid IDs and secure password required' });
    }

    // Auth updates must be done one by one via admin client
    const results = await Promise.all(
      ids.map(id => supabaseAdminClient.auth.admin.updateUserById(id, { password }))
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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Valid user IDs array required' });
    }

    // 1. Delete from Auth (sequentially or parallel)
    await Promise.all(ids.map(id => supabaseAdminClient.auth.admin.deleteUser(id)));

    // 2. Delete from profiles
    await supabaseClient.from('profiles').delete().in('id', ids);

    // 3. Delete from users table
    await supabaseClient.from('users').delete().in('id', ids);

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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { id } = req.params;

    // Check target user's role before deletion
    const { data: targetUser, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('role, full_name, username')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Prevent deletion of superadmin accounts
    if (targetUser && (targetUser.role === 'super_admin' || targetUser.role === 'superadmin')) {
      return res.status(403).json({ 
        error: 'Cannot delete superadmin account',
        message: 'Superadmin accounts cannot be deleted for security reasons.'
      });
    }

    // First delete from Auth metadata (this cascade deletes in most standard supabaseClient setups, but we do explicit to be safe)
    const { error: authError } = await supabaseAdminClient.auth.admin.deleteUser(id);
    if (authError) {
       console.warn('Auth deletion failed or user missing in auth:', authError.message);
       // We still proceed to clean up profiles and users tables
    }

    // Delete from profiles
    const { error: profileError } = await supabaseClient.from('profiles').delete().eq('id', id);
    if (profileError) throw profileError;

    // Delete from users table if it exists
    await supabaseClient.from('users').delete().eq('id', id);

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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { page = 1, limit = 50 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data: logs, count, error } = await supabaseClient
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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { page = 1, limit = 50 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data: logs, count, error } = await supabaseClient
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
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
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
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ghost', false),
      supabaseClient.from('posts').select('*', { count: 'exact', head: true }),
      supabaseClient.from('post_purges').select('*', { count: 'exact', head: true }),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today)
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
    
    const { data: recentPosts, error: postsError } = await supabaseClient
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

/** Soft count helper — returns 0 if table/column missing */
async function softCount(table: string, filters?: (q: any) => any): Promise<number> {
  try {
    const supabaseClient = requireSupabase();
    let q = supabaseClient.from(table).select('*', { count: 'exact', head: true });
    if (filters) q = filters(q);
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return String(iso).slice(0, 10);
}

function emptySeries(days: number): { date: string; label: string; users: number; posts: number; comments: number; messages: number; purges: number; reactions: number }[] {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    out.push({
      date,
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      users: 0,
      posts: 0,
      comments: 0,
      messages: 0,
      purges: 0,
      reactions: 0,
    });
  }
  return out;
}

function bump(map: Record<string, number>, key: string | null, n = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + n;
}

function toSortedPie(map: Record<string, number>, limit = 12) {
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * GET /api/admin/analytics?range=7d|30d|90d
 * Full platform analytics for Super Admin (dynamic, soft-fail missing tables).
 */
router.get('/analytics', async (req: any, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const rangeParam = String(req.query.range || '30d');
    const days = rangeParam === '7d' ? 7 : rangeParam === '90d' ? 90 : 30;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    const sinceIso = since.toISOString();

    const [
      totalUsers,
      activeUsers,
      ghostUsers,
      premiumUsers,
      totalPosts,
      totalComments,
      totalReactions,
      totalPurges,
      totalMessages,
      totalConversations,
      totalGroups,
      totalGroupMessages,
      gameSessions,
      gameChallenges,
      matchesMade,
      queueSize,
      creditTx,
    ] = await Promise.all([
      softCount('profiles'),
      softCount('profiles', (q) => q.eq('is_ghost', false)),
      softCount('profiles', (q) => q.eq('is_ghost', true)),
      softCount('profiles', (q) => q.eq('is_premium', true)),
      softCount('posts'),
      softCount('comments'),
      softCount('reactions'),
      softCount('post_purges'),
      softCount('messages'),
      softCount('conversations'),
      softCount('groups'),
      softCount('group_messages'),
      softCount('game_sessions'),
      softCount('game_challenges'),
      softCount('matches'),
      softCount('matchmaking_queue'),
      softCount('credit_transactions'),
    ]);

    // Profiles for demographics (paginate if large)
    let profiles: any[] = [];
    {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, created_at, location, country, gender, language, relationship, role, is_ghost, is_premium, posts_count, username, full_name, avatar_url')
        .limit(5000);
      if (error) {
        // Retry without optional demographic columns
        const retry = await supabaseClient
          .from('profiles')
          .select('id, created_at, location, language, relationship, role, is_ghost, posts_count, username, full_name, avatar_url')
          .limit(5000);
        profiles = retry.data || [];
      } else {
        profiles = data || [];
      }
    }

    const byCountry: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    const byRelationship: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    const usersByDay: Record<string, number> = {};

    for (const p of profiles) {
      const country =
        (typeof p.country === 'string' && p.country.trim()) ||
        (typeof p.location === 'string' && p.location.trim()) ||
        'Unknown';
      bump(byCountry, country);

      const gender =
        (typeof p.gender === 'string' && p.gender.trim()) || 'Not set';
      bump(byGender, gender);

      bump(byLanguage, (p.language && String(p.language).trim()) || 'Unknown');
      bump(byRelationship, (p.relationship && String(p.relationship).trim()) || 'Not set');
      bump(byRole, (p.role && String(p.role).trim()) || 'user');

      const dk = dayKey(p.created_at);
      if (dk && dk >= sinceIso.slice(0, 10)) bump(usersByDay, dk);
    }

    // Time-series raw rows
    const [
      postsRes,
      commentsRes,
      messagesRes,
      purgesRes,
      reactionsRes,
      challengesRes,
      sessionsRes,
    ] = await Promise.all([
      supabaseClient.from('posts').select('id, created_at, user_id').gte('created_at', sinceIso).limit(10000),
      supabaseClient.from('comments').select('id, created_at, post_id').gte('created_at', sinceIso).limit(10000),
      supabaseClient.from('messages').select('id, created_at').gte('created_at', sinceIso).limit(10000),
      supabaseClient.from('post_purges').select('id, created_at, post_id').gte('created_at', sinceIso).limit(10000),
      supabaseClient.from('reactions').select('id, created_at, post_id').gte('created_at', sinceIso).limit(10000),
      supabaseClient.from('game_challenges').select('id, game_id, game_title, status, created_at, stake').limit(2000),
      supabaseClient.from('game_sessions').select('id, game_id, status, created_at').limit(2000),
    ]);

    const series = emptySeries(days);
    const seriesIndex = new Map(series.map((s, i) => [s.date, i]));

    const applySeries = (rows: any[] | null | undefined, field: keyof (typeof series)[0]) => {
      if (!Array.isArray(rows)) return;
      for (const row of rows) {
        const dk = dayKey(row.created_at);
        if (!dk || !seriesIndex.has(dk)) continue;
        const idx = seriesIndex.get(dk)!;
        (series[idx] as any)[field] = ((series[idx] as any)[field] || 0) + 1;
      }
    };

    // Seed users from profiles map
    for (const s of series) {
      s.users = usersByDay[s.date] || 0;
    }
    applySeries(postsRes.data, 'posts');
    applySeries(commentsRes.data, 'comments');
    applySeries(messagesRes.data, 'messages');
    applySeries(purgesRes.data, 'purges');
    applySeries(reactionsRes.data, 'reactions');

    // Top posters from profiles posts_count
    const topPosters = [...profiles]
      .sort((a, b) => (b.posts_count || 0) - (a.posts_count || 0))
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        posts_count: p.posts_count || 0,
      }));

    // Comments / reactions per post (range)
    const commentsByPost: Record<string, number> = {};
    const reactionsByPost: Record<string, number> = {};
    const purgesByPost: Record<string, number> = {};
    (commentsRes.data || []).forEach((c: any) => bump(commentsByPost, c.post_id));
    (reactionsRes.data || []).forEach((r: any) => bump(reactionsByPost, r.post_id));
    (purgesRes.data || []).forEach((p: any) => bump(purgesByPost, p.post_id));

    const postsInRange = (postsRes.data || []).length;
    const commentsInRange = (commentsRes.data || []).length;
    const reactionsInRange = (reactionsRes.data || []).length;
    const purgesInRange = (purgesRes.data || []).length;

    const engagement = {
      avgCommentsPerPost: postsInRange ? +(commentsInRange / postsInRange).toFixed(2) : 0,
      avgReactionsPerPost: postsInRange ? +(reactionsInRange / postsInRange).toFixed(2) : 0,
      purgeRate: postsInRange ? +((purgesInRange / postsInRange) * 100).toFixed(1) : 0,
      postsInRange,
      commentsInRange,
      reactionsInRange,
      purgesInRange,
      mostCommentedPosts: toSortedPie(commentsByPost, 5).map((x) => ({ postId: x.name, comments: x.value })),
      mostPurgedPosts: toSortedPie(purgesByPost, 5).map((x) => ({ postId: x.name, purges: x.value })),
    };

    // Games breakdown
    const byGame: Record<string, number> = {};
    const challengeStatus: Record<string, number> = {};
    for (const c of challengesRes.data || []) {
      const label = c.game_title || c.game_id || 'Unknown game';
      bump(byGame, label);
      bump(challengeStatus, c.status || 'unknown');
    }
    for (const s of sessionsRes.data || []) {
      bump(byGame, s.game_id || 'Unknown game');
    }

    // Page / feature usage proxies (dynamic from live tables)
    const pageActivity = [
      { page: 'Home / Feed', metric: 'Posts', value: totalPosts },
      { page: 'Comments', metric: 'Comments', value: totalComments },
      { page: 'Messages', metric: 'DMs', value: totalMessages },
      { page: 'Groups', metric: 'Groups', value: totalGroups },
      { page: 'Group Chat', metric: 'Messages', value: totalGroupMessages },
      { page: 'Games', metric: 'Sessions', value: gameSessions },
      { page: 'Challenges', metric: 'Challenges', value: gameChallenges },
      { page: 'Matchmaking', metric: 'Matches', value: matchesMade },
      { page: 'Credits', metric: 'Transactions', value: creditTx },
      { page: 'Purges', metric: 'Purges', value: totalPurges },
    ].sort((a, b) => b.value - a.value);

    res.json({
      range: rangeParam,
      days,
      generatedAt: new Date().toISOString(),
      overview: {
        totalUsers,
        activeUsers,
        ghostUsers,
        premiumUsers,
        totalPosts,
        totalComments,
        totalReactions,
        totalPurges,
        totalMessages,
        totalConversations,
        totalGroups,
        totalGroupMessages,
        gameSessions,
        gameChallenges,
        matchesMade,
        queueSize,
        creditTx,
        newUsersInRange: Object.values(usersByDay).reduce((a, b) => a + b, 0),
      },
      series,
      demographics: {
        byCountry: toSortedPie(byCountry),
        byGender: toSortedPie(byGender),
        byLanguage: toSortedPie(byLanguage),
        byRelationship: toSortedPie(byRelationship),
        byRole: toSortedPie(byRole),
      },
      engagement,
      topPosters,
      games: {
        sessions: gameSessions,
        challenges: gameChallenges,
        matches: matchesMade,
        queueSize,
        byGame: toSortedPie(byGame),
        challengeStatus: toSortedPie(challengeStatus),
      },
      pageActivity,
    });
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
