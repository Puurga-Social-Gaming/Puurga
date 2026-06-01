import express from 'express';
import { UserService } from '../services/userService';
import { supabase } from '../config/supabase';
import { supabaseAuth } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { logSuperAdminAction } from '../utils/auditLogger';
import { CreditService } from '../services/creditService';
import { NotificationService } from '../services/notificationService';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, username } = req.body;

    // Validate input
    if (!full_name?.trim() || !email?.trim() || !password || !username?.trim()) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password - only check minimum length, allow all special characters
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if email or username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return res.status(500).json({ message: 'Error checking existing user' });
    }

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists'
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name,
          username
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return res.status(400).json({ message: 'Error creating user account' });
    }

    if (!authData.user) {
      return res.status(400).json({ message: 'Failed to create user account' });
    }

    // Create user profile in both 'users' and 'profiles' to be safe
    const userPayload = {
      id: authData.user.id,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      username: username.trim().toLowerCase(),
      role: 'user',
      is_private: false,
      hide_from_suggestions: false,
      message_requests: 'everyone',
      show_read_receipts: true,
      show_online_status: true,
      comment_privacy: 'everyone',
      story_privacy: 'everyone',
      is_blocked: false
    };

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert(userPayload)
      .select()
      .single();

    // Also try inserting into 'profiles' table
    await supabase.from('profiles').insert(userPayload).select().single();


    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Try to clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ message: 'Error creating user profile' });
    }

    // Send welcome notification
    await NotificationService.welcome(profile.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        username: profile.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Error during registration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (authError) {
      console.error('Login error:', authError);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!authData.session) {
      return res.status(401).json({ message: 'No session created' });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return res.status(401).json({ message: 'User profile not found' });
    }

    // Notify friends that user has logged in
    try {
      // Get all accepted friendships where this user is involved
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${authData.user.id},friend_id.eq.${authData.user.id}`)
        .eq('status', 'accepted');

      if (friendships && friendships.length > 0) {
        // Extract friend IDs (the other person in each friendship)
        const friendIds = friendships.map(f =>
          f.user_id === authData.user.id ? f.friend_id : f.user_id
        );

        // Create login notifications for all friends
        const notifications = friendIds.map(friendId => ({
          type: 'user_login',
          sender_id: authData.user.id,
          receiver_id: friendId,
          title: 'Friend Online',
          message: `${profile.full_name} just logged in`,
          is_read: false,
          created_at: new Date().toISOString(),
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`Created ${notifications.length} login notifications for user ${profile.full_name}`);
      }
    } catch (notifError) {
      // Don't fail login if notification creation fails
      console.error('Error creating login notifications:', notifError);
    }

    res.json({
      token: authData.session.access_token,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        username: profile.username,
        role: profile.role || 'user',
        avatar_url: normalizeImageUrl(profile.avatar_url),
        is_private: profile.is_private,
        hide_from_suggestions: profile.hide_from_suggestions,
        message_requests: profile.message_requests,
        show_read_receipts: profile.show_read_receipts,
        show_online_status: profile.show_online_status,
        comment_privacy: profile.comment_privacy,
        story_privacy: profile.story_privacy
      }
    });

    // Award daily login bonus
    await CreditService.checkAndAwardDailyLoginBonus(authData.user.id);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current user
router.get('/me', supabaseAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.json({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      username: profile.username,
      role: profile.role || 'user',
      avatar_url: normalizeImageUrl(profile.avatar_url),
      is_private: profile.is_private,
      hide_from_suggestions: profile.hide_from_suggestions,
      message_requests: profile.message_requests,
      show_read_receipts: profile.show_read_receipts,
      show_online_status: profile.show_online_status,
      comment_privacy: profile.comment_privacy,
      story_privacy: profile.story_privacy
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Error fetching user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Logout
router.post('/logout', supabaseAuth, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Error during logout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Request password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ message: 'Error sending password reset email' });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      message: 'Error processing password reset request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update password (after reset)
router.post('/update-password', supabaseAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    // Validate password - only check minimum length, allow all special characters
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error('Password update error:', error);
      return res.status(400).json({ message: 'Error updating password' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      message: 'Error updating password',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Request email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });

    if (error) {
      console.error('Email verification error:', error);
      return res.status(400).json({ message: 'Error sending verification email' });
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Email verification request error:', error);
    res.status(500).json({
      message: 'Error processing email verification request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Change email
router.post('/change-email', supabaseAuth, async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail?.trim()) {
      return res.status(400).json({ message: 'New email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already in use
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', newEmail.trim().toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim().toLowerCase()
    });

    if (error) {
      console.error('Email change error:', error);
      return res.status(400).json({ message: 'Error changing email' });
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('users')
      .update({ email: newEmail.trim().toLowerCase() })
      .eq('id', req.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return res.status(400).json({ message: 'Error updating user profile' });
    }

    res.json({ message: 'Email change request sent. Please check your new email for verification.' });
  } catch (error) {
    console.error('Email change error:', error);
    res.status(500).json({
      message: 'Error processing email change request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete account
router.delete('/delete-account', supabaseAuth, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';
    const { targetId } = req.body;
    const userIdToDelete = (isSuperAdmin && targetId) ? targetId : req.user.id;

    if (!isSuperAdmin && targetId && targetId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Only super admins can delete other accounts' });
    }

    // Check target user's role before deletion
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userIdToDelete)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Prevent self-deletion of superadmin accounts
    if (targetUser && (targetUser.role === 'super_admin' || targetUser.role === 'superadmin')) {
      return res.status(403).json({ 
        message: 'Cannot delete superadmin account for security reasons'
      });
    }

    if (isSuperAdmin && targetId && targetId !== req.user.id) {
      await logSuperAdminAction({
        superadminId: req.user.id,
        action: 'DELETE_USER_BYPASS',
        targetId: targetId,
        targetType: 'user',
        details: { reason: 'Super Admin deletion request' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Delete user profile (from both tables to be safe)
    await Promise.all([
      supabase.from('users').delete().eq('id', userIdToDelete),
      supabase.from('profiles').delete().eq('id', userIdToDelete)
    ]);

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userIdToDelete);
    if (authError) {
      console.error('Auth user deletion error:', authError);
      return res.status(400).json({ message: 'Error deleting auth user' });
    }

    res.json({ message: `Account ${userIdToDelete} deleted successfully` });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      message: 'Error deleting account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Request password reset (sends email)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Use Supabase's built-in password reset functionality
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
    });

    // For security, don't reveal whether the email exists or not
    if (error) {
      console.warn('Password reset request for email:', trimmedEmail, 'Error:', error.message);
      // Still return success to prevent email enumeration attacks
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    res.json({
      message: 'Password reset link has been sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Error processing password reset request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset password (called from frontend after user clicks email link)
router.post('/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const { user } = req as any; // This comes from session set by email link

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - Invalid session' });
    }

    if (!password?.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Validate password - only check minimum length, allow all special characters
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Update password via Supabase
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ message: 'Error resetting password' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Error resetting password',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify password reset token (optional - for additional verification)
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify the token by attempting to exchange it
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (error || !data.user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({
      message: 'Token is valid',
      user_id: data.user.id,
      email: data.user.email
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Error verifying token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 