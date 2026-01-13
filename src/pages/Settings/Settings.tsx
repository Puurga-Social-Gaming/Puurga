import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, Shield, Eye, Moon, Volume2, Globe } from 'lucide-react';

const Settings: React.FC = () => {
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
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-white mb-8">App Settings</h1>
        <p className="text-gray-400 mb-8">Manage your app preferences, privacy, and notification settings.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Privacy & Security */}
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Data Collection</label>
                  <p className="text-xs text-gray-400">Allow app to collect usage data for improvements</p>
                </div>
                <input
                  type="checkbox"
                  name="dataCollection"
                  checked={appSettings.dataCollection}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Analytics Tracking</label>
                  <p className="text-xs text-gray-400">Help improve the app with anonymous analytics</p>
                </div>
                <input
                  type="checkbox"
                  name="analyticsTracking"
                  checked={appSettings.analyticsTracking}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Crash Reporting</label>
                  <p className="text-xs text-gray-400">Automatically send crash reports to help fix bugs</p>
                </div>
                <input
                  type="checkbox"
                  name="crashReporting"
                  checked={appSettings.crashReporting}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Push Notifications</label>
                  <p className="text-xs text-gray-400">Receive notifications on your device</p>
                </div>
                <input
                  type="checkbox"
                  name="pushNotifications"
                  checked={appSettings.pushNotifications}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Email Notifications</label>
                  <p className="text-xs text-gray-400">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={appSettings.emailNotifications}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Sound</label>
                  <p className="text-xs text-gray-400">Play sounds for notifications</p>
                </div>
                <input
                  type="checkbox"
                  name="soundEnabled"
                  checked={appSettings.soundEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
          
          {/* Display & Accessibility */}
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">Display & Accessibility</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Language</label>
                <select
                  name="language"
                  value={appSettings.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Font Size</label>
                <select
                  name="fontSize"
                  value={appSettings.fontSize}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">High Contrast</label>
                  <p className="text-xs text-gray-400">Improve readability with higher contrast</p>
                </div>
                <input
                  type="checkbox"
                  name="highContrast"
                  checked={appSettings.highContrast}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
          
          {/* Content & Feed */}
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">Content & Feed</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Autoplay Videos</label>
                  <p className="text-xs text-gray-400">Automatically play videos in feed</p>
                </div>
                <input
                  type="checkbox"
                  name="autoplayVideos"
                  checked={appSettings.autoplayVideos}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Show Sensitive Content</label>
                  <p className="text-xs text-gray-400">Display content marked as sensitive</p>
                </div>
                <input
                  type="checkbox"
                  name="showSensitiveContent"
                  checked={appSettings.showSensitiveContent}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Data Usage</label>
                <select
                  name="dataUsage"
                  value={appSettings.dataUsage}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low (Save Data)</option>
                  <option value="standard">Standard</option>
                  <option value="high">High Quality</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save App Settings'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Settings;