import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { toast } from 'react-hot-toast';
import api from '../lib/axios';
import { Loader2, Bell, Moon, Globe, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

type FormData = {
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
    messages: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
  };
  language: string;
  privacy: {
    showOnlineStatus: boolean;
    showReadReceipts: boolean;
    allowTagging: boolean;
  };
  content: {
    autoplayVideos: boolean;
    showSensitiveContent: boolean;
    dataSaver: boolean;
  };
};

const Settings = () => {
  const { updateUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'appearance' | 'privacy' | 'content'>('notifications');
  const [formData, setFormData] = useState<FormData>({
    notifications: {
      email: true,
      push: true,
      mentions: true,
      messages: true
    },
    appearance: {
      theme: 'dark',
      fontSize: 'medium'
    },
    language: 'en',
    privacy: {
      showOnlineStatus: true,
      showReadReceipts: true,
      allowTagging: true
    },
    content: {
      autoplayVideos: true,
      showSensitiveContent: false,
      dataSaver: false
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const [section, field] = name.split('.');
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof FormData] as Record<string, boolean>),
        [field]: checked
      }
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const [section, field] = name.split('.');
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof FormData] as Record<string, string>),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await api.put('/api/users/settings', formData);
      
      if (updateUser) {
        updateUser(response.data);
        toast.success('Settings updated successfully');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-black p-6"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">App Settings</h1>

        {/* Settings Navigation */}
        <div className="flex gap-4 border-b border-[#333] mb-6">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'notifications'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell className="inline-block mr-2" size={20} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'appearance'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Moon className="inline-block mr-2" size={20} />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'privacy'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="inline-block mr-2" size={20} />
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'content'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="inline-block mr-2" size={20} />
            Content
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-[#1a1a1a] p-6 rounded-lg shadow-md">
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Notification Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="notifications.email" className="text-gray-300">Email Notifications</label>
                  <input
                    type="checkbox"
                    id="notifications.email"
                    name="notifications.email"
                    checked={formData.notifications.email}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="notifications.push" className="text-gray-300">Push Notifications</label>
                  <input
                    type="checkbox"
                    id="notifications.push"
                    name="notifications.push"
                    checked={formData.notifications.push}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="notifications.mentions" className="text-gray-300">Mention Notifications</label>
                  <input
                    type="checkbox"
                    id="notifications.mentions"
                    name="notifications.mentions"
                    checked={formData.notifications.mentions}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="notifications.messages" className="text-gray-300">Message Notifications</label>
                  <input
                    type="checkbox"
                    id="notifications.messages"
                    name="notifications.messages"
                    checked={formData.notifications.messages}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Appearance Settings</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="appearance.theme" className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                  <select
                    id="appearance.theme"
                    name="appearance.theme"
                    value={formData.appearance.theme}
                    onChange={handleSelectChange}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-transparent rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="appearance.fontSize" className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
                  <select
                    id="appearance.fontSize"
                    name="appearance.fontSize"
                    value={formData.appearance.fontSize}
                    onChange={handleSelectChange}
                    className="w-full px-3 py-2 bg-[#2d2d2d] border border-transparent rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Privacy Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="privacy.showOnlineStatus" className="text-gray-300">Show Online Status</label>
                  <input
                    type="checkbox"
                    id="privacy.showOnlineStatus"
                    name="privacy.showOnlineStatus"
                    checked={formData.privacy.showOnlineStatus}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="privacy.showReadReceipts" className="text-gray-300">Show Read Receipts</label>
                  <input
                    type="checkbox"
                    id="privacy.showReadReceipts"
                    name="privacy.showReadReceipts"
                    checked={formData.privacy.showReadReceipts}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="privacy.allowTagging" className="text-gray-300">Allow Tagging</label>
                  <input
                    type="checkbox"
                    id="privacy.allowTagging"
                    name="privacy.allowTagging"
                    checked={formData.privacy.allowTagging}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Content Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="content.autoplayVideos" className="text-gray-300">Autoplay Videos</label>
                  <input
                    type="checkbox"
                    id="content.autoplayVideos"
                    name="content.autoplayVideos"
                    checked={formData.content.autoplayVideos}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="content.showSensitiveContent" className="text-gray-300">Show Sensitive Content</label>
                  <input
                    type="checkbox"
                    id="content.showSensitiveContent"
                    name="content.showSensitiveContent"
                    checked={formData.content.showSensitiveContent}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="content.dataSaver" className="text-gray-300">Data Saver Mode</label>
                  <input
                    type="checkbox"
                    id="content.dataSaver"
                    name="content.dataSaver"
                    checked={formData.content.dataSaver}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-gray-700 bg-[#2d2d2d] text-orange-600 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
              loading ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" size={20} />
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings; 