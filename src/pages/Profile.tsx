import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Link2, Calendar, Shield, Trophy, Users, Zap, Flame, Loader2, AlertCircle, Camera, Briefcase, GraduationCap, Heart, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../api/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

type ProfileTab = 'posts' | 'puurgas' | 'achievements' | 'groups' | 'settings';

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const { user: profileData, updateUser, loading } = useUser();
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
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

    const formData = new FormData();
    const fieldName = type === 'profile' ? 'avatar' : 'coverPhoto';
    formData.append(fieldName, file);

    const endpoint = type === 'profile' ? '/users/profile/avatar' : '/users/profile/cover-photo';
    const toastId = toast.loading(`Uploading ${type} photo...`);

    try {
      const response = await api.put(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (type === 'profile') {
        updateUser({ avatar: response.data.avatar });
      } else {
        updateUser({ coverPhoto: response.data.coverPhoto });
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} photo updated!`, { id: toastId });
    } catch (error) {
      console.error(`Failed to upload ${type} photo:`, error);
      toast.error(`Failed to upload ${type} photo.`, { id: toastId });
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading('Updating profile...');
    try {
      const response = await api.put('/users/profile', formData);
      updateUser(response.data);
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

  const ACHIEVEMENTS = [
    { icon: <Trophy className="text-yellow-500" size={20} />, name: 'Mzansi Pioneer', description: 'Early adopter in South Africa' },
    { icon: <Flame className="text-orange-500" size={20} />, name: 'Local Legend', description: 'Top trending in SA' },
    { icon: <Users className="text-orange-500" size={20} />, name: 'Ubuntu Builder', description: 'Created thriving local groups' },
    { icon: <Zap className="text-purple-500" size={20} />, name: 'African Innovator', description: 'Leading tech contributor' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 space-y-6 bg-[#0d0d0d] text-white"
    >
      {/* Profile Header */}
      <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg">
        <div className="relative">
          {/* Cover Image */}
          <div 
            className="h-32 md:h-48 rounded-lg bg-cover bg-center relative"
            style={{
              backgroundImage: profileData.coverPhoto ? `url(${profileData.coverPhoto})` : undefined,
              backgroundColor: '#2d2d2d'
            }}
          >
            <button
              onClick={() => coverPhotoRef.current?.click()}
              className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Camera size={20} />
              Change Cover
            </button>
            <input
              type="file"
              ref={coverPhotoRef}
              onChange={(e) => handleImageUpload(e, 'cover')}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-4">
            <div className="relative">
              <img 
                src={profileData.avatar || '/default-avatar.png'}
                alt={profileData.name}
                className="w-24 h-24 rounded-full border-4 border-[#1a1a1a] object-cover bg-[#2d2d2d]"
              />
              <button
                onClick={() => profilePictureRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-sm p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <Camera size={20} className="text-white" />
              </button>
              <input
                type="file"
                ref={profilePictureRef}
                onChange={(e) => handleImageUpload(e, 'profile')}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{profileData.name}</h1>
            <p className="text-gray-400 text-lg">@{profileData.username}</p>
            {profileData.bio && (
              <p className="text-gray-300 mt-2 max-w-xl">{profileData.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 flex-wrap">
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
          <div className="flex gap-4 mt-4 md:mt-0">
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
      <div className="bg-[#1a1a1a] rounded-xl p-2 shadow-lg">
        <div className="flex justify-around border-b border-gray-700">
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
            label="Achievements" 
            icon={<Shield size={18} />} 
            isActive={activeTab === 'achievements'} 
            onClick={() => setActiveTab('achievements')} 
          />
          <TabButton 
            label="Groups" 
            icon={<Users size={18} />} 
            isActive={activeTab === 'groups'} 
            onClick={() => setActiveTab('groups')} 
          />
          <TabButton 
            label="Settings" 
            icon={<Settings size={18} />} 
            isActive={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>
        <div className="p-4 min-h-[300px]">
          {activeTab === 'posts' && <div className="text-center text-gray-500 py-8">No posts yet.</div>}
          {activeTab === 'puurgas' && <div className="text-center text-gray-500 py-8">No Puurgas yet.</div>}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACHIEVEMENTS.map((achievement, index) => (
                <div key={index} className="bg-[#2d2d2d] p-4 rounded-lg flex items-center gap-3">
                  {achievement.icon}
                  <div>
                    <h4 className="font-medium text-white">{achievement.name}</h4>
                    <p className="text-sm text-gray-400">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'groups' && <div className="text-center text-gray-500 py-8">No groups joined yet.</div>}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Edit Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-400">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profileData.username}
                    disabled
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-500 cursor-not-allowed"
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
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="relationship" className="block text-sm font-medium text-gray-400">Relationship Status</label>
                  <select
                    id="relationship"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleSelectChange}
                    className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                  className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
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
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
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
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
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
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="messageRequests" className="text-gray-300">Message requests from</label>
                  <select
                    id="messageRequests"
                    name="messageRequests"
                    value={formData.messageRequests}
                    onChange={handleSelectChange}
                    className="mt-1 block w-1/2 bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-1/2 bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-1/2 bg-[#2d2d2d] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="close_friends">Close Friends</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleSave}
                className="mt-6 w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
              >
                Save Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium focus:outline-none transition-colors duration-200
      ${isActive
        ? 'text-orange-500 border-b-2 border-orange-500'
        : 'text-gray-400 hover:text-gray-200 hover:border-gray-500 border-b-2 border-transparent'
      }`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default Profile;