import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import { Camera, Settings, Heart, Calendar, MapPin, Loader2, AlertCircle, Link2, Briefcase, GraduationCap, ChevronUp, ChevronDown, Trophy, Flame, Gamepad2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '../components/Avatar';
import PurgasTab from '../components/Profile/PurgasTab';
import GalleryTab from '../components/Profile/GalleryTab';

type ProfileTab = 'posts' | 'puurgas' | 'achievements' | 'gaming' | 'settings';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const { user: profileData, updateUser, loading } = useUser();
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
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

  const [gameStats, setGameStats] = useState({ highScore: 0, gamesPlayed: 0 });

  useEffect(() => {
    const hs = Number(localStorage.getItem('perga_high_score') || 0);
    const gp = Number(localStorage.getItem('perga_games_played') || 0);
    setGameStats({ highScore: hs, gamesPlayed: gp });
  }, []);

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
      toast.error(t('profile.validImageError'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error(t('profile.imageSizeError'));
      return;
    }

    const formData = new FormData();
    const fieldName = type === 'profile' ? 'avatar' : 'coverPhoto';
    formData.append(fieldName, file);

    const endpoint = type === 'profile' ? '/users/profile/avatar' : '/users/profile/cover-photo';
    const toastId = toast.loading(`${t('profile.uploading')} ${type} ${t('profile.photoUpdated')}`);

    try {
      const response = await api.put(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user context with new image URL
      // UserContext.updateUser handles localStorage persistence automatically
      const updatedData = type === 'profile'
        ? { avatar: response.data.avatar }
        : { coverPhoto: response.data.coverPhoto };

      updateUser(updatedData);

      console.log(`${type} photo updated:`, updatedData);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${t('profile.photoUpdated')}`, { id: toastId });
    } catch (error) {
      console.error(`Failed to upload ${type} photo:`, error);
      toast.error(`${t('profile.uploadFailed')} ${type} photo.`, { id: toastId });
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading(t('profile.updatingProfile'));
    try {
      console.log('Saving profile with data:', {
        name: formData.name,
        username: formData.username,
        email: formData.email
      });
      const response = await api.put('/users/profile', formData);
      console.log('Profile update response:', {
        username: response.data.username,
        full_name: response.data.full_name,
        name: response.data.name,
        avatar: response.data.avatar,
        coverPhoto: response.data.coverPhoto
      });

      // Map backend response to frontend User format
      // Include avatar and coverPhoto to ensure they're preserved
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
        // Include avatar and coverPhoto from response to preserve them
        avatar: response.data.avatar || response.data.avatar_url,
        coverPhoto: response.data.coverPhoto || response.data.cover_photo,
      };

      console.log('Updating user context with:', {
        username: updatedUserData.username,
        name: updatedUserData.name,
        avatar: updatedUserData.avatar,
        coverPhoto: updatedUserData.coverPhoto
      });

      // Update user context - this also handles localStorage persistence
      updateUser(updatedUserData);

      console.log('Profile save complete. Username should now be:', updatedUserData.username);

      // Exit edit mode after successful save
      setIsEditMode(false);

      toast.success(t('profile.profileUpdated'), { id: toastId });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(t('profile.updateFailed'), { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-muted">Profile data not available.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-background text-foreground min-h-screen flex flex-col lg:block"
    >
      {/* Sticky Header Section - Cover, Profile Picture, Info, and Tabs (mobile only) */}
      <div className="sticky top-0 z-40 lg:static">
        {/* Cover Image - Smaller on mobile */}
        <div
          className="w-full h-20 sm:h-32 md:h-48 bg-cover bg-center relative"
          style={{
            backgroundImage: profileData.coverPhoto ? `url(${profileData.coverPhoto})` : undefined,
            backgroundColor: 'rgb(var(--bg-secondary))'
          }}
        >
          {isEditMode && (
            <button
              onClick={() => coverPhotoRef.current?.click()}
              className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 z-10"
            >
              <Camera size={20} />
              {t('profile.changeCover')}
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

        {/* Profile Header - More compact on mobile */}
        <div className="w-full p-2 sm:p-4 md:p-6 bg-background relative">
          {/* Profile Picture - Smaller on mobile */}
          <div className="absolute -top-8 sm:-top-12 left-2 sm:left-4 z-30">
            <div className="relative">
              <Avatar
                src={profileData.avatar || '/default-avatar.png'}
                alt={profileData.name}
                size="xl"
                userId={profileData.id}
                showOnlineStatus={true}
                className="border-2 sm:border-4 border-background bg-background-secondary"
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

          <div className="mt-10 sm:mt-14 flex flex-col md:flex-row md:items-center md:justify-between w-full">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">{profileData.name}</h1>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg">@{profileData.username}</p>
              {profileData.bio && (
                <p className="text-gray-300 mt-1 sm:mt-2 max-w-xl text-xs sm:text-sm md:text-base line-clamp-2">{profileData.bio}</p>
              )}

              {/* Basic Info - Always Visible, Compact on mobile */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 mt-2 sm:mt-3 text-[10px] sm:text-xs md:text-sm text-gray-400 flex-wrap">
                <span className="flex items-center gap-0.5 sm:gap-1">
                  <Calendar size={12} className="sm:w-4 sm:h-4 text-accent" />
                  <span className="hidden sm:inline">{t('profile.joined')}</span>
                  <span className="text-[10px] sm:text-xs">{new Date(profileData.joinDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </span>
              </div>

              {/* Additional Details - Hidden by default, shown when "Learn more" is clicked */}
              {showMoreDetails && (
                <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-400 flex-wrap">
                  {profileData.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={16} className="text-accent" /> {profileData.location}
                    </span>
                  )}
                  {profileData.website && (
                    <span className="flex items-center gap-1">
                      <Link2 size={16} className="text-accent" />
                      {(() => {
                        try {
                          const url = new URL(profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`);
                          return (
                            <a href={url.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent-hover transition-colors">
                              {url.hostname}
                            </a>
                          );
                        } catch {
                          return <span>{profileData.website}</span>;
                        }
                      })()}
                    </span>
                  )}
                  {profileData.occupation && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={16} className="text-accent" /> {profileData.occupation}
                    </span>
                  )}
                  {profileData.education && (
                    <span className="flex items-center gap-1">
                      <GraduationCap size={16} className="text-accent" /> {profileData.education}
                    </span>
                  )}
                  {profileData.relationship && (
                    <span className="flex items-center gap-1">
                      <Heart size={16} className="text-accent" /> {profileData.relationship}
                    </span>
                  )}
                </div>
              )}

              {/* Learn More / Show Less Toggle */}
              {(profileData.location || profileData.website || profileData.occupation || profileData.education || profileData.relationship) && (
                <button
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="mt-2 flex items-center gap-1 text-white hover:text-gray-300 text-xs sm:text-sm font-medium transition-colors"
                >
                  {showMoreDetails ? (
                    <>
                      <ChevronUp size={14} />
                      {t('profile.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      {t('profile.learnMore')}
                    </>
                  )}
                </button>
              )}
            </div>
            {/* Stats - More compact on mobile */}
            <div className="flex gap-3 sm:gap-4 mt-3 sm:mt-4 md:mt-0 flex-shrink-0">
              <div className="text-center">
                <span className="block text-base sm:text-lg md:text-xl font-bold text-white">{profileData.stats?.posts || 0}</span>
                <span className="text-gray-400 text-xs sm:text-sm">{t('profile.posts')}</span>
              </div>
              <div className="text-center">
                <span className="block text-base sm:text-lg md:text-xl font-bold text-white">{profileData.stats?.followers || 0}</span>
                <span className="text-gray-400 text-xs sm:text-sm">{t('profile.followers')}</span>
              </div>
              <div className="text-center">
                <span className="block text-base sm:text-lg md:text-xl font-bold text-white">{profileData.stats?.following || 0}</span>
                <span className="text-gray-400 text-xs sm:text-sm">{t('profile.following')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Tabs - Part of sticky header, more compact on mobile */}
        <div className="bg-background w-full border-b border-border">
          <div className="flex justify-around px-1 sm:px-2 md:px-4 overflow-x-auto bg-background">
            <TabButton
              label={t('profile.gallery')}
              icon={<Trophy size={18} />}
              isActive={activeTab === 'posts'}
              onClick={() => setActiveTab('posts')}
            />
            <TabButton
              label={t('profile.puurgas')}
              icon={<Flame size={18} />}
              isActive={activeTab === 'puurgas'}
              onClick={() => setActiveTab('puurgas')}
            />
            <TabButton
              label={t('profile.gaming')}
              icon={<Gamepad2 size={18} />}
              isActive={activeTab === 'gaming'}
              onClick={() => setActiveTab('gaming')}
            />
            <TabButton
              label={t('profile.settings')}
              icon={<Settings size={18} />}
              isActive={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content Section - Only tabs content scrolls */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-4">
        <div className="p-2 sm:p-4 min-h-[300px] w-full">
          {activeTab === 'posts' && <GalleryTab />}
          {activeTab === 'puurgas' && <PurgasTab />}
          {activeTab === 'gaming' && (
            <div className="space-y-4">
              <div className="text-center text-muted py-4">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('profile.gamingStats')}</h3>
                <p className="text-muted">{t('profile.gamingAchievements')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/puurga-games/sword-of-judgment'}
                  className="bg-card p-4 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer text-left group shadow-theme-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-300 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-lg">⚔️</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">Sword of Judgment</h4>
                      <p className="text-sm text-muted">{t('profile.clickToPlay')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted mb-1">{t('profile.highScore')}: {gameStats.highScore}</p>
                  <p className="text-sm text-muted">{t('profile.gamesPlayed')}: {gameStats.gamesPlayed}</p>
                </button>
                <div className="bg-card p-4 rounded-lg border border-border shadow-theme-sm">
                  <h4 className="font-medium text-foreground mb-2">{t('profile.totalCredits')}</h4>
                  <p className="text-sm text-muted mb-2">{t('profile.earned')}: {profileData?.credits || 0}</p>
                  <p className="text-sm text-muted">{t('profile.rank')}: {(profileData?.credits || 0) > 500 ? 'Elite' : 'Survivor'}</p>
                </div>
                <button
                  onClick={() => window.location.href = '/new-game'}
                  className="bg-card p-4 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer text-left group shadow-theme-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">Redemption</h4>
                      <p className="text-sm text-muted">{t('profile.restoreStatus')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted mb-1">{t('profile.statusActive')}</p>
                  <p className="text-sm text-muted">{t('profile.playToEarn')}</p>
                </button>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">{t('profile.profileSettings')}</h3>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors font-semibold"
                      >
                        {t('profile.saveProfile')}
                      </button>
                      <button
                        onClick={() => setIsEditMode(false)}
                        className="bg-muted text-white px-4 py-2 rounded-lg hover:bg-muted-light transition-colors font-semibold"
                      >
                        {t('profile.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors font-semibold"
                    >
                      {t('profile.editProfile')}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inputs */}
                {['name', 'username', 'email', 'location', 'website', 'occupation', 'education'].map((field) => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-sm font-medium text-muted">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input
                      type={field === 'email' ? 'email' : 'text'}
                      id={field}
                      name={field}
                      value={(formData as any)[field]}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      className={`mt-1 block w-full bg-input border border-input-border rounded-md shadow-theme-sm py-2 px-3 text-foreground focus:outline-none focus:ring-accent focus:border-accent ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="relationship" className="block text-sm font-medium text-muted">{t('profile.relationshipStatus')}</label>
                  <select
                    id="relationship"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleSelectChange}
                    disabled={!isEditMode}
                    className={`mt-1 block w-full bg-input border border-input-border rounded-md shadow-theme-sm py-2 px-3 text-foreground focus:outline-none focus:ring-accent focus:border-accent ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">{t('profile.select')}</option>
                    <option value="single">{t('profile.single')}</option>
                    <option value="in a relationship">{t('profile.inRelationship')}</option>
                    <option value="married">{t('profile.married')}</option>
                    <option value="complicated">{t('profile.complicated')}</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="bio" className="block text-sm font-medium text-muted">{t('profile.bio')}</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  className={`mt-1 block w-full bg-input border border-input-border rounded-md shadow-theme-sm py-2 px-3 text-foreground focus:outline-none focus:ring-accent focus:border-accent ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                ></textarea>
              </div>

              <h3 className="text-xl font-bold text-foreground mt-6 mb-4">{t('profile.privacySettings')}</h3>
              <div className="space-y-3">
                {[
                  { id: 'isPrivate', label: t('profile.makePrivate') },
                  { id: 'hideFromSuggestions', label: t('profile.hideFromSuggestions') },
                  { id: 'showReadReceipts', label: t('profile.showReadReceipts') },
                  { id: 'showOnlineStatus', label: t('profile.showOnlineStatus') }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <label htmlFor={item.id} className="text-muted">{item.label}</label>
                    <input
                      type="checkbox"
                      id={item.id}
                      name={item.id}
                      checked={(formData as any)[item.id]}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      className={`h-4 w-4 text-accent border-input-border rounded focus:ring-accent ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                ))}

                {[
                  { id: 'messageRequests', label: t('profile.messageRequests'), options: ['everyone', 'followers', 'none'] },
                  { id: 'commentPrivacy', label: t('profile.commentPrivacy'), options: ['everyone', 'followers', 'none'] },
                  { id: 'storyPrivacy', label: t('profile.storyPrivacy'), options: ['everyone', 'followers', 'close_friends'] }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <label htmlFor={item.id} className="text-muted">{item.label}</label>
                    <select
                      id={item.id}
                      name={item.id}
                      value={(formData as any)[item.id]}
                      onChange={handleSelectChange}
                      disabled={!isEditMode}
                      className={`mt-1 block w-1/2 bg-input border border-input-border rounded-md shadow-sm py-2 px-3 text-foreground focus:outline-none focus:ring-accent focus:border-accent ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {item.options.map(opt => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

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
    className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium focus:outline-none transition-all duration-200 whitespace-nowrap flex-shrink-0 shadow-theme-sm
      ${isActive
        ? 'bg-gray-700 text-white border-b-2 border-gray-700 rounded-t-md'
        : 'text-muted hover:text-foreground hover:bg-gray-800 hover:text-white rounded-t-md border-b-2 border-transparent'
      }`}
    onClick={onClick}
    title={label}
  >
    <span className="w-4 h-4 sm:w-5 sm:h-5">{icon}</span>
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default Profile;