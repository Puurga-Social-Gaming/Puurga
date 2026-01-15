import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Link2, Calendar, Trophy, Flame, Loader2, AlertCircle, Camera, Briefcase, GraduationCap, Heart, Settings, Gamepad2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import PurgasTab from '../components/Profile/PurgasTab';

type ProfileTab = 'posts' | 'puurgas' | 'achievements' | 'gaming' | 'settings';

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const { user: profileData, updateUser, loading } = useUser();
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    occupation: '',
    education: '',
    relationship: '',
    isPrivate: false,
    hideFromSuggestions: false,
    messageRequests: 'everyone',
    showReadReceipts: true,
    showOnlineStatus: true,
    commentPrivacy: 'everyone',
    storyPrivacy: 'everyone'
  });

  useEffect(() => {
    if (profileData) {
      setFormData({
        name: profileData.name || '',
        username: profileData.username || '',
        email: profileData.email || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || '',
        occupation: profileData.occupation || '',
        education: profileData.education || '',
        relationship: profileData.relationship || '',
        isPrivate: profileData.isPrivate || false,
        hideFromSuggestions: profileData.hideFromSuggestions || false,
        messageRequests: profileData.messageRequests || 'everyone',
        showReadReceipts: profileData.showReadReceipts || true,
        showOnlineStatus: profileData.showOnlineStatus || true,
        commentPrivacy: profileData.commentPrivacy || 'everyone',
        storyPrivacy: profileData.storyPrivacy || 'everyone'
      });
    }
  }, [profileData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    const fieldName = type === 'profile' ? 'avatar' : 'coverPhoto';
    formData.append(fieldName, file);

    const endpoint = type === 'profile' ? '/api/users/profile/avatar' : '/api/users/profile/cover-photo';
    const toastId = toast.loading(`Uploading ${type} photo...`);

    try {
      const response = await api.put(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user context with new image URL
      const updatedData = type === 'profile' 
        ? { avatar: response.data.avatar }
        : { coverPhoto: response.data.coverPhoto };
      
      updateUser(updatedData);

      // Store in localStorage for persistence with both frontend and backend field names
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { 
        ...currentUser, 
        ...updatedData,
        // Also store backend field names for consistency
        ...(type === 'profile' ? { avatar_url: response.data.avatar } : { cover_photo: response.data.coverPhoto })
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} photo updated!`, { id: toastId });
    } catch (error) {
      console.error(`Failed to upload ${type} photo:`, error);
      toast.error(`Failed to upload ${type} photo.`, { id: toastId });
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading('Updating profile...');
    try {
      console.log('Saving profile with data:', {
        name: formData.name,
        username: formData.username,
        email: formData.email
      });
      const response = await api.put('/api/users/profile', formData);
      console.log('Profile update response:', {
        username: response.data.username,
        full_name: response.data.full_name,
        name: response.data.name
      });
      
      // Map backend response to frontend User format
      const updatedUserData = {
        name: response.data.full_name || response.data.name || formData.name,
        username: response.data.username || formData.username,
        email: response.data.email || formData.email,
        bio: response.data.bio,
        location: response.data.location,
        website: response.data.website,
        occupation: response.data.occupation,
        education: response.data.education,
        relationship: response.data.relationship,
        isPrivate: response.data.is_private,
        hideFromSuggestions: response.data.hide_from_suggestions,
        messageRequests: response.data.message_requests,
        showReadReceipts: response.data.show_read_receipts,
        showOnlineStatus: response.data.show_online_status,
        commentPrivacy: response.data.comment_privacy,
        storyPrivacy: response.data.story_privacy,
      };
      
      console.log('Updating user context with:', {
        username: updatedUserData.username,
        name: updatedUserData.name
      });
      
      // Update user context
      updateUser(updatedUserData);
      
      // Update localStorage with complete data
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedStoredUser = {
        ...currentUser,
        ...response.data,
        // Ensure both formats are stored
        full_name: response.data.full_name || formData.name,
        name: response.data.full_name || formData.name,
        username: response.data.username || formData.username,
        email: response.data.email || formData.email,
      };
      localStorage.setItem('user', JSON.stringify(updatedStoredUser));
      
      console.log('Profile save complete. Username should now be:', updatedUserData.username);
      
      // Exit edit mode after successful save
      setIsEditMode(false);
      
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile.', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-400">Profile data not available.</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Cover Image - Full width at top */}
      <div 
        className="w-full h-32 md:h-48 bg-cover bg-center relative"
        style={{
          backgroundImage: profileData.coverPhoto ? `url(${profileData.coverPhoto})` : undefined,
          backgroundColor: '#2d2d2d'
        }}
      >
        {isEditMode && (
          <button
            onClick={() => coverPhotoRef.current?.click()}
            className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 z-10"
          >
            <Camera size={20} />
            Change Cover
          </button>
        )}
        <input
          type="file"
          ref={coverPhotoRef}
          onChange={(e) => handleImageUpload(e, 'cover')}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Profile Header */}
      <div className="w-full p-4 sm:p-6 bg-black relative">
        {/* Profile Picture - Positioned to overlap cover */}
        <div className="absolute -top-12 left-4 z-30">
          <div className="relative">
            <img 
              src={profileData.avatar || '/default-avatar.png'}
              alt={profileData.name}
              className="w-24 h-24 rounded-full border-4 border-black object-cover bg-[#2d2d2d]"
            />
            {isEditMode && (
              <button
                onClick={() => profilePictureRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-sm p-2 rounded-full hover:bg-white/20 transition-colors z-40"
              >
                <Camera size={20} className="text-white" />
              </button>
            )}
            <input
              type="file"
              ref={profilePictureRef}
              onChange={(e) => handleImageUpload(e, 'profile')}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-14 flex flex-col md:flex-row md:items-center md:justify-between w-full">
          <div>
            <h1 className="text-3xl font-bold text-white">{profileData.name}</h1>
            <p className="text-gray-400 text-lg">@{profileData.username}</p>
            {profileData.bio && (
              <p className="text-gray-300 mt-2 max-w-xl">{profileData.bio}</p>
            )}
            <div className="flex items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-400 flex-wrap">
              {profileData.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={16} className="text-orange-400" /> {profileData.location}
                </span>
              )}
              {profileData.website && (
                <span className="flex items-center gap-1">
                  <Link2 size={16} className="text-orange-400" /> 
                  {(() => {
                    try {
                      const url = new URL(profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`);
                      return (
                        <a href={url.href} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                          {url.hostname}
                        </a>
                      );
                    } catch {
                      return <span>{profileData.website}</span>;
                    }
                  })()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={16} className="text-orange-400" /> Joined {new Date(profileData.joinDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'})}
              </span>
              {profileData.occupation && (
                <span className="flex items-center gap-1">
                  <Briefcase size={16} className="text-orange-400" /> {profileData.occupation}
                </span>
              )}
              {profileData.education && (
                <span className="flex items-center gap-1">
                  <GraduationCap size={16} className="text-orange-400" /> {profileData.education}
                </span>
              )}
              {profileData.relationship && (
                <span className="flex items-center gap-1">
                  <Heart size={16} className="text-orange-400" /> {profileData.relationship}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0 flex-shrink-0">
            <div className="text-center">
              <span className="block text-xl font-bold text-white">{profileData.stats?.posts || 0}</span>
              <span className="text-gray-400">Posts</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-bold text-white">{profileData.stats?.followers || 0}</span>
              <span className="text-gray-400">Followers</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-bold text-white">{profileData.stats?.following || 0}</span>
              <span className="text-gray-400">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="bg-black w-full">
        <div className="flex justify-around border-b border-gray-800 px-2 sm:px-4 overflow-x-auto">
          <TabButton 
            label="Posts" 
            icon={<Trophy size={18} />} 
            isActive={activeTab === 'posts'} 
            onClick={() => setActiveTab('posts')} 
          />
          <TabButton 
            label="Puurgas" 
            icon={<Flame size={18} />} 
            isActive={activeTab === 'puurgas'} 
            onClick={() => setActiveTab('puurgas')} 
          />
          <TabButton 
            label="Gaming" 
            icon={<Gamepad2 size={18} />} 
            isActive={activeTab === 'gaming'} 
            onClick={() => setActiveTab('gaming')} 
          />
          <TabButton 
            label="Settings" 
            icon={<Settings size={18} />} 
            isActive={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>
        <div className="p-2 sm:p-4 min-h-[300px] w-full overflow-hidden">
          {activeTab === 'posts' && <div className="text-center text-gray-500 py-8">No posts yet.</div>}
          {activeTab === 'puurgas' && <PurgasTab />}
          {activeTab === 'gaming' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500 py-4">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                <h3 className="text-lg font-semibold text-white mb-2">Gaming Stats</h3>
                <p className="text-gray-400">Your gaming achievements and progress will appear here.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => window.location.href = '/puurga-games/sword-of-judgment'}
                  className="bg-black p-4 rounded-lg border border-gray-800 hover:border-orange-500 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">⚔️</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white group-hover:text-orange-500 transition-colors">Sword of Judgment</h4>
                      <p className="text-sm text-gray-400">Click to play</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">High Score: 0</p>
                  <p className="text-sm text-gray-400">Games Played: 0</p>
                </button>
                <div className="bg-black p-4 rounded-lg border border-gray-800">
                  <h4 className="font-medium text-white mb-2">Total Credits</h4>
                  <p className="text-sm text-gray-400 mb-2">Earned: 0</p>
                  <p className="text-sm text-gray-400">Rank: Novice</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Profile Settings</h3>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                      >
                        Save Profile
                      </button>
                      <button
                        onClick={() => setIsEditMode(false)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-400">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-400">Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-400">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="occupation" className="block text-sm font-medium text-gray-400">Occupation</label>
                  <input
                    type="text"
                    id="occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="education" className="block text-sm font-medium text-gray-400">Education</label>
                  <input
                    type="text"
                    id="education"
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="relationship" className="block text-sm font-medium text-gray-400">Relationship Status</label>
                  <select
                    id="relationship"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleSelectChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select...</option>
                    <option value="single">Single</option>
                    <option value="in a relationship">In a relationship</option>
                    <option value="married">Married</option>
                    <option value="complicated">It's complicated</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-400">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  className={`mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                ></textarea>
              </div>
              
              <h3 className="text-xl font-bold text-white mt-6 mb-4">Privacy Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="isPrivate" className="text-gray-300">Make profile private</label>
                  <input
                    type="checkbox"
                    id="isPrivate"
                    name="isPrivate"
                    checked={formData.isPrivate}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="hideFromSuggestions" className="text-gray-300">Hide from suggestions</label>
                  <input
                    type="checkbox"
                    id="hideFromSuggestions"
                    name="hideFromSuggestions"
                    checked={formData.hideFromSuggestions}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="showReadReceipts" className="text-gray-300">Show read receipts</label>
                  <input
                    type="checkbox"
                    id="showReadReceipts"
                    name="showReadReceipts"
                    checked={formData.showReadReceipts}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="showOnlineStatus" className="text-gray-300">Show online status</label>
                  <input
                    type="checkbox"
                    id="showOnlineStatus"
                    name="showOnlineStatus"
                    checked={formData.showOnlineStatus}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="messageRequests" className="text-gray-300">Message requests from</label>
                  <select
                    id="messageRequests"
                    name="messageRequests"
                    value={formData.messageRequests}
                    onChange={handleSelectChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-1/2 bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="none">No one</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="commentPrivacy" className="text-gray-300">Comment privacy</label>
                  <select
                    id="commentPrivacy"
                    name="commentPrivacy"
                    value={formData.commentPrivacy}
                    onChange={handleSelectChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-1/2 bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="none">No one</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="storyPrivacy" className="text-gray-300">Story privacy</label>
                  <select
                    id="storyPrivacy"
                    name="storyPrivacy"
                    value={formData.storyPrivacy}
                    onChange={handleSelectChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-1/2 bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="close_friends">Close Friends</option>
                  </select>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => (
  <button
    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-3 text-xs sm:text-sm font-medium focus:outline-none transition-colors duration-200 whitespace-nowrap flex-shrink-0
      ${isActive
        ? 'text-orange-500 border-b-2 border-orange-500'
        : 'text-gray-400 hover:text-gray-200 hover:border-gray-500 border-b-2 border-transparent'
      }`}
    onClick={onClick}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default Profile;