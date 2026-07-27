import React, { useState, useRef } from 'react';
import { Users, Upload, Image } from 'lucide-react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import Modal from './UI/Modal';
import Button from './UI/Button';
import imageCompression from 'browser-image-compression';

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
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    try {
      const loadingToast = toast.loading('Compressing image...');
      
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      toast.dismiss(loadingToast);
      
      if (compressedFile.size > 5 * 1024 * 1024) {
        toast.error('Image is too large. Please use a smaller image.');
        return;
      }

      const previewUrl = URL.createObjectURL(compressedFile);

      if (type === 'profile') {
        setProfileImage(compressedFile as File);
        setProfileImagePreview(previewUrl);
      } else {
        setCoverImage(compressedFile as File);
        setCoverImagePreview(previewUrl);
      }
      
      toast.success('Image compressed and ready');
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Creating group...');

    try {
      const groupResponse = await api.post('/groups', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_private: formData.is_private
      });

      const groupId = groupResponse.data.id;
      let uploadedProfile = false;
      let uploadedCover = false;

      if (profileImage) {
        setUploadProgress('Uploading profile image...');
        const profileFormData = new FormData();
        profileFormData.append('profileImage', profileImage);

        try {
          const profileResponse = await api.put(`/groups/${groupId}/profile-image`, profileFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (profileResponse.data?.profile_image_url) {
            uploadedProfile = true;
          }
        } catch (uploadError: any) {
          console.warn('Profile image upload failed:', uploadError);
          if (uploadError.response?.status === 413) {
            toast.error('Profile image is too large. Please use a smaller image.');
          }
        }
      }

      if (coverImage) {
        setUploadProgress('Uploading cover image...');
        const coverFormData = new FormData();
        coverFormData.append('coverImage', coverImage);

        try {
          const coverResponse = await api.put(`/groups/${groupId}/cover-image`, coverFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (coverResponse.data?.cover_image_url) {
            uploadedCover = true;
          }
        } catch (uploadError: any) {
          console.warn('Cover image upload failed:', uploadError);
          if (uploadError.response?.status === 413) {
            toast.error('Cover image is too large. Please use a smaller image.');
          }
        }
      }

      setUploadProgress('Finalizing...');
      
      if (uploadedProfile || uploadedCover) {
        toast.success('Group created with images!');
      } else if (profileImage || coverImage) {
        toast.success('Group created! (Images failed to upload - try smaller images)');
      } else {
        toast.success('Group created successfully!');
      }
      
      onGroupCreated();
      handleClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.error || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Dismiss keyboard on mobile when clicking outside input areas
    if (e.target === e.currentTarget) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.blur();
      }
    }
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="default"
        onClick={handleClose}
        className="flex-1"
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || !formData.name.trim()}
        isLoading={isSubmitting}
        className="flex-1"
      >
        {isSubmitting ? uploadProgress || 'Creating...' : 'Create Group'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Group"
      description="Build your community"
      icon={<Users size={20} className="text-white" />}
      iconBgColor="bg-accent"
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4" onClick={handleBackdropClick}>
        {/* Cover Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Cover Image (Optional)
          </label>
          <div
            onClick={() => !isSubmitting && coverImageInputRef.current?.click()}
            className={`relative w-full h-32 bg-background-secondary rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors cursor-pointer overflow-hidden ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
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
              disabled={isSubmitting}
            />
            {!coverImagePreview && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <Image size={32} className="mx-auto text-muted mb-2" />
                  <p className="text-sm text-muted">Click to upload cover image</p>
                </div>
              </div>
            )}
            {coverImagePreview && (
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCoverImage(null);
                    setCoverImagePreview('');
                  }}
                  className="p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  disabled={isSubmitting}
                >
                  <Image size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Group Icon (Optional)
          </label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => !isSubmitting && profileImageInputRef.current?.click()}
              className={`relative w-20 h-20 bg-background-secondary rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors cursor-pointer overflow-hidden flex items-center justify-center ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
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
                disabled={isSubmitting}
              />
              {!profileImagePreview && (
                <Upload size={20} className="text-muted" />
              )}
              {profileImagePreview && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload size={20} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-foreground">Upload a group icon</p>
              <p className="text-xs text-muted">Recommended: 400x400px, max 5MB</p>
            </div>
          </div>
        </div>

        {/* Group Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Group Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter group name..."
            className="w-full bg-background-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your group..."
            rows={3}
            className="w-full bg-background-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Privacy Setting */}
        <div className={`flex items-center justify-between p-4 bg-background-secondary rounded-xl ${
          isSubmitting ? 'opacity-50' : ''
        }`}>
          <div>
            <h3 className="text-sm font-medium text-foreground">Private Group</h3>
            <p className="text-xs text-muted">Only invited members can join</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleInputChange}
              className="sr-only peer"
              disabled={isSubmitting}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;
