import React, { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import Avatar from '../Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

interface ProfilePictureUploadProps {
  onUploadSuccess?: (avatarUrl: string) => void;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({ onUploadSuccess }) => {
  const { user, updateUser } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploading(true);
    try {
      // Backend route: PUT /api/users/profile/avatar (field name 'avatar')
      const response = await api.put('/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user context with new avatar
      if (response.data.avatar) {
        updateUser({ avatar: response.data.avatar });
        onUploadSuccess?.(response.data.avatar);
      }

      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to update profile picture');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      // Backend expects 'avatar_url' on PUT /api/users/profile
      await api.put('/users/profile', { avatar_url: null });
      updateUser({ avatar: undefined });
      onUploadSuccess?.('');
      setPreviewUrl(null);
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar
          src={previewUrl || user?.avatar || DEFAULT_IMAGES.avatar}
          alt={user?.name || 'Profile picture'}
          size="xl"
          className="w-32 h-32 border-4 border-white"
        />
        {(user?.avatar || previewUrl) && (
          <button
            onClick={handleRemoveAvatar}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="Remove profile picture"
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-0 right-0 p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
          title="Upload new profile picture"
        >
          <Camera size={20} />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      {isUploading && (
        <div className="text-sm text-gray-400">Uploading...</div>
      )}
    </div>
  );
};

export default ProfilePictureUpload; 