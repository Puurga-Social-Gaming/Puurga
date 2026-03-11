import React, { useState } from 'react';
import { X, Users, Upload, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const coverImageInputRef = React.useRef<HTMLInputElement>(null);
  const profileImageInputRef = React.useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    if (type === 'profile') {
      setProfileImage(file);
      setProfileImagePreview(previewUrl);
    } else {
      setCoverImage(file);
      setCoverImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the group first
      const groupResponse = await api.post('/groups', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_private: formData.is_private
      });

      const groupId = groupResponse.data.id;

      // Upload profile image if provided
      if (profileImage) {
        const profileFormData = new FormData();
        profileFormData.append('profileImage', profileImage);

        try {
          await api.put(`/groups/${groupId}/profile-image`, profileFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          console.warn('Profile image upload failed:', error);
        }
      }

      // Upload cover image if provided
      if (coverImage) {
        const coverFormData = new FormData();
        coverFormData.append('coverImage', coverImage);

        try {
          await api.put(`/groups/${groupId}/cover-image`, coverFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          console.warn('Cover image upload failed:', error);
        }
      }

      toast.success('Group created successfully!');
      onGroupCreated();
      handleClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.error || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', is_private: false });
    setProfileImage(null);
    setCoverImage(null);
    setProfileImagePreview('');
    setCoverImagePreview('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Create New Group</h2>
                  <p className="text-sm text-gray-400">Build your community</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cover Image (Optional)
                </label>
                <div
                  onClick={() => coverImageInputRef.current?.click()}
                  className="relative w-full h-32 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer overflow-hidden"
                  style={{
                    backgroundImage: coverImagePreview ? `url(${coverImagePreview})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'cover')}
                    className="hidden"
                  />
                  {!coverImagePreview && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <Image size={32} className="mx-auto text-gray-500 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload cover image</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Group Icon (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => profileImageInputRef.current?.click()}
                    className="relative w-20 h-20 bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors cursor-pointer overflow-hidden"
                    style={{
                      backgroundImage: profileImagePreview ? `url(${profileImagePreview})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'profile')}
                      className="hidden"
                    />
                    {!profileImagePreview && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Upload size={20} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Upload a group icon</p>
                    <p className="text-xs text-gray-500">Recommended: 400x400px, max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Group Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter group name..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your group..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Privacy Setting */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-white">Private Group</h3>
                  <p className="text-xs text-gray-400">Only invited members can join</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_private"
                    checked={formData.is_private}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateGroupModal;
