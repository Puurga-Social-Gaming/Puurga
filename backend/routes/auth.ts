import express from 'express';
import { UserService } from '../services/userService';
import { auth } from '../middleware/auth';
import { normalizeImageUrl } from '../utils/url';
import { logSuperAdminAction } from '../utils/auditLogger';
import { CreditService } from '../services/creditService';
import { NotificationService } from '../services/notificationService';
import { progressionEngine } from '../services/progressionEngine';
import { DailyMissionService } from '../services/dailyMissionService';
import { User, Profile, Notification, Friendship } from '../models';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: email.trim().toLowerCase() },
          { username: username.trim().toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email.trim().toLowerCase() ? 'Email already exists' : 'Username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate user ID
    const userId = uuidv4();

    // Create user
    const user = await User.create({
      id: userId,
      name: full_name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'user',
      is_private: false,
      hide_from_suggestions: false,
      message_requests: 'everyone',
      show_read_receipts: true,
      show_online_status: true,
      comment_privacy: 'everyone',
      story_privacy: 'everyone',
      is_blocked: false
    });

    // Create profile
    await Profile.create({
      id: userId,
      full_name: full_name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      role: 'user',
      is_private: false,
      hide_from_suggestions: false,
      message_requests: 'everyone',
      show_read_receipts: true,
      show_online_status: true,
      comment_privacy: 'everyone',
      story_privacy: 'everyone',
      is_blocked: false
    });


    // Send welcome notification
    await NotificationService.welcome(userId);

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        full_name: user.name,
        email: user.email,
        username: user.username
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

    // Find user by email
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get profile
    const profile = await Profile.findByPk(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Notify friends that user has logged in
    try {
      // Get all accepted friendships where this user is involved
      const { Friendship } = require('../models');
      const friendships = await Friendship.findAll({
        where: {
          [require('sequelize').Op.or]: [
            { user_id: user.id },
            { friend_id: user.id }
          ],
          status: 'accepted'
        }
      });

      if (friendships && friendships.length > 0) {
        // Extract friend IDs (the other person in each friendship)
        const friendIds = friendships.map((f: any) =>
          f.user_id === user.id ? f.friend_id : f.user_id
        );

        // Create login notifications for all friends
        const notifications = friendIds.map((friendId: string) => ({
          receiver_id: friendId,
          sender_id: user.id,
          type: 'user_login',
          content: `${user.name} just logged in`,
          read: false,
          created_at: new Date()
        }));

        await Notification.bulkCreate(notifications);
        console.log(`Created ${notifications.length} login notifications for user ${user.name}`);
      }
    } catch (notifError) {
      // Don't fail login if notification creation fails
      console.error('Error creating login notifications:', notifError);
    }

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.name,
        email: user.email,
        username: user.username,
        role: user.role || 'user',
        avatar_url: normalizeImageUrl(user.avatar),
        is_private: user.is_private,
        hide_from_suggestions: user.hide_from_suggestions,
        message_requests: user.message_requests,
        show_read_receipts: user.show_read_receipts,
        show_online_status: user.show_online_status,
        comment_privacy: user.comment_privacy,
        story_privacy: user.story_privacy
      }
    });

    // Award daily login bonus
    const bonusAwarded = await CreditService.checkAndAwardDailyLoginBonus(user.id);
    
    // Emit progression event (XP for daily login)
    progressionEngine.safeEmit('UserLogin', {
      userId: user.id,
      isDailyBonus: bonusAwarded,
    });

    // Track daily mission progress
    DailyMissionService.trackProgress(user.id, 'daily_login').catch(() => {});
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const profile = await Profile.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    const userData = profile || user;

    res.json({
      id: userData.id,
      full_name: user.name || profile?.full_name,
      email: user.email,
      username: user.username,
      role: user.role || profile?.role || 'user',
      avatar_url: normalizeImageUrl(user.avatar || profile?.avatar_url),
      is_private: user.is_private || profile?.is_private,
      hide_from_suggestions: user.hide_from_suggestions || profile?.hide_from_suggestions,
      message_requests: user.message_requests || profile?.message_requests,
      show_read_receipts: user.show_read_receipts || profile?.show_read_receipts,
      show_online_status: user.show_online_status || profile?.show_online_status,
      comment_privacy: user.comment_privacy || profile?.comment_privacy,
      story_privacy: user.story_privacy || profile?.story_privacy
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
router.post('/logout', auth, async (req, res) => {
  try {
    // With JWT, logout is mainly client-side (removing token)
    // We could implement token blacklisting if needed
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

    // Find user by email
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      // For security, don't reveal whether email exists
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );

    // In a real implementation, you would send this via email
    // For now, we'll just return success
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
    console.log(`Reset link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);

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
router.post('/update-password', auth, async (req, res) => {
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

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    await User.update(
      { password: hashedPassword },
      { where: { id: req.user.id } }
    );

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

    // Find user by email
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.id, type: 'email_verification' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // In a real implementation, you would send this via email
    console.log(`Email verification token for ${user.email}: ${verificationToken}`);

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
router.post('/change-email', auth, async (req, res) => {
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
    const existingUser = await User.findOne({
      where: { email: newEmail.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Update user email
    await User.update(
      { email: newEmail.trim().toLowerCase() },
      { where: { id: req.user.id } }
    );

    // Update profile email
    await Profile.update(
      { email: newEmail.trim().toLowerCase() },
      { where: { id: req.user.id } }
    );

    res.json({ message: 'Email changed successfully' });
  } catch (error) {
    console.error('Email change error:', error);
    res.status(500).json({
      message: 'Error processing email change request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';
    const { targetId } = req.body;
    const userIdToDelete = (isSuperAdmin && targetId) ? targetId : req.user.id;

    if (!isSuperAdmin && targetId && targetId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Only super admins can delete other accounts' });
    }

    // Check target user's role before deletion
    const targetUser = await User.findByPk(userIdToDelete);

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
      User.destroy({ where: { id: userIdToDelete } }),
      Profile.destroy({ where: { id: userIdToDelete } })
    ]);

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

    // Find user by email
    const user = await User.findOne({
      where: { email: trimmedEmail }
    });

    // For security, don't reveal whether the email exists or not
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );

    // In a real implementation, you would send this via email
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
    console.log(`Reset link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);

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
    const { password, token } = req.body;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
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

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await User.update(
      { password: hashedPassword },
      { where: { id: decoded.userId } }
    );

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

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    // Get user info
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    res.json({
      message: 'Token is valid',
      user_id: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Error verifying token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Direct password reset (for accounts that need password set after migration)
router.post('/set-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email?.trim() || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.update(
      { password: hashedPassword },
      { where: { id: user.id } }
    );

    res.json({ message: 'Password set successfully' });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      message: 'Error setting password',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 