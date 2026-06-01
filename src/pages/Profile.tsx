import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import { Camera, Settings, Heart, Calendar, MapPin, Loader2, AlertCircle, AlertTriangle, Link2, Briefcase, GraduationCap, ChevronUp, ChevronDown, Trophy, Flame, Gamepad2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '../components/Avatar';
import PurgasTab from '../components/Profile/PurgasTab';
import GalleryTab from '../components/Profile/GalleryTab';
import Button from '../components/ui/Button';
import { useSurvival } from '../context/SurvivalContext';
import { SurvivalBadge } from '../components/Survival';

type ProfileTab = 'posts' | 'puurgas' | 'gaming' | 'settings';

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

  const { survivalState } = useSurvival();

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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('profile.validImageError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageSizeError'));
      return;
    }

    const fd = new FormData();
    const fieldName = type === 'profile' ? 'avatar' : 'coverPhoto';
    fd.append(fieldName, file);

    const endpoint = type === 'profile' ? '/users/profile/avatar' : '/users/profile/cover-photo';
    const toastId = toast.loading(`${t('profile.uploading')} ${type} ${t('profile.photoUpdated')}`);

    try {
      const response = await api.put(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedData = type === 'profile'
        ? { avatar: response.data.avatar }
        : { coverPhoto: response.data.coverPhoto };
      updateUser(updatedData);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${t('profile.photoUpdated')}`, { id: toastId });
    } catch (error) {
      toast.error(`${t('profile.uploadFailed')} ${type} photo.`, { id: toastId });
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading(t('profile.updatingProfile'));
    try {
      const response = await api.put('/users/profile', formData);
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
        avatar: response.data.avatar || response.data.avatar_url,
        coverPhoto: response.data.coverPhoto || response.data.cover_photo,
      };
      updateUser(updatedUserData);
      setIsEditMode(false);
      toast.success(t('profile.profileUpdated'), { id: toastId });
    } catch (error) {
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="bg-background text-foreground min-h-screen"
    >
      {/* ── Cover Photo ─────────────────────────────────────────── */}
      <div className="relative w-full">
        <div
          className="w-full bg-[var(--bg-secondary)] relative overflow-hidden"
          style={{ height: 'clamp(160px, 28vw, 320px)' }}
        >
          {profileData.coverPhoto ? (
            <img
              src={profileData.coverPhoto}
              alt="Cover"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            /* Subtle gradient placeholder */
            <div className="w-full h-full bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--card)] to-[var(--bg-secondary)]" />
          )}

          {/* Soft bottom fade so the header blends in */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

          {isEditMode && (
            <button
              onClick={() => coverPhotoRef.current?.click()}
              className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg hover:bg-black/70 transition-colors flex items-center gap-2 text-sm z-10 border border-white/10"
            >
              <Camera size={15} />
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

        {/* ── Avatar + Info strip ──────────────────────────────── */}
        <div className="px-4 sm:px-6 md:px-8 pb-0 relative">
          {/* Avatar — overlaps the cover by half its height */}
          <div className="absolute left-4 sm:left-6 md:left-8" style={{ top: '-40px' }}>
            <div className="relative">
              <Avatar
                src={profileData.avatar || '/default-avatar.png'}
                alt={profileData.name}
                size="lg"
                userId={profileData.id}
                showOnlineStatus={true}
                className="border-[3px] border-background ring-0 bg-background w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover"
              />
              {isEditMode && (
                <button
                  onClick={() => profilePictureRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/80 transition-colors z-40 border border-white/10"
                >
                  <Camera size={14} className="text-white" />
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

          {/* Right side: stats row */}
          <div className="flex justify-end pt-3 pb-2">
            <div className="flex gap-5 sm:gap-7">
              {[
                { value: profileData.stats?.posts || 0, label: t('profile.posts') },
                { value: profileData.stats?.followers || 0, label: t('profile.followers') },
                { value: profileData.stats?.following || 0, label: t('profile.following') },
                { value: profileData.stats?.puurgas || 0, label: t('profile.puurgas') },
                { value: profileData.stats?.credits || profileData.credits || 0, label: 'Credits', accent: true },
              ].map(({ value, label, accent }) => (
                <div key={label} className="text-center">
                  <span className={`block text-sm sm:text-base font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>
                    {value}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Survival Badge */}
          {survivalState && (
            <div className="absolute right-4 top-20 sm:top-24">
              <SurvivalBadge
                state={survivalState.current_survival_state as any}
                reputationScore={survivalState.reputation_score}
                size="md"
              />
            </div>
          )}

          {/* Name / username / bio / meta — sits below avatar */}
          <div className="pt-2 pb-4" style={{ paddingLeft: 'calc(80px + 1rem)' /* avatar width + gap */ }}>
            {/* On mobile the avatar is smaller and we want text to start below it */}
          </div>
        </div>

        {/* Name block — full width, below the avatar overlap zone */}
        <div className="px-4 sm:px-6 md:px-8 pb-4 -mt-2">
          <div className="mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{profileData.name}</h1>
            <p className="text-muted text-sm mt-0.5">@{profileData.username}</p>

            {profileData.bio && (
              <p className="text-sm text-foreground/80 mt-2 max-w-lg leading-relaxed">{profileData.bio}</p>
            )}

            {/* Always-visible meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-accent flex-shrink-0" />
                {t('profile.joined')}{' '}
                {new Date(profileData.joinDate || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric'
                })}
              </span>
            </div>

            {/* Expandable details */}
            {showMoreDetails && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
                {profileData.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-accent flex-shrink-0" /> {profileData.location}
                  </span>
                )}
                {profileData.website && (
                  <span className="flex items-center gap-1">
                    <Link2 size={12} className="text-accent flex-shrink-0" />
                    {(() => {
                      try {
                        const url = new URL(profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`);
                        return (
                          <a href={url.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
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
                    <Briefcase size={12} className="text-accent flex-shrink-0" /> {profileData.occupation}
                  </span>
                )}
                {profileData.education && (
                  <span className="flex items-center gap-1">
                    <GraduationCap size={12} className="text-accent flex-shrink-0" /> {profileData.education}
                  </span>
                )}
                {profileData.relationship && (
                  <span className="flex items-center gap-1">
                    <Heart size={12} className="text-accent flex-shrink-0" /> {profileData.relationship}
                  </span>
                )}
              </div>
            )}

            {(profileData.location || profileData.website || profileData.occupation || profileData.education || profileData.relationship) && (
              <button
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="mt-2 flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
              >
                {showMoreDetails ? <><ChevronUp size={12} /> {t('profile.showLess')}</> : <><ChevronDown size={12} /> {t('profile.learnMore')}</>}
              </button>
            )}
          </div>

          {/* Survival status indicator */}
          {survivalState && survivalState.current_survival_state !== 'SAFE' && (
            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              survivalState.current_survival_state === 'WARNING'
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                : survivalState.current_survival_state === 'HUNTED'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : survivalState.current_survival_state === 'COLLAPSING'
                    ? 'bg-red-600/10 text-red-500 border border-red-600/20'
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
            }`}>
              <AlertTriangle size={12} />
              {survivalState.current_survival_state === 'WARNING' && 'Survival warning — improve activity'}
              {survivalState.current_survival_state === 'HUNTED' && 'Hunted — you are at risk'}
              {survivalState.current_survival_state === 'COLLAPSING' && 'Collapsing — immediate action needed'}
              {survivalState.current_survival_state === 'GHOSTED' && 'Ghosted — account suspended'}
            </div>
          )}

          {/* Purgatory info section for ghosted users */}
          {survivalState?.purgatory_status && (
            <div className="mt-3 p-3 bg-gray-900/20 border border-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Redemption Progress</span>
                <span className="text-xs font-medium text-gray-400">{survivalState.redemption_progress ?? 0}%</span>
              </div>
              <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gray-500 rounded-full transition-all duration-500"
                  style={{ width: `${survivalState.redemption_progress ?? 0}%` }}
                />
              </div>
              <a
                href="/purgatory"
                className="block text-center py-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-900/50 hover:bg-gray-800 rounded-lg transition-colors border border-gray-800"
              >
                View Purgatory Dashboard
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-background sticky top-0 z-20">
        <div className="flex px-2 sm:px-4 md:px-8 overflow-x-auto scrollbar-none">
          <TabButton label={t('profile.gallery')} icon={<Trophy size={16} />} isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
          <TabButton label={t('profile.puurgas')} icon={<Flame size={16} />} isActive={activeTab === 'puurgas'} onClick={() => setActiveTab('puurgas')} />
          <TabButton label={t('profile.gaming')} icon={<Gamepad2 size={16} />} isActive={activeTab === 'gaming'} onClick={() => setActiveTab('gaming')} />
          <TabButton label={t('profile.settings')} icon={<Settings size={16} />} isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 md:px-8 py-6 pb-24 min-h-[300px]">
        {activeTab === 'posts' && <GalleryTab />}
        {activeTab === 'puurgas' && <PurgasTab />}

        {activeTab === 'gaming' && (
          <div className="space-y-6 max-w-2xl">
            <div className="text-center py-6">
              <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-accent" />
              <h3 className="text-base font-semibold text-foreground mb-1">{t('profile.gamingStats')}</h3>
              <p className="text-sm text-muted">{t('profile.gamingAchievements')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => window.location.href = '/puurga-games/sword-of-judgment'}
                className="bg-card p-4 rounded-xl border border-border hover:border-accent/50 transition-all duration-200 cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-base">⚔️</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">Sword of Judgment</h4>
                    <p className="text-xs text-muted">{t('profile.clickToPlay')}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted">
                  <span>{t('profile.highScore')}: <span className="text-foreground font-medium">{gameStats.highScore}</span></span>
                  <span>{t('profile.gamesPlayed')}: <span className="text-foreground font-medium">{gameStats.gamesPlayed}</span></span>
                </div>
              </button>

              <div className="bg-card p-4 rounded-xl border border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">{t('profile.totalCredits')}</h4>
                <div className="flex gap-4 text-xs text-muted">
                  <span>{t('profile.earned')}: <span className="text-accent font-semibold">{profileData?.credits || 0}</span></span>
                  <span>{t('profile.rank')}: <span className="text-foreground font-medium">{(profileData?.credits || 0) > 500 ? 'Elite' : 'Survivor'}</span></span>
                </div>
              </div>

              <button
                onClick={() => window.location.href = '/new-game'}
                className="bg-card p-4 rounded-xl border border-border hover:border-accent/50 transition-all duration-200 cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">Redemption</h4>
                    <p className="text-xs text-muted">{t('profile.restoreStatus')}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted">
                  <span>{t('profile.statusActive')}</span>
                  <span>{t('profile.playToEarn')}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Profile Settings</h3>
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <Button variant="primary" onClick={handleSave}>{t('profile.saveProfile')}</Button>
                    <Button variant="default" onClick={() => setIsEditMode(false)}>{t('profile.cancel')}</Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={() => setIsEditMode(true)}>{t('profile.editProfile')}</Button>
                )}
              </div>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['name', 'username', 'email', 'location', 'website', 'occupation', 'education'].map((field) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-xs font-medium text-muted mb-1">
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    id={field}
                    name={field}
                    value={(formData as any)[field]}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                    className={`block w-full bg-input border border-input-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              ))}

              <div>
                <label htmlFor="relationship" className="block text-xs font-medium text-muted mb-1">{t('profile.relationshipStatus')}</label>
                <select
                  id="relationship"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleSelectChange}
                  disabled={!isEditMode}
                  className={`block w-full bg-input border border-input-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">{t('profile.select')}</option>
                  <option value="single">{t('profile.single')}</option>
                  <option value="in a relationship">{t('profile.inRelationship')}</option>
                  <option value="married">{t('profile.married')}</option>
                  <option value="complicated">{t('profile.complicated')}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-xs font-medium text-muted mb-1">{t('profile.bio')}</label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleInputChange}
                disabled={!isEditMode}
                className={`block w-full bg-input border border-input-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Privacy section */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">{t('profile.privacySettings')}</h4>
              <div className="space-y-3">
                {[
                  { id: 'isPrivate', label: t('profile.makePrivate') },
                  { id: 'hideFromSuggestions', label: t('profile.hideFromSuggestions') },
                  { id: 'showReadReceipts', label: t('profile.showReadReceipts') },
                  { id: 'showOnlineStatus', label: t('profile.showOnlineStatus') }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <label htmlFor={item.id} className="text-sm text-muted">{item.label}</label>
                    <input
                      type="checkbox"
                      id={item.id}
                      name={item.id}
                      checked={(formData as any)[item.id]}
                      onChange={handleInputChange}
                      disabled={!isEditMode}
                      className={`h-4 w-4 text-accent border-input-border rounded focus:ring-accent ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                ))}

                {[
                  { id: 'messageRequests', label: t('profile.messageRequests'), options: ['everyone', 'followers', 'none'] },
                  { id: 'commentPrivacy', label: t('profile.commentPrivacy'), options: ['everyone', 'followers', 'none'] },
                  { id: 'storyPrivacy', label: t('profile.storyPrivacy'), options: ['everyone', 'followers', 'close_friends'] }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <label htmlFor={item.id} className="text-sm text-muted">{item.label}</label>
                    <select
                      id={item.id}
                      name={item.id}
                      value={(formData as any)[item.id]}
                      onChange={handleSelectChange}
                      disabled={!isEditMode}
                      className={`bg-input border border-input-border rounded-lg py-1.5 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {item.options.map(opt => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex-shrink-0
      ${isActive
        ? 'border-accent text-accent'
        : 'border-transparent text-muted hover:text-foreground hover:border-border'
      }`}
  >
    <span className="w-4 h-4">{icon}</span>
    <span>{label}</span>
  </button>
);

export default Profile;