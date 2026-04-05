import React, { useState, useRef } from 'react';
import { Camera, Save } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import api from '../../lib/axios';

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setIsEditing(true);
  };

  const handleCoverPhotoClick = () => {
    coverPhotoInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error(`${type === 'profile' ? 'Profile picture' : 'Cover photo'} size must be less than 5MB`);
        return;
      }

      try {
        const formData = new FormData();
        formData.append(type === 'profile' ? 'avatar' : 'coverPhoto', file);

        // Use the same axios instance as the rest of the app for proper token handling
        // Align with backend routes in backend/routes/users.ts
        // avatar: PUT /api/users/profile/avatar (field name 'avatar')
        // cover:  PUT /api/users/profile/cover-photo (field name 'coverPhoto')
        const endpoint = type === 'profile'
          ? '/users/profile/avatar'
          : '/users/profile/cover-photo';

        const response = await api.put(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Raw API response:', response);
        console.log('Response data:', response.data);
        console.log('Response status:', response.status);

        // Explicitly map the response to the correct field names for updateUser
        // Backend returns { avatar: url } or { coverPhoto: url }
        const updatedData = type === 'profile'
          ? { avatar: response.data.avatar }
          : { coverPhoto: response.data.coverPhoto };

        updateUser(updatedData);
        console.log(`${type} photo updated in ProfileSettings:`, updatedData);
        toast.success(`${type === 'profile' ? 'Profile picture' : 'Cover photo'} updated successfully`);
      } catch (error) {
        console.error(`Error uploading ${type}:`, error);
        toast.error(`Failed to upload ${type === 'profile' ? 'profile picture' : 'cover photo'}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Password validation
      if (formData.newPassword || formData.currentPassword || formData.confirmPassword) {
        // Check if current password is provided
        if (!formData.currentPassword) {
          throw new Error('Current password is required to change password');
        }

        // Verify current password (in a real app, this would be an API call)
        const correctPassword = 'Password@123'; // This is just for demo, replace with actual verification
        if (formData.currentPassword !== correctPassword) {
          throw new Error('Current password is incorrect');
        }

        // Check new password requirements
        if (!formData.newPassword) {
          throw new Error('New password is required');
        }
        if (formData.newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(formData.newPassword)) {
          throw new Error('New password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(formData.newPassword)) {
          throw new Error('New password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(formData.newPassword)) {
          throw new Error('New password must contain at least one number');
        }
        if (!/[!@#$%^&*]/.test(formData.newPassword)) {
          throw new Error('New password must contain at least one special character (!@#$%^&*)');
        }

        // Check if passwords match
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }

        // Check if new password is different from current
        if (formData.newPassword === formData.currentPassword) {
          throw new Error('New password must be different from current password');
        }

        // Here you would typically make an API call to update the password
        console.log('Password would be updated here');
      }

      // Update user data
      await updateUser({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        location: formData.location,
        website: formData.website
        // In a real app, you would handle password update separately
      });

      setSaveStatus('success');
      setIsEditing(false);

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // Show success message
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const hasChanges = isEditing || formData.currentPassword || formData.newPassword;

  if (!user) {
    return <div>Loading...</div>; // Or a spinner
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Profile Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Photo Upload */}
        <div className="relative w-full h-48 mb-16 rounded-lg overflow-hidden bg-[#2d2d2d]">
          <img
            src={user.coverPhoto || DEFAULT_IMAGES.cover}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleCoverPhotoClick}
            className="absolute bottom-4 right-4 p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600"
          >
            <Camera size={16} />
          </button>
          <input
            ref={coverPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'cover')}
          />
        </div>

        {/* Avatar Upload */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={user.avatar || DEFAULT_IMAGES.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover bg-[#2d2d2d]"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'profile')}
            />
          </div>
          <div>
            <h3 className="text-white font-medium">Profile Picture</h3>
            <p className="text-sm text-gray-400">Upload a new profile picture</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-white"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={3}
            className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Website</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Password Change */}
        <div className="space-y-4 border-t border-[#2d2d2d] pt-4">
          <h3 className="text-lg font-medium text-white">Change Password</h3>
          <p className="text-sm text-gray-400">Password must contain:</p>
          <ul className="text-sm text-gray-400 list-disc list-inside ml-2 space-y-1">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character (!@#$%^&*)</li>
          </ul>
          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-white"
                placeholder="Enter your current password"
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-white"
                placeholder="Enter new password"
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:ring-2 ${formData.newPassword && formData.confirmPassword &&
                    formData.newPassword !== formData.confirmPassword
                    ? 'ring-2 ring-red-500'
                    : 'focus:ring-white'
                  }`}
                placeholder="Confirm new password"
              />
              {formData.newPassword && formData.confirmPassword &&
                formData.newPassword !== formData.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
                )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={!hasChanges || saveStatus === 'saving'}
          className={`w-full py-2 rounded-lg flex items-center justify-center space-x-2 ${hasChanges
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            } transition-colors`}
        >
          <Save size={20} />
          <span>
            {saveStatus === 'saving' ? 'Saving...' :
              saveStatus === 'success' ? 'Saved!' :
                saveStatus === 'error' ? 'Try Again' :
                  'Save Changes'}
          </span>
        </button>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <p className="text-green-500 text-sm text-center">Profile updated successfully!</p>
        )}
        {saveStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg text-sm">
            <p className="font-medium">Failed to update profile:</p>
            <p>{errorMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfileSettings; 