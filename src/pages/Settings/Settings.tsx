import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Bell, Shield, Eye, Globe, Moon, Sun } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [appSettings, setAppSettings] = useState({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setAppSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Save app settings to localStorage for now
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
      toast.success('App settings updated successfully');
    } catch (error) {
      console.error('Error updating app settings:', error);
      toast.error('Failed to update app settings');
    } finally {
      setIsLoading(false);
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
        <h1 className="text-2xl font-bold text-foreground mb-8">App Settings</h1>
        <p className="text-muted mb-8">Manage your app preferences, privacy, and notification settings.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Theme Toggle */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-theme-md">
            <div className="flex items-center gap-3 mb-6">
              {theme === 'dark' ? (
                <Moon className="w-6 h-6 text-accent" />
              ) : (
                <Sun className="w-6 h-6 text-accent" />
              )}
              <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Theme</label>
                <p className="text-xs text-muted">Switch between light and dark mode</p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
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
          <div className="bg-card border border-border rounded-xl p-6 shadow-theme-md">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-semibold text-foreground">Privacy & Security</h2>
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
          <div className="bg-card border border-border rounded-xl p-6 shadow-theme-md">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
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
          <div className="bg-card border border-border rounded-xl p-6 shadow-theme-md">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-semibold text-foreground">Display & Accessibility</h2>
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
                <label className="block text-sm font-medium text-foreground mb-2">Font Size</label>
                <select
                  name="fontSize"
                  value={appSettings.fontSize}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
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
          <div className="bg-card border border-border rounded-xl p-6 shadow-theme-md">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-semibold text-foreground">Content & Feed</h2>
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

          <div className="bg-card border border-border rounded-xl p-6 shadow-theme-md">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 btn-float shadow-theme-button"
            >
              {isLoading ? 'Saving...' : 'Save App Settings'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
};

export default Settings;