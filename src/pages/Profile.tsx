import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import {
  Camera, Settings, Heart, Calendar, MapPin, Loader2, AlertCircle, AlertTriangle,
  Link2, Briefcase, GraduationCap, ChevronUp, ChevronDown, Trophy, Flame, Gamepad2,
  Shield, Pencil, ImagePlus, BadgeCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '../components/Avatar';
import PurgasTab from '../components/Profile/PurgasTab';
import GalleryTab from '../components/Profile/GalleryTab';
import Button from '../components/UI/Button';
import { useSurvival } from '../context/SurvivalContext';
import { SurvivalBadge } from '../components/Survival';
import CertificationBadges from '../components/Profile/CertificationBadges';
import CertificationPanel from '../components/Profile/CertificationPanel';
import { DEFAULT_IMAGES } from '../constants/defaultImages';
import { formatCredits } from '../utils/formatCredits';
import CreditTransactionHistory from '../components/Credits/CreditTransactionHistory';
import CreditTransferPanel from '../components/Credits/CreditTransferPanel';
import {
  BIO_MAX_LENGTH,
  bioCounterClass,
  bioRemaining,
  clampBio,
  formatBioForDisplay,
} from '../utils/bioLimits';

type ProfileTab = 'posts' | 'puurgas' | 'gaming' | 'verified' | 'settings';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const { user: profileData, updateUser, loading } = useUser();
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
    storyPrivacy: 'everyone',
  });

  const { survivalState } = useSurvival();
  const [gameStats, setGameStats] = useState({ highScore: 0, gamesPlayed: 0 });

  useEffect(() => {
    setGameStats({
      highScore: Number(localStorage.getItem('perga_high_score') || 0),
      gamesPlayed: Number(localStorage.getItem('perga_games_played') || 0),
    });
  }, []);

  useEffect(() => {
    if (!profileData) return;
    setFormData({
      name: profileData.name || '',
      username: profileData.username || '',
      email: profileData.email || '',
      bio: clampBio(profileData.bio || ''),
      location: profileData.location || '',
      website: profileData.website || '',
      occupation: profileData.occupation || '',
      education: profileData.education || '',
      relationship: profileData.relationship || '',
      isPrivate: profileData.isPrivate || false,
      hideFromSuggestions: profileData.hideFromSuggestions || false,
      messageRequests: profileData.messageRequests || 'everyone',
      showReadReceipts: profileData.showReadReceipts ?? true,
      showOnlineStatus: profileData.showOnlineStatus ?? true,
      commentPrivacy: profileData.commentPrivacy || 'everyone',
      storyPrivacy: profileData.storyPrivacy || 'everyone',
    });
  }, [profileData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const nextValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : name === 'bio'
          ? clampBio(value)
          : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
    fd.append(type === 'profile' ? 'avatar' : 'coverPhoto', file);
    const endpoint = type === 'profile' ? '/users/profile/avatar' : '/users/profile/cover-photo';
    const toastId = toast.loading(
      `${t('profile.uploading')} ${type === 'cover' ? 'cover' : 'profile'}…`,
    );

    if (type === 'cover') setUploadingCover(true);
    else setUploadingAvatar(true);

    try {
      const response = await api.put(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (type === 'profile') {
        updateUser({ avatar: response.data.avatar || response.data.avatar_url });
      } else {
        updateUser({ coverPhoto: response.data.coverPhoto || response.data.cover_photo });
      }
      toast.success(
        `${type === 'cover' ? 'Cover' : 'Profile'} ${t('profile.photoUpdated')}`,
        { id: toastId },
      );
    } catch {
      toast.error(`${t('profile.uploadFailed')} ${type} photo.`, { id: toastId });
    } finally {
      setUploadingCover(false);
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading(t('profile.updatingProfile'));
    try {
      const response = await api.put('/users/profile', formData);
      updateUser({
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
      });
      setIsEditMode(false);
      toast.success(t('profile.profileUpdated'), { id: toastId });
    } catch {
      toast.error(t('profile.updateFailed'), { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-muted">Profile data not available.</p>
      </div>
    );
  }

  const coverSrc = profileData.coverPhoto || DEFAULT_IMAGES.cover;
  const displayName = profileData.name || profileData.username || 'User';
  const stats = [
    { value: profileData.stats?.posts || 0, label: t('profile.posts') },
    { value: profileData.stats?.followers || 0, label: t('profile.followers') },
    { value: profileData.stats?.following || 0, label: t('profile.following') },
    { value: profileData.stats?.puurgas || 0, label: t('profile.puurgas') },
    { value: formatCredits(profileData.stats?.credits || profileData.credits || 0), label: 'Credits', accent: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-background text-foreground min-h-full pb-8 min-w-0 overflow-x-hidden"
    >
      {/* ── Cover ─────────────────────────────────────────────── */}
      <div className="relative w-full group/cover rounded-2xl overflow-hidden border border-border/60 shadow-theme-md">
        <div className="relative h-44 sm:h-52 md:h-64 lg:h-72 w-full overflow-hidden bg-[var(--bg-secondary)]">
          <img
            src={coverSrc}
            alt="Cover"
            className="w-full h-full object-cover object-center scale-105 group-hover/cover:scale-100 transition-transform duration-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_IMAGES.cover;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent pointer-events-none" />

          {/* Cover change — always available */}
          <button
            type="button"
            onClick={() => coverPhotoRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/55 backdrop-blur-md text-white text-sm font-medium border border-white/15 hover:bg-black/75 transition-all shadow-lg opacity-100 sm:opacity-0 sm:group-hover/cover:opacity-100 focus:opacity-100"
          >
            {uploadingCover ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ImagePlus size={15} />
            )}
            {profileData.coverPhoto ? t('profile.changeCover') : 'Add cover'}
          </button>
          <input
            type="file"
            ref={coverPhotoRef}
            onChange={(e) => handleImageUpload(e, 'cover')}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
          />
        </div>

        {/* ── Identity strip ──────────────────────────────────── */}
        <div className="relative px-1 sm:px-2 pb-5 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0 self-start sm:self-auto ml-1">
              <div className="relative rounded-full p-1 bg-background shadow-xl ring-1 ring-border/80">
                <Avatar
                  src={profileData.avatar || DEFAULT_IMAGES.avatar}
                  alt={displayName}
                  size="lg"
                  userId={profileData.id}
                  showOnlineStatus
                  className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => profilePictureRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 bg-foreground text-background p-2 rounded-full hover:scale-105 transition-transform z-40 shadow-md border-2 border-background"
                  title="Change photo"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
                <input
                  type="file"
                  ref={profilePictureRef}
                  onChange={(e) => handleImageUpload(e, 'profile')}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />
              </div>
            </div>

            {/* Name + actions */}
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight truncate">
                    {displayName}
                  </h1>
                  <CertificationBadges
                    certificationSlug={profileData.certificationSlug}
                    logoCertified={profileData.logoCertified}
                    size="md"
                  />
                  {survivalState && (
                    <SurvivalBadge
                      state={survivalState.current_survival_state as any}
                      reputationScore={survivalState.reputation_score}
                      size="sm"
                    />
                  )}
                </div>
                <p className="text-muted text-sm mt-0.5">@{profileData.username}</p>
              </div>

              <div className="profile-identity-actions flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setActiveTab('verified')}
                  className="gap-1.5"
                >
                  <BadgeCheck size={14} />
                  Get verified
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => coverPhotoRef.current?.click()}
                  className="gap-1.5"
                >
                  <ImagePlus size={14} />
                  Cover
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsEditMode(true);
                  }}
                  className="gap-1.5"
                >
                  <Pencil size={14} />
                  {t('profile.editProfile')}
                </Button>
              </div>
            </div>
          </div>

          {/* Bio + meta + stats */}
          <div className="profile-hero-meta mt-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0 flex-1 space-y-3">
              {profileData.bio ? (
                <p className="text-sm text-foreground/90 max-w-2xl leading-relaxed break-words">
                  {formatBioForDisplay(profileData.bio)}
                </p>
              ) : (
                <p className="text-sm text-muted italic">No bio yet — tell people who you are.</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-accent flex-shrink-0" />
                  {t('profile.joined')}{' '}
                  {new Date(profileData.joinDate || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {showMoreDetails && profileData.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-accent" /> {profileData.location}
                  </span>
                )}
                {showMoreDetails && profileData.website && (
                  <span className="flex items-center gap-1.5">
                    <Link2 size={12} className="text-accent" />
                    {(() => {
                      try {
                        const url = new URL(
                          profileData.website.startsWith('http')
                            ? profileData.website
                            : `https://${profileData.website}`,
                        );
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
                {showMoreDetails && profileData.occupation && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={12} className="text-accent" /> {profileData.occupation}
                  </span>
                )}
                {showMoreDetails && profileData.education && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={12} className="text-accent" /> {profileData.education}
                  </span>
                )}
                {showMoreDetails && profileData.relationship && (
                  <span className="flex items-center gap-1.5">
                    <Heart size={12} className="text-accent" /> {profileData.relationship}
                  </span>
                )}
              </div>

              {(profileData.location || profileData.website || profileData.occupation || profileData.education || profileData.relationship) && (
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                >
                  {showMoreDetails ? (
                    <><ChevronUp size={12} /> {t('profile.showLess')}</>
                  ) : (
                    <><ChevronDown size={12} /> {t('profile.learnMore')}</>
                  )}
                </button>
              )}

              {survivalState && survivalState.current_survival_state !== 'SAFE' && (
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    survivalState.current_survival_state === 'WARNING'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : survivalState.current_survival_state === 'HUNTED'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : survivalState.current_survival_state === 'COLLAPSING'
                          ? 'bg-red-600/10 text-red-500 border border-red-600/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}
                >
                  <AlertTriangle size={12} />
                  {survivalState.current_survival_state === 'WARNING' && 'Survival warning — improve activity'}
                  {survivalState.current_survival_state === 'HUNTED' && 'Hunted — you are at risk'}
                  {survivalState.current_survival_state === 'COLLAPSING' && 'Collapsing — immediate action needed'}
                  {survivalState.current_survival_state === 'GHOSTED' && 'Ghosted — account suspended'}
                </div>
              )}

              {survivalState?.purgatory_status && (
                <div className="p-3 bg-card/80 border border-border rounded-xl max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted">Redemption Progress</span>
                    <span className="text-xs font-medium text-foreground">{survivalState.redemption_progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${survivalState.redemption_progress ?? 0}%` }}
                    />
                  </div>
                  <a
                    href="/purgatory"
                    className="block text-center py-1.5 text-xs text-muted hover:text-foreground bg-background/60 hover:bg-background rounded-lg transition-colors border border-border"
                  >
                    View Purgatory Dashboard
                  </a>
                </div>
              )}
            </div>

            {/* Stats cards */}
            <div className="profile-stats-grid grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 flex-shrink-0 w-full lg:w-auto min-w-0">
              {/* Ghost Status / Risk tile — desktop only */}
              <div className="hidden lg:flex rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm px-2 sm:px-3 py-2.5 text-center min-w-0 flex-col items-center justify-center hover:border-accent/40 transition-colors">
                {(() => {
                  if (!survivalState) return null;
                  const state = survivalState.current_survival_state;
                  const isCritical = state === 'COLLAPSING' || state === 'GHOSTED';
                  const isWarning = state === 'HUNTED' || state === 'WARNING';
                  return (
                    <>
                      <span className={`block text-base sm:text-lg font-bold tabular-nums truncate ${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500'}`}>
                        {state === 'GHOSTED' ? 'Ghosted' : state === 'COLLAPSING' ? 'Critical' : state === 'HUNTED' ? 'Hunted' : state === 'WARNING' ? 'Warning' : 'Safe'}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-muted uppercase tracking-wide truncate block">Ghost Risk</span>
                    </>
                  );
                })()}
              </div>
              {stats.map(({ value, label, accent }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm px-2 sm:px-3 py-2.5 text-center min-w-0 hover:border-accent/40 transition-colors"
                >
                  <span className={`block text-base sm:text-lg font-bold tabular-nums truncate ${accent ? 'text-accent' : 'text-foreground'}`}>
                    {value}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-muted uppercase tracking-wide truncate block">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="mt-4 sticky top-14 z-20 bg-background/90 backdrop-blur-md border-b border-border -mx-[var(--page-shell-pad-x,20px)] px-[var(--page-shell-pad-x,20px)]">
        <div className="flex overflow-x-auto scrollbar-none">
          <TabButton label={t('profile.gallery')} icon={<Trophy size={16} />} isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
          <TabButton label={t('profile.puurgas')} icon={<Flame size={16} />} isActive={activeTab === 'puurgas'} onClick={() => setActiveTab('puurgas')} />
          <TabButton label={t('profile.gaming')} icon={<Gamepad2 size={16} />} isActive={activeTab === 'gaming'} onClick={() => setActiveTab('gaming')} />
          <TabButton label={t('profile.verified', 'Verified')} icon={<BadgeCheck size={16} />} isActive={activeTab === 'verified'} onClick={() => setActiveTab('verified')} />
          <TabButton label={t('profile.settings')} icon={<Settings size={16} />} isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      <div className="py-6 pb-8 min-h-[300px]">
        {activeTab === 'posts' && <GalleryTab />}
        {activeTab === 'puurgas' && <PurgasTab />}
        {activeTab === 'verified' && <CertificationPanel />}

        {activeTab === 'gaming' && (
          <div className="space-y-6 max-w-3xl">
            <div className="text-center py-4">
              <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-accent" />
              <h3 className="text-base font-semibold text-foreground mb-1">{t('profile.gamingStats')}</h3>
              <p className="text-sm text-muted">{t('profile.gamingAchievements')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { window.location.href = '/puurga-games'; }}
                className="bg-card p-4 rounded-xl border border-border hover:border-accent/50 transition-all text-left group"
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
                <div className="flex gap-4 text-xs text-muted mb-4">
                  <span>{t('profile.earned')}: <span className="text-accent font-semibold">{profileData.credits || 0}</span></span>
                  <span>{t('profile.rank')}: <span className="text-foreground font-medium">{(profileData.credits || 0) > 500 ? 'Elite' : 'Survivor'}</span></span>
                </div>
                <h5 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Transaction history</h5>
                <CreditTransactionHistory compact />
              </div>

              <div className="bg-card p-4 rounded-xl border border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">Marketplace</h4>
                <CreditTransferPanel />
              </div>

              <button
                type="button"
                onClick={() => { window.location.href = '/new-game'; }}
                className="bg-card p-4 rounded-xl border border-border hover:border-accent/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
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
            <div className="flex items-center justify-between gap-3">
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

            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Photos</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="default" size="sm" onClick={() => coverPhotoRef.current?.click()} className="gap-1.5">
                  <ImagePlus size={14} /> Change cover
                </Button>
                <Button variant="default" size="sm" onClick={() => profilePictureRef.current?.click()} className="gap-1.5">
                  <Camera size={14} /> Change avatar
                </Button>
              </div>
            </div>

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
              <div className="flex items-center justify-between gap-3 mb-1">
                <label htmlFor="bio" className="block text-xs font-medium text-muted">
                  {t('profile.bio')}
                </label>
                <span className={`text-[11px] tabular-nums ${bioCounterClass(bioRemaining(formData.bio.length))}`}>
                  {bioRemaining(formData.bio.length)} / {BIO_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={BIO_MAX_LENGTH}
                value={formData.bio}
                onChange={handleInputChange}
                disabled={!isEditMode}
                placeholder={t('profile.bioPlaceholder', 'Write a short bio (max 300 characters)…')}
                className={`block w-full bg-input border border-input-border rounded-lg py-2.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none min-h-[96px] leading-relaxed ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="mt-1.5 text-[11px] text-muted leading-snug">
                {t(
                  'profile.bioHint',
                  'Keep it short — max 300 characters. Counter turns yellow near the limit, red when almost full.'
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">{t('profile.privacySettings')}</h4>
              <div className="space-y-3 rounded-xl border border-border bg-card/30 px-4">
                {[
                  { id: 'isPrivate', label: t('profile.makePrivate') },
                  { id: 'hideFromSuggestions', label: t('profile.hideFromSuggestions') },
                  { id: 'showReadReceipts', label: t('profile.showReadReceipts') },
                  { id: 'showOnlineStatus', label: t('profile.showOnlineStatus') },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
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
                  { id: 'storyPrivacy', label: t('profile.storyPrivacy'), options: ['everyone', 'followers', 'close_friends'] },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <label htmlFor={item.id} className="text-sm text-muted">{item.label}</label>
                    <select
                      id={item.id}
                      name={item.id}
                      value={(formData as any)[item.id]}
                      onChange={handleSelectChange}
                      disabled={!isEditMode}
                      className={`bg-input border border-input-border rounded-lg py-1.5 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {item.options.map((opt) => (
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
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 sm:px-5 py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex-shrink-0
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
