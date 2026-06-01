import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { Plus, X, Image, Send, ChevronLeft, ChevronRight, Pause, Play, Smile, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import Avatar from '../Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import type { EmojiClickData, Theme } from 'emoji-picker-react';

import { retryableLazy } from '../../utils/retryableLazy';
const EmojiPicker = retryableLazy(() => import('emoji-picker-react'));

interface StatusUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  isFriend?: boolean;
}

interface Status {
  id: string | number;
  text?: string;
  imageUrl?: string;
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
    text: (data.text || data.content) as string | undefined,
    imageUrl: (data.imageUrl || data.mediaUrl || data.media_url) as string | undefined,
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

interface StatusBarProps {
  onViewerStateChange?: (isOpen: boolean) => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ onViewerStateChange }) => {
  const { user } = useUser();
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
  const [imageError, setImageError] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const selectedStatus = selectedStatusIndex !== null ? (statuses[selectedStatusIndex] || null) : null;

  useEffect(() => {
    fetchStatuses();
  }, []);

  useEffect(() => {
    if (onViewerStateChange) {
      onViewerStateChange(selectedStatusIndex !== null);
    }
  }, [selectedStatusIndex, onViewerStateChange]);

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

  const compressImage = async (file: File): Promise<File> => {
    if (file.type.startsWith('video/')) return file;
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      if (compressedFile.size > file.size) return file;
      return compressedFile;
    } catch (error) {
      return file;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
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

  const handleDeleteStatus = async (statusId: string | number) => {
    try {
      await api.delete(`/statuses/${statusId}`);
      toast.success('Status deleted');
      setSelectedStatusIndex(null);
      fetchStatuses();
    } catch (error: any) {
      console.error('Error deleting status:', error);
      toast.error(`Failed to delete status: ${error.response?.data?.error || error.message}`);
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
  return 'border-gray-600';
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
      setImageError(false);
      stopProgress();
      startProgress();
      document.body.style.overflow = 'hidden';
    } else {
      stopProgress();
      setProgress(0);
      document.body.style.overflow = '';
    }

    return () => {
      stopProgress();
      document.body.style.overflow = '';
    };
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

  return (
    <div className="mb-2 flex justify-center">
      <div className="w-full max-w-3xl px-4">
        <div className="flex items-center justify-center gap-3">
          {/* Status circles scrolling area */}
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
            {/* Add Status Button with Profile Picture */}
            <button
              onClick={() => setIsCreating(true)}
              className="flex flex-col items-center min-w-[44px] sm:min-w-[48px]"
              aria-label="Add Status"
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[1.5px] border-gray-600 hover:border-gray-500 transition-all duration-300 overflow-hidden bg-card">
                <Avatar
                  src={user?.avatar || DEFAULT_IMAGES.avatar}
                  alt={user?.name || 'My Profile'}
                  size="md"
                  className="w-full h-full"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-4 sm:h-4 rounded-full bg-gray-700 border-2 border-card flex items-center justify-center">
                  <Plus size={10} className="text-gray-300" />
                </div>
              </div>
              <span className="text-[10px] text-muted mt-1">Add</span>
            </button>

        {/* Loading Skeleton */}
        {loading && statuses.length === 0 && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex flex-col items-center min-w-[44px] sm:min-w-[48px]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card border border-border animate-pulse" />
                <div className="w-8 h-2 bg-card rounded mt-1.5 animate-pulse" />
              </div>
            ))}
          </>
        )}

        {/* Status Circles */}
        {statuses.map((status, index) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatusIndex(index)}
              className="flex flex-col items-center min-w-[44px] sm:min-w-[48px] group"
              aria-label={status.User.name}
              title={status.User.name}
            >
              <div className="relative">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[1.5px] ${getStatusRingColor(status)} p-[1px] ${isStatusActive(status) ? 'animate-pulse' : ''} overflow-hidden bg-card`}>
                  {status.imageUrl ? (
                    status.imageUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                      <video
                        src={status.imageUrl}
                        className="w-full h-full object-cover rounded-full"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={status.imageUrl}
                        alt={`${status.User.name}'s status`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    )
                  ) : status.text ? (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradientForStatus(status)} rounded-full flex items-center justify-center p-1`}>
                      <div className="text-white text-[8px] font-medium text-center leading-tight overflow-hidden">
                        {status.text.length > 20 ? status.text.substring(0, 20) + '...' : status.text}
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

                {(status.imageUrl || status.text) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-4 sm:h-4 rounded-full border-[1.5px] border-background overflow-hidden">
                    <Avatar
                      src={status.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={status.User.name}
                      size="sm"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted mt-1 truncate w-full text-center group-hover:text-foreground transition-colors">
                {status.User.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
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
            className="fixed inset-0 z-[9999] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <div className="bg-card rounded-2xl shadow-theme-xl flex flex-col relative max-h-[85vh]">

                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewStatus('');
                      setSelectedFile(null);
                    }}
                    className="text-muted hover:text-foreground transition-colors p-1"
                  >
                    <X size={24} />
                  </button>
                  <span className="text-foreground font-semibold text-sm">Create Status</span>
                  <button
                    onClick={handleCreateStatus}
                    disabled={!newStatus.trim() && !selectedFile}
                    className="px-4 py-1.5 bg-accent text-black text-sm font-semibold rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-colors shadow-theme-sm"
                  >
                    Share
                  </button>
                </div>

                {/* Preview area */}
                <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden">
                  {selectedFile ? (
                    /* Image preview */
                    <div className="relative w-full flex-1 flex items-center justify-center bg-black">
                      {selectedFile.type.startsWith('video/') ? (
                        <video
                          src={URL.createObjectURL(selectedFile)}
                          className="max-w-full max-h-full object-contain"
                          autoPlay
                          playsInline
                          muted
                          loop
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
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
                    <div className={`w-full flex-1 flex flex-col items-center justify-center bg-gradient-to-br ${STATUS_GRADIENTS[selectedGradient]} p-4 sm:p-6 relative`}>
                      <textarea
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        placeholder="Type a status..."
                        maxLength={280}
                        className="w-full text-center text-white text-lg sm:text-xl font-bold bg-transparent border-none focus:outline-none resize-none placeholder-white/50"
                        style={{ minHeight: '100px', paddingTop: '1.5rem', textAlign: 'center' }}
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
                <div className="flex items-center justify-between px-4 py-3 bg-card shrink-0 border-t border-border">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm"
                      title="Add Media"
                    >
                      <Image size={20} />
                      <span className="hidden sm:inline">Media</span>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm"
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
                            <Suspense fallback={<div className="w-[300px] h-[350px] bg-card animate-pulse rounded-lg" />}>
                              <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                emojiStyle={'native' as any}
                                emojiVersion="1.0"
                                theme={'dark' as Theme}
                                width={300}
                                height={350}
                              />
                            </Suspense>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs ${newStatus.length > 250 ? 'text-red-500 font-bold' : 'text-muted'}`}>
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
            className="fixed inset-0 h-[100dvh] w-screen z-[9999] bg-black flex items-center justify-center overflow-hidden"
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
                  {selectedStatus.User.id === user?.id && (
                    <button
                      onClick={() => handleDeleteStatus(selectedStatus.id)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
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
              <div className="flex-1 relative min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedStatus.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    {selectedStatus.imageUrl ? (
                      /* Image status */
                      <div className="w-full h-full bg-black flex flex-col">
                        <div className="flex-1 min-h-0 flex items-center justify-center">
                          {selectedStatus.imageUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                            <video
                              src={selectedStatus.imageUrl}
                              className="max-w-full max-h-full object-contain"
                              autoPlay
                              playsInline
                              muted={false}
                              loop
                            />
                          ) : imageError ? (
                            <div className="flex flex-col items-center justify-center text-white/50">
                              <Image size={48} className="mb-4 opacity-40" />
                              <p className="text-sm font-medium">Unable to load image</p>
                            </div>
                          ) : (
                            <img
                              src={selectedStatus.imageUrl}
                              alt="Status"
                              className="max-w-full max-h-full object-contain"
                              onError={() => setImageError(true)}
                            />
                          )}
                        </div>
                        {selectedStatus.text && (
                          <div className="flex-shrink-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-0 pt-8">
                            <p className="text-white text-center text-sm font-medium drop-shadow-lg">
                              {selectedStatus.text}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : selectedStatus.text ? (
                      /* Text status with gradient */
                      <div className={`w-full h-full bg-gradient-to-br ${getGradientForStatus(selectedStatus)} flex items-center justify-center p-8`}>
                        <p className="text-white text-2xl sm:text-3xl font-bold text-center drop-shadow-lg leading-relaxed max-w-sm">
                          {selectedStatus.text}
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
              <div className="flex-shrink-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Reply..."
                    className="flex-1 bg-white/15 backdrop-blur-sm text-white placeholder-white/50 rounded-full px-4 py-2 text-sm border border-white/20 focus:outline-none focus:border-white/40 transition-colors"
                    onFocus={() => setIsPaused(true)}
                  />
                  <button className="flex-shrink-0 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-colors border border-white/20">
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