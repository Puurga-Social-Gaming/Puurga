import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Bell, Shield, Eye, Globe, Moon, Sun, Loader2 } from 'lucide-react';
import Button from '../../components/ui/Button';

import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import api from '../../lib/axios';
import { useFontSizeStore, type FontSizeOption } from '../../store/fontSizeStore';

interface SettingsState {
  dataCollection: boolean;
  analyticsTracking: boolean;
  crashReporting: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  language: string;
  fontSize: string;
  highContrast: boolean;
  autoplayVideos: boolean;
  showSensitiveContent: boolean;
  dataUsage: string;
  // Optional admin fields
  canModerate?: boolean;
  canBanUsers?: boolean;
  canManageGroups?: boolean;
  canViewAnalytics?: boolean;
  canManageSettings?: boolean;
  adminNotifications?: boolean;
  systemAlerts?: boolean;
}

// Visual Text Size Selector
const TEXT_SIZE_OPTIONS: { value: FontSizeOption; label: string; sampleSize: string }[] = [
  { value: 'small', label: 'Small', sampleSize: 'text-xs' },
  { value: 'medium', label: 'Medium', sampleSize: 'text-sm' },
  { value: 'large', label: 'Large', sampleSize: 'text-base' },
];

const TextSizeSelector: React.FC = () => {
  const { fontSize, setFontSize } = useFontSizeStore();

  return (
    <div className="space-y-2">
      <div className="flex gap-1 bg-background-secondary rounded-lg p-1 border border-border">
        {TEXT_SIZE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFontSize(opt.value)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-2 rounded-md transition-all duration-200 ${
              fontSize === opt.value
                ? 'bg-accent text-white shadow-theme-sm'
                : 'text-muted hover:text-foreground hover:bg-card-hover'
            }`}
          >
            <span className={`font-bold leading-none ${opt.sampleSize}`}>A</span>
            <span className="text-[10px] leading-none">{opt.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Preview: <span className="text-foreground">This is how your text will look.</span>
      </p>
    </div>
  );
};

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appSettings, setAppSettings] = useState<SettingsState>({
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
  });

  // Load settings from backend on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        const response = await api.get('/settings');
        const serverSettings = response.data.settings;

        // Update local state with server settings
        setAppSettings(prev => ({
          ...prev,
          ...serverSettings
        }));

        // Update theme if different
        if (serverSettings.darkMode !== undefined && serverSettings.darkMode !== (theme === 'dark')) {
          if (serverSettings.darkMode && theme !== 'dark') {
            toggleTheme();
          } else if (!serverSettings.darkMode && theme === 'dark') {
            toggleTheme();
          }
        }

      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, theme, toggleTheme]);

  // Add admin-specific settings to state if user is admin
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      setAppSettings(prev => ({
        ...prev,
        // Admin settings
        canModerate: true,
        canBanUsers: user?.role === 'super_admin',
        canManageGroups: true,
        canViewAnalytics: true,
        canManageSettings: user?.role === 'super_admin',
        adminNotifications: true,
        systemAlerts: true
      }));
    }
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted">Loading settings...</p>
        </motion.div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setAppSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Save settings to backend
      await api.put('/settings', { settings: appSettings });

      // Also update localStorage as backup
      localStorage.setItem('appSettings', JSON.stringify(appSettings));

      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto py-8 px-4"
      >
        <h1 className="text-lg font-bold text-foreground mb-6">App Settings</h1>
        <p className="text-muted text-sm mb-6">Manage your app preferences, privacy, and notification settings.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Theme Toggle */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
            <div className="flex items-center gap-2 mb-4">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-accent" />
              ) : (
                <Sun className="w-5 h-5 text-accent" />
              )}
              <h2 className="text-base font-semibold text-foreground">Appearance</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Theme</label>
                <p className="text-xs text-muted">Switch between light and dark mode</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const newTheme = theme === 'dark' ? 'light' : 'dark';
                  toggleTheme();

                  // Update settings state
                  setAppSettings(prev => ({
                    ...prev,
                    darkMode: newTheme === 'dark'
                  }));

                  // Save to backend
                  try {
                    await api.put('/settings', {
                      settings: { ...appSettings, darkMode: newTheme === 'dark' }
                    });
                  } catch (error) {
                    console.error('Error updating theme setting:', error);
                  }
                }}
                className="relative inline-flex h-10 w-20 items-center rounded-full bg-background-secondary border border-border shadow-theme-sm transition-colors hover:bg-card-hover btn-float"
              >
                <span className="sr-only">Toggle theme</span>
                <span
                  className={`inline-flex h-8 w-8 transform items-center justify-center rounded-full bg-accent shadow-theme-button transition-transform duration-200 ${theme === 'dark' ? 'translate-x-10' : 'translate-x-1'
                    }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-white" />
                  ) : (
                    <Sun className="h-4 w-4 text-white" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Privacy & Security</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Data Collection</label>
                  <p className="text-xs text-muted">Allow app to collect usage data for improvements</p>
                </div>
                <input
                  type="checkbox"
                  name="dataCollection"
                  checked={appSettings.dataCollection}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Analytics Tracking</label>
                  <p className="text-xs text-muted">Help improve the app with anonymous analytics</p>
                </div>
                <input
                  type="checkbox"
                  name="analyticsTracking"
                  checked={appSettings.analyticsTracking}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Crash Reporting</label>
                  <p className="text-xs text-muted">Automatically send crash reports to help fix bugs</p>
                </div>
                <input
                  type="checkbox"
                  name="crashReporting"
                  checked={appSettings.crashReporting}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Push Notifications</label>
                  <p className="text-xs text-muted">Receive notifications on your device</p>
                </div>
                <input
                  type="checkbox"
                  name="pushNotifications"
                  checked={appSettings.pushNotifications}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Email Notifications</label>
                  <p className="text-xs text-muted">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={appSettings.emailNotifications}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Sound</label>
                  <p className="text-xs text-muted">Play sounds for notifications</p>
                </div>
                <input
                  type="checkbox"
                  name="soundEnabled"
                  checked={appSettings.soundEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Display & Accessibility */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Display & Accessibility</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                <select
                  name="language"
                  value={appSettings.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Text Size</label>
                <TextSizeSelector />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">High Contrast</label>
                  <p className="text-xs text-muted">Improve readability with higher contrast</p>
                </div>
                <input
                  type="checkbox"
                  name="highContrast"
                  checked={appSettings.highContrast}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Content & Feed */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Content & Feed</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Autoplay Videos</label>
                  <p className="text-xs text-muted">Automatically play videos in feed</p>
                </div>
                <input
                  type="checkbox"
                  name="autoplayVideos"
                  checked={appSettings.autoplayVideos}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show Sensitive Content</label>
                  <p className="text-xs text-muted">Display content marked as sensitive</p>
                </div>
                <input
                  type="checkbox"
                  name="showSensitiveContent"
                  checked={appSettings.showSensitiveContent}
                  onChange={handleChange}
                  className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Data Usage</label>
                <select
                  name="dataUsage"
                  value={appSettings.dataUsage}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="low">Low (Save Data)</option>
                  <option value="standard">Standard</option>
                  <option value="high">High Quality</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admin Settings - Only visible to admins and super admins */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-foreground">Admin Settings</h2>
                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                  {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Can Moderate</label>
                    <p className="text-xs text-muted">Moderate posts and comments</p>
                  </div>
                  <input
                    type="checkbox"
                    name="canModerate"
                    checked={appSettings.canModerate}
                    onChange={handleChange}
                    className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Can Manage Groups</label>
                    <p className="text-xs text-muted">Create and manage groups</p>
                  </div>
                  <input
                    type="checkbox"
                    name="canManageGroups"
                    checked={appSettings.canManageGroups}
                    onChange={handleChange}
                    className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Can View Analytics</label>
                    <p className="text-xs text-muted">Access platform analytics</p>
                  </div>
                  <input
                    type="checkbox"
                    name="canViewAnalytics"
                    checked={appSettings.canViewAnalytics}
                    onChange={handleChange}
                    className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Admin Notifications</label>
                    <p className="text-xs text-muted">Receive admin alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    name="adminNotifications"
                    checked={appSettings.adminNotifications}
                    onChange={handleChange}
                    className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                  />
                </div>

                {user?.role === 'super_admin' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">Can Ban Users</label>
                        <p className="text-xs text-muted">Ban and unban users</p>
                      </div>
                      <input
                        type="checkbox"
                        name="canBanUsers"
                        checked={appSettings.canBanUsers}
                        onChange={handleChange}
                        className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">Can Manage Settings</label>
                        <p className="text-xs text-muted">Modify global platform settings</p>
                      </div>
                      <input
                        type="checkbox"
                        name="canManageSettings"
                        checked={appSettings.canManageSettings}
                        onChange={handleChange}
                        className="w-4 h-4 bg-input border border-input-border rounded text-accent focus:ring-accent"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Global Settings - Only visible to super admins */}
          {user?.role === 'super_admin' && (
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4 shadow-theme-md">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-semibold text-foreground">Global Platform Settings</h2>
                <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full">
                  Super Admin Only
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <p className="text-muted">
                  ⚠️ These settings affect the entire platform and all users. Changes take effect immediately.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Open global settings modal or navigate to global settings page
                      toast('Global settings management coming soon', { icon: 'ℹ️' });
                    }}
                    className="p-4 bg-card border border-border rounded-lg hover:bg-card-hover transition-colors text-left"
                  >
                    <h3 className="font-medium text-foreground mb-1">Platform Rules</h3>
                    <p className="text-xs text-muted">Manage registration, content moderation, and user limits</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toast('System maintenance tools coming soon', { icon: 'ℹ️' });
                    }}
                    className="p-4 bg-card border border-border rounded-lg hover:bg-card-hover transition-colors text-left"
                  >
                    <h3 className="font-medium text-foreground mb-1">System Maintenance</h3>
                    <p className="text-xs text-muted">Database cleanup, cache management, and system tools</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4 shadow-theme-md">
            <Button
              variant="default"
              type="submit"
              isLoading={isSaving}
              className="w-full flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving Settings...' : 'Save App Settings'}
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
};

export default Settings;