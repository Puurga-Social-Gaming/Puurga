import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import ProfilePictureUpload from '../../components/ProfilePictureUpload/ProfilePictureUpload';

const Settings: React.FC = () => {
  const { user, updateUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    isPrivate: user?.isPrivate || false,
    hideFromSuggestions: user?.hideFromSuggestions || false,
    messageRequests: user?.messageRequests || 'everyone',
    showReadReceipts: user?.showReadReceipts || true,
    showOnlineStatus: user?.showOnlineStatus || true,
    commentPrivacy: user?.commentPrivacy || 'everyone',
    storyPrivacy: user?.storyPrivacy || 'everyone'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.put('/api/users/profile', formData);
      updateUser(response.data);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="bg-[#1a1a1a] rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Profile Picture</h2>
          <ProfilePictureUpload />
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-6">Account Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Message Requests</label>
              <select
                name="messageRequests"
                value={formData.messageRequests}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers Only</option>
                <option value="none">No One</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Comment Privacy</label>
              <select
                name="commentPrivacy"
                value={formData.commentPrivacy}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers Only</option>
                <option value="none">No One</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Story Privacy</label>
              <select
                name="storyPrivacy"
                value={formData.storyPrivacy}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers Only</option>
                <option value="close_friends">Close Friends Only</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isPrivate"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isPrivate" className="text-sm text-gray-400">Private Account</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="hideFromSuggestions"
                id="hideFromSuggestions"
                checked={formData.hideFromSuggestions}
                onChange={handleChange}
                className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="hideFromSuggestions" className="text-sm text-gray-400">Hide from Suggestions</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="showReadReceipts"
                id="showReadReceipts"
                checked={formData.showReadReceipts}
                onChange={handleChange}
                className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="showReadReceipts" className="text-sm text-gray-400">Show Read Receipts</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="showOnlineStatus"
                id="showOnlineStatus"
                checked={formData.showOnlineStatus}
                onChange={handleChange}
                className="w-4 h-4 bg-[#222] border border-[#333] rounded text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="showOnlineStatus" className="text-sm text-gray-400">Show Online Status</label>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Settings; 