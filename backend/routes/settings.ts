import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { superAdminAuth } from '../middleware/superAdminAuth';
import { logSuperAdminAction } from '../utils/auditLogger';

const router = express.Router();

// Middleware to check authentication
// Middleware to check authentication moved to middleware/supabaseAuth.ts

// Default settings based on user role
const getDefaultSettings = (role: string = 'user') => {
  const baseSettings = {
    // Privacy & Security
    dataCollection: true,
    analyticsTracking: false,
    crashReporting: true,

    // Notifications
    pushNotifications: true,
    emailNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,

    // Display & Accessibility
    darkMode: true,
    language: 'en',
    fontSize: 'medium',
    highContrast: false,

    // Content & Feed
    autoplayVideos: true,
    showSensitiveContent: false,
    dataUsage: 'standard'
  };

  // Admin-specific settings
  if (role === 'admin' || role === 'super_admin') {
    return {
      ...baseSettings,
      // Admin settings
      canModerate: true,
      canBanUsers: role === 'super_admin',
      canManageGroups: true,
      canViewAnalytics: true,
      canManageSettings: role === 'super_admin',
      adminNotifications: true,
      systemAlerts: true
    };
  }

  return baseSettings;
};

// GET /api/settings - Get user settings
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Try to get existing settings from database
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = getDefaultSettings(req.user?.role);
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          settings: defaultSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default settings:', insertError);
        return res.status(500).json({ error: 'Failed to create default settings' });
      }

      return res.json({
        settings: newSettings.settings,
        role: req.user?.role,
        lastUpdated: newSettings.updated_at
      });
    }

    // Return existing settings
    res.json({
      settings: settings.settings,
      role: req.user?.role,
      lastUpdated: settings.updated_at
    });

  } catch (error) {
    console.error('Error in GET /settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings - Update user settings
router.put('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { settings } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    // Validate settings based on user role
    const defaultSettings = getDefaultSettings(userRole);
    const validatedSettings = { ...defaultSettings };

    // Only allow settings that are appropriate for the user's role
    Object.keys(settings).forEach(key => {
      if (key in defaultSettings) {
        (validatedSettings as any)[key] = (settings as any)[key];
      }
    });

    // Update or insert settings
    const { data: updatedSettings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: validatedSettings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings.settings,
      lastUpdated: updatedSettings.updated_at
    });

  } catch (error) {
    console.error('Error in PUT /settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/global - Get global settings/rules (admin/super-admin only)
router.get('/global', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get global settings from database
    const { data: globalSettings, error } = await supabase
      .from('global_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching global settings:', error);
      return res.status(500).json({ error: 'Failed to fetch global settings' });
    }

    // If no global settings exist, create defaults
    if (!globalSettings) {
      const defaultGlobalSettings = {
        // Platform rules
        allowRegistration: true,
        requireEmailVerification: true,
        maxPostLength: 5000,
        maxCommentLength: 1000,

        // Content moderation
        enableContentModeration: true,
        autoModeratePosts: false,
        allowSensitiveContent: false,

        // User management
        maxFriendsPerUser: 1000,
        maxGroupsPerUser: 50,
        sessionTimeoutHours: 24,

        // Features
        enableGames: true,
        enableGroups: true,
        enableMessaging: true,
        enableNotifications: true,

        // Rate limiting
        maxPostsPerHour: 10,
        maxCommentsPerHour: 50,
        maxMessagesPerHour: 100
      };

      const { data: newGlobalSettings, error: insertError } = await supabase
        .from('global_settings')
        .insert({
          settings: defaultGlobalSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating global settings:', insertError);
        return res.status(500).json({ error: 'Failed to create global settings' });
      }

      return res.json({
        settings: newGlobalSettings.settings,
        lastUpdated: newGlobalSettings.updated_at
      });
    }

    res.json({
      settings: globalSettings.settings,
      lastUpdated: globalSettings.updated_at
    });

  } catch (error) {
    console.error('Error in GET /settings/global:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/global - Update global settings (super admin only)
router.put('/global', auth, superAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;

    await logSuperAdminAction({
      superadminId: req.user.id,
      action: 'UPDATE_GLOBAL_SETTINGS',
      details: { settings_updated: Object.keys(settings) },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid global settings data' });
    }

    // Update global settings
    const { data: updatedSettings, error } = await supabase
      .from('global_settings')
      .upsert({
        id: 1, // Always use ID 1 for global settings
        settings: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating global settings:', error);
      return res.status(500).json({ error: 'Failed to update global settings' });
    }

    res.json({
      message: 'Global settings updated successfully',
      settings: updatedSettings.settings,
      lastUpdated: updatedSettings.updated_at
    });

  } catch (error) {
    console.error('Error in PUT /settings/global:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/rules - Get platform rules for all users
router.get('/rules', async (req: Request, res: Response) => {
  try {
    // Get global settings
    const { data: globalSettings, error } = await supabase
      .from('global_settings')
      .select('settings')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching platform rules:', error);
      return res.status(500).json({ error: 'Failed to fetch platform rules' });
    }

    const rules = globalSettings?.settings || {
      allowRegistration: true,
      requireEmailVerification: true,
      maxPostLength: 5000,
      maxCommentLength: 1000,
      enableGames: true,
      enableGroups: true,
      enableMessaging: true,
      enableNotifications: true
    };

    res.json({ rules });

  } catch (error) {
    console.error('Error in GET /settings/rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
