import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, X, Image, Send, ChevronLeft, ChevronRight, Pause, Play, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import Avatar from '../Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface StatusUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  isFriend?: boolean;
}

interface Status {
  id: string | number;
  content?: string;
  mediaUrl?: string;
  type: 'text' | 'media';
  gradientIndex?: number;
  createdAt: string;
  expiresAt: string;
  User: StatusUser;
  isViewed?: boolean;
}

// Map API response to Status interface
function mapApiStatus(data: Record<string, unknown>): Status {
  const userObj = (data.User as Record<string, unknown>) || {};
  return {
    id: data.id as string | number,
    content: data.content as string | undefined,
    mediaUrl: data.mediaUrl as string | undefined,
    type: (data.type as 'text' | 'media') || 'text',
    gradientIndex: data.gradientIndex as number | undefined,
    createdAt: data.createdAt as string,
    expiresAt: data.expiresAt as string,
    isViewed: data.isViewed as boolean | undefined,
    User: {
      id: (userObj.id as string) || '',
      name: (userObj.name as string) || (userObj.full_name as string) || '',
      username: (userObj.username as string) || '',
      avatar: (userObj.avatar as string) || (userObj.avatar_url as string) || '',
      isFriend: userObj.isFriend as boolean | undefined,
    },
  };
}

// Text status background gradients (Instagram-style)
const STATUS_GRADIENTS = [
  'from-orange-500 via-pink-500 to-purple-600',
  'from-blue-500 via-cyan-400 to-teal-500',
  'from-green-500 via-emerald-400 to-teal-600',
  'from-purple-600 via-violet-500 to-indigo-600',
  'from-rose-500 via-red-500 to-orange-500',
  'from-amber-500 via-yellow-500 to-orange-400',
  'from-indigo-500 via-blue-500 to-cyan-400',
  'from-fuchsia-500 via-pink-500 to-rose-500',
];

// Duration for auto-advance (seconds)
const STATUS_DURATION = 5;

const StatusBar = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGradient, setSelectedGradient] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const selectedStatus = selectedStatusIndex !== null ? (statuses[selectedStatusIndex] || null) : null;

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/statuses');
      const rawData = Array.isArray(response.data) ? response.data : [];
      const mappedStatuses = rawData.map((item: Record<string, unknown>) => mapApiStatus(item));
      setStatuses(mappedStatuses);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewStatus(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleCreateStatus = async () => {
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      if (newStatus) {
        formData.append('content', newStatus);
      }
      formData.append('gradientIndex', String(selectedGradient));

      await api.post('statuses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Status shared!');
      setIsCreating(false);
      setNewStatus('');
      setSelectedFile(null);
      setSelectedGradient(0);
      fetchStatuses();
    } catch (error: any) {
      console.error('Error creating status:', error);
      toast.error(`Failed to create status: ${error.response?.data?.error || error.message}`);
    }
  };

  const isStatusActive = (status: Status) => {
    const expiryTime = new Date(status.expiresAt).getTime();
    const now = new Date().getTime();
    return now < expiryTime;
  };

  const getStatusRingColor = (status: Status) => {
    if (!isStatusActive(status)) return 'border-gray-600';
    if (status.isViewed) return 'border-gray-400';
    return 'border-orange-500';
  };

  // Get time ago string
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Story viewer - auto-advance progress
  const startProgress = useCallback(() => {
    startTimeRef.current = Date.now();
    pausedAtRef.current = 0;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / (STATUS_DURATION * 1000)) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        // Auto-advance to next status
        setSelectedStatusIndex(prev => {
          if (prev === null) return null;
          if (prev < statuses.length - 1) return prev + 1;
          return null; // Close viewer at end
        });
        return;
      }

      progressRef.current = requestAnimationFrame(animate);
    };

    progressRef.current = requestAnimationFrame(animate);
  }, [statuses.length]);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      cancelAnimationFrame(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume
      const remainingTime = (STATUS_DURATION * 1000) * (1 - pausedAtRef.current / 100);
      startTimeRef.current = Date.now() - (STATUS_DURATION * 1000 - remainingTime);
      setIsPaused(false);
      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const pct = Math.min((elapsed / (STATUS_DURATION * 1000)) * 100, 100);
        setProgress(pct);
        if (pct >= 100) {
          setSelectedStatusIndex(prev => {
            if (prev === null) return null;
            if (prev < statuses.length - 1) return prev + 1;
            return null;
          });
          return;
        }
        progressRef.current = requestAnimationFrame(animate);
      };
      progressRef.current = requestAnimationFrame(animate);
    } else {
      // Pause
      pausedAtRef.current = progress;
      stopProgress();
      setIsPaused(true);
    }
  }, [isPaused, progress, stopProgress, statuses.length]);

  // Start/reset progress when selected status changes
  useEffect(() => {
    if (selectedStatusIndex !== null) {
      setProgress(0);
      setIsPaused(false);
      stopProgress();
      startProgress();
    } else {
      stopProgress();
      setProgress(0);
    }

    return () => stopProgress();
  }, [selectedStatusIndex, startProgress, stopProgress]);

  const goToPrevStatus = useCallback(() => {
    setSelectedStatusIndex(prev => {
      if (prev === null || prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  const goToNextStatus = useCallback(() => {
    setSelectedStatusIndex(prev => {
      if (prev === null) return null;
      if (prev < statuses.length - 1) return prev + 1;
      return null;
    });
  }, [statuses.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedStatusIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevStatus();
      else if (e.key === 'ArrowRight') goToNextStatus();
      else if (e.key === 'Escape') setSelectedStatusIndex(null);
      else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStatusIndex, goToPrevStatus, goToNextStatus, togglePause]);

  // Get a gradient for a status based on its stored gradientIndex
  const getGradientForStatus = (status: Status) => STATUS_GRADIENTS[(status.gradientIndex ?? 0) % STATUS_GRADIENTS.length];

  // Build dummy statuses for preview when loading
  const dummyStatuses: Status[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `dummy-${i}`,
    userId: `u-${i}`,
    content: '',
    mediaUrl: '',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isViewed: i === 0,
    type: 'text',
    User: {
      id: `u-${i}`,
      name: ['Alice', 'Brandon', 'Chidi', 'Dana', 'Ema', 'Felix', 'Gina', 'Hadi'][i % 8],
      avatar: DEFAULT_IMAGES.avatar,
      isFriend: true,
    },
  } as unknown as Status));

  // Only show dummy statuses during loading
  const useDummy = loading;
  const displayStatuses = useDummy ? dummyStatuses : statuses;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        {/* Status circles scrolling area */}
        <div className="flex-1 min-w-0 flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add Status Button */}
        <button
          onClick={() => setIsCreating(true)}
          className="flex flex-col items-center min-w-[48px] sm:min-w-[56px]"
          aria-label="Add Status"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border flex items-center justify-center hover:border-accent transition-colors bg-card">
            <Plus size={18} className="sm:w-5 sm:h-5 text-accent" />
          </div>
          <span className="text-xs text-muted mt-1">Add</span>
        </button>

        {/* Status Circles */}
        {displayStatuses.map((status, index) => (
            <button
              key={status.id}
              onClick={() => {
                if (!useDummy) setSelectedStatusIndex(index);
              }}
              className="flex flex-col items-center min-w-[48px] sm:min-w-[56px] group"
              aria-label={status.User.name}
              title={status.User.name}
            >
              <div className="relative">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${getStatusRingColor(status)} p-[1px] ${isStatusActive(status) ? 'animate-pulse' : ''} overflow-hidden bg-card`}>
                  {status.mediaUrl ? (
                    <img
                      src={status.mediaUrl}
                      alt={`${status.User.name}'s status`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : status.content ? (
                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center p-1">
                      <div className="text-white text-[8px] font-medium text-center leading-tight overflow-hidden">
                        {status.content.length > 20 ? status.content.substring(0, 20) + '...' : status.content}
                      </div>
                    </div>
                  ) : (
                    <Avatar
                      src={status.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={`${status.User.name}'s profile picture`}
                      size="md"
                      className="w-full h-full"
                    />
                  )}
                </div>

                {(status.mediaUrl || status.content) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background overflow-hidden">
                    <Avatar
                      src={status.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={status.User.name}
                      size="sm"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted mt-1 truncate w-full text-center group-hover:text-foreground transition-colors">
                {status.User.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile-Only User Profile Picture - Top Right */}
        <div className="flex-shrink-0 lg:hidden pb-2">
          <button
            onClick={() => navigate('/profile')}
            className="relative group"
            aria-label="My Profile"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full ring-2 ring-accent/60 group-hover:ring-accent transition-all duration-300 overflow-hidden group-hover:scale-105">
              <Avatar
                src={user?.avatar || DEFAULT_IMAGES.avatar}
                alt={user?.name || 'My Profile'}
                size="md"
                className="w-full h-full"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATUS CREATION MODAL – Clean, compact, Instagram-style   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex flex-col bg-black sm:bg-transparent sm:items-center sm:justify-center"
            >
              {/* Desktop: centered card / Mobile: fullscreen */}
              <div className="flex-1 sm:flex-initial sm:w-full sm:max-w-md sm:rounded-2xl sm:overflow-hidden bg-[#1a1a1a] flex flex-col relative">

                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewStatus('');
                      setSelectedFile(null);
                    }}
                    className="text-white/70 hover:text-white transition-colors p-1"
                  >
                    <X size={24} />
                  </button>
                  <span className="text-white font-semibold text-sm">Create Status</span>
                  <button
                    onClick={handleCreateStatus}
                    disabled={!newStatus.trim() && !selectedFile}
                    className="px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  >
                    Share
                  </button>
                </div>

                {/* Preview area */}
                <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
                  {selectedFile ? (
                    /* Image preview – fullscreen style */
                    <div className="relative w-full flex-1 flex items-center justify-center bg-black">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      {/* Caption input over image */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
                        <input
                          type="text"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          placeholder="Add a caption..."
                          maxLength={280}
                          className="w-full bg-white/15 backdrop-blur-sm text-white placeholder-white/50 rounded-full px-4 py-2.5 text-sm border border-white/20 focus:outline-none focus:border-white/40 transition-colors"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Text status – with gradient background */
                    <div className={`w-full flex-1 flex flex-col items-center justify-center bg-gradient-to-br ${STATUS_GRADIENTS[selectedGradient]} p-6 relative`}>
                      <textarea
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        placeholder="Type a status..."
                        maxLength={280}
                        className="w-full text-center text-white text-xl sm:text-2xl font-bold bg-transparent border-none focus:outline-none resize-none placeholder-white/50 flex-1 flex items-center"
                        style={{ minHeight: '120px', display: 'flex', alignItems: 'center', textAlign: 'center' }}
                        rows={4}
                        autoFocus
                      />

                      {/* Gradient selector */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
                        {STATUS_GRADIENTS.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedGradient(i)}
                            className={`w-6 h-6 rounded-full bg-gradient-to-br ${STATUS_GRADIENTS[i]} transition-all duration-200 ${
                              selectedGradient === i ? 'ring-2 ring-white ring-offset-2 ring-offset-black/30 scale-110' : 'opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] shrink-0 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
                      title="Add Photo"
                    >
                      <Image size={20} />
                      <span className="hidden sm:inline">Photo</span>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
                        title="Add Emoji"
                      >
                        <Smile size={20} />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <div
                            className="fixed inset-0"
                            onClick={() => setShowEmojiPicker(false)}
                          />
                          <div className="relative">
                            <EmojiPicker
                              onEmojiClick={onEmojiClick}
                              emojiStyle={EmojiStyle.NATIVE}
                              emojiVersion="1.0"
                              theme={'dark' as Theme}
                              width={300}
                              height={350}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs ${newStatus.length > 250 ? 'text-red-400' : 'text-white/40'}`}>
                    {newStatus.length}/280
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATUS VIEWER – Fullscreen Instagram/WhatsApp story style */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedStatus && selectedStatusIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          >
            {/* Fullscreen story container */}
            <div className="relative w-full h-full sm:max-w-md sm:max-h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col mx-auto">

              {/* Progress bars - Instagram style */}
              <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-2 sm:pt-3">
                {statuses.map((_, i) => (
                  <div key={i} className="flex-1 h-[2px] sm:h-[3px] rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-none"
                      style={{
                        width: i < selectedStatusIndex ? '100%' :
                               i === selectedStatusIndex ? `${progress}%` : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* User info header - overlay */}
              <div className="absolute top-4 sm:top-5 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-4 pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/30">
                    <Avatar
                      src={selectedStatus.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={selectedStatus.User.name}
                      size="sm"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold drop-shadow-lg">
                      {selectedStatus.User.name}
                    </span>
                    <span className="text-white/60 text-xs drop-shadow-lg">
                      {getTimeAgo(selectedStatus.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={togglePause}
                    className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                    aria-label={isPaused ? 'Play' : 'Pause'}
                  >
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                  <button
                    onClick={() => setSelectedStatusIndex(null)}
                    className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedStatus.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    {selectedStatus.mediaUrl ? (
                      /* Image status */
                      <div className="w-full h-full bg-black flex flex-col">
                        <div className="flex-1 flex items-center justify-center">
                          <img
                            src={selectedStatus.mediaUrl}
                            alt="Status"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        {selectedStatus.content && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                            <p className="text-white text-center text-sm font-medium drop-shadow-lg">
                              {selectedStatus.content}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : selectedStatus.content ? (
                      /* Text status with gradient */
                      <div className={`w-full h-full bg-gradient-to-br ${getGradientForStatus(selectedStatus)} flex items-center justify-center p-8`}>
                        <p className="text-white text-2xl sm:text-3xl font-bold text-center drop-shadow-lg leading-relaxed max-w-sm">
                          {selectedStatus.content}
                        </p>
                      </div>
                    ) : (
                      /* Empty / avatar fallback */
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center gap-4">
                        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20">
                          <Avatar
                            src={selectedStatus.User.avatar || DEFAULT_IMAGES.avatar}
                            alt={selectedStatus.User.name}
                            size="xl"
                            className="w-full h-full"
                          />
                        </div>
                        <p className="text-white/60 text-sm">No content</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Tap zones for navigation (left / right) - Instagram style */}
                <div className="absolute inset-0 z-10 flex">
                  <button
                    onClick={goToPrevStatus}
                    className="w-1/3 h-full cursor-pointer focus:outline-none"
                    aria-label="Previous status"
                    disabled={selectedStatusIndex <= 0}
                  />
                  <button
                    onClick={togglePause}
                    className="w-1/3 h-full cursor-pointer focus:outline-none"
                    aria-label="Pause/Play"
                  />
                  <button
                    onClick={goToNextStatus}
                    className="w-1/3 h-full cursor-pointer focus:outline-none"
                    aria-label="Next status"
                  />
                </div>

                {/* Desktop navigation arrows */}
                {selectedStatusIndex > 0 && (
                  <button
                    onClick={goToPrevStatus}
                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}
                {selectedStatusIndex < statuses.length - 1 && (
                  <button
                    onClick={goToNextStatus}
                    className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
                    aria-label="Next"
                  >
                    <ChevronRight size={22} />
                  </button>
                )}
              </div>

              {/* Bottom reply bar - WhatsApp style */}
              <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4 pt-8">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Reply..."
                    className="flex-1 bg-white/15 backdrop-blur-sm text-white placeholder-white/50 rounded-full px-4 py-2 text-sm border border-white/20 focus:outline-none focus:border-white/40 transition-colors"
                    onFocus={() => setIsPaused(true)}
                  />
                  <button className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-colors border border-white/20">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusBar;