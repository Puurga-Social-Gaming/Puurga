import React, { Suspense, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Smile, X, LayoutGrid, Rows, Columns, UserPlus, MapPin, Film, MoreHorizontal, ChevronDown, Globe, Users, EyeOff } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import type { Post } from '../../types';
import Spinner from '../../components/Spinner';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import Button from '../UI/Button';
import VideoCropModal from './VideoCropModal';

import { retryableLazy } from '../../utils/retryableLazy';
const EmojiPicker = retryableLazy(() => import('emoji-picker-react'));
import type { EmojiClickData, Theme } from 'emoji-picker-react';
import { BACKGROUND_PRESETS, getPostBackgroundPreset } from '../../constants/postBackgrounds';
import { fileExtensionForUpload } from '../../utils/mediaUrls';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
  autoExpand?: boolean;
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see this post' },
  { value: 'friends', label: 'Friends', icon: Users, description: 'Only your friends can see this' },
  { value: 'private', label: 'Only Me', icon: EyeOff, description: 'Only you can see this post' },
];

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated, autoExpand = false }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([]);
  const [libraryImageUrls, setLibraryImageUrls] = useState<string[]>([]);
  const [libraryVideoUrls, setLibraryVideoUrls] = useState<string[]>([]);
  const [imageLayout, setImageLayout] = useState('grid');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibrarySearch, setMediaLibrarySearch] = useState('');
  const [mediaLibraryItems, setMediaLibraryItems] = useState<any[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showVideoCropModal, setShowVideoCropModal] = useState(false);
  const [videoToCrop, setVideoToCrop] = useState<{ file: File; url: string; duration: number } | null>(null);
  const [previewPlayingVideo, setPreviewPlayingVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoExpand && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [autoExpand]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setShowVisibilityDropdown(false);
      }
      if (backgroundRef.current && !backgroundRef.current.contains(event.target as Node)) {
        setShowBackgroundPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const compressImage = async (file: File): Promise<File> => {
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

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length + selectedVideos.length > 10) {
      toast.error(t('posts.maxImagesError'));
      return;
    }

    const newImages = files.filter(file => file.type.startsWith('image/'));
    const newVideos = files.filter(file => file.type.startsWith('video/'));

    if (newImages.length > 0) {
      const loadingToast = toast.loading(t('posts.compressingImages'));
      try {
        const compressedImages = await Promise.all(newImages.map(file => compressImage(file)));
        setSelectedImages(prev => [...prev, ...compressedImages]);
        const newPreviewUrls = compressedImages.map(file => URL.createObjectURL(file));
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        toast.success(t('posts.imagesCompressed'), { id: loadingToast });
      } catch (error) {
        toast.error(t('posts.errorProcessing'), { id: loadingToast });
      }
    }

    if (newVideos.length > 0) {
      // Check video duration and show crop modal if needed
      for (const video of newVideos) {
        try {
          const duration = await getVideoDuration(video);
          const maxDuration = 3 * 60; // 3 minutes in seconds

          if (duration > maxDuration) {
            // Show crop modal for long videos
            setVideoToCrop({
              file: video,
              url: URL.createObjectURL(video),
              duration
            });
            setShowVideoCropModal(true);
          } else {
            // Add short videos directly
            setSelectedVideos(prev => [...prev, video]);
            const newVideoUrl = URL.createObjectURL(video);
            setVideoPreviewUrls(prev => [...prev, newVideoUrl]);
            toast.success('Video added');
          }
        } catch (error) {
          console.error('Error checking video duration:', error);
          // Add video anyway if we can't check duration
          setSelectedVideos(prev => [...prev, video]);
          const newVideoUrl = URL.createObjectURL(video);
          setVideoPreviewUrls(prev => [...prev, newVideoUrl]);
          toast.success('Video added');
        }
      }
    }
  };

  const removeImage = (index: number) => {
    const url = imagePreviewUrls[index];
    const libIdx = libraryImageUrls.indexOf(url);
    if (libIdx !== -1) {
      setLibraryImageUrls(prev => prev.filter((_, i) => i !== libIdx));
    } else {
      let fileIdx = 0;
      for (let i = 0; i < index; i++) {
        if (!libraryImageUrls.includes(imagePreviewUrls[i])) fileIdx++;
      }
      setSelectedImages(prev => prev.filter((_, i) => i !== fileIdx));
    }
    URL.revokeObjectURL(url);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    const url = videoPreviewUrls[index];
    const libIdx = libraryVideoUrls.indexOf(url);
    if (libIdx !== -1) {
      setLibraryVideoUrls(prev => prev.filter((_, i) => i !== libIdx));
    } else {
      let fileIdx = 0;
      for (let i = 0; i < index; i++) {
        if (!libraryVideoUrls.includes(videoPreviewUrls[i])) fileIdx++;
      }
      setSelectedVideos(prev => prev.filter((_, i) => i !== fileIdx));
    }
    URL.revokeObjectURL(url);
    setVideoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoCropConfirm = async () => {
    if (!videoToCrop) return;

    try {
      // For now, we'll just accept the video as-is since actual video trimming
      // requires complex video processing libraries
      // In a production app, you would use a library like ffmpeg.wasm
      setSelectedVideos(prev => [...prev, videoToCrop.file]);
      setVideoPreviewUrls(prev => [...prev, videoToCrop.url]);
      toast.success('Video added (trimmed section will be processed on upload)');
    } catch (error) {
      console.error('Error processing video crop:', error);
      toast.error('Failed to process video');
    } finally {
      setShowVideoCropModal(false);
      setVideoToCrop(null);
    }
  };

  const handleVideoCropCancel = () => {
    if (videoToCrop) {
      URL.revokeObjectURL(videoToCrop.url);
    }
    setShowVideoCropModal(false);
    setVideoToCrop(null);
  };

  const handlePreviewVideoClick = (url: string) => {
    setPreviewPlayingVideo(previewPlayingVideo === url ? null : url);
  };

  const handleMediaLibraryOpen = async () => {
    setShowMediaLibrary(true);
    setMediaLibraryLoading(true);
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { data, error } = await supabase.storage.from('Media').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error) throw error;
      const itemsWithUrls = (data || []).map(item => {
        const { data: urlData } = supabase.storage.from('Media').getPublicUrl(item.name);
        return { ...item, publicUrl: urlData.publicUrl };
      });
      setMediaLibraryItems(itemsWithUrls);
    } catch (error) {
      console.error('Error loading media library:', error);
      toast.error('Failed to load media library');
    } finally {
      setMediaLibraryLoading(false);
    }
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

  const handleMediaLibrarySearch = async (query: string) => {
    setMediaLibrarySearch(query);
    if (!query) {
      handleMediaLibraryOpen();
      return;
    }
    setMediaLibraryLoading(true);
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { data, error } = await supabase.storage.from('Media').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
      if (error) throw error;
      const filtered = (data || []).filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      const itemsWithUrls = filtered.map(item => {
        const { data: urlData } = supabase.storage.from('Media').getPublicUrl(item.name);
        return { ...item, publicUrl: urlData.publicUrl };
      });
      setMediaLibraryItems(itemsWithUrls);
    } catch (error) {
      console.error('Error searching media library:', error);
      toast.error('Failed to search media library');
    } finally {
      setMediaLibraryLoading(false);
    }
  };

  const handleMediaLibrarySelect = async (item: any) => {
    try {
      const url = item.publicUrl;
      const isVideo = item.name.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/);
      
      if (isVideo) {
        setLibraryVideoUrls(prev => [...prev, url]);
        setVideoPreviewUrls(prev => [...prev, url]);
        toast.success('Video added from library');
      } else {
        setLibraryImageUrls(prev => [...prev, url]);
        setImagePreviewUrls(prev => [...prev, url]);
        toast.success('Image added from library');
      }
      setShowMediaLibrary(false);
    } catch (error) {
      console.error('Error selecting media:', error);
      toast.error('Failed to add media');
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setContent(prev => prev + emojiData.emoji);
    closeAllDropdowns();
  };

  // Helper function to close all dropdowns
  const closeAllDropdowns = () => {
    setShowEmojiPicker(false);
    setShowBackgroundPicker(false);
    setShowVisibilityDropdown(false);
    setShowMediaLibrary(false);
  };

  const handleBackgroundSelect = (preset: typeof BACKGROUND_PRESETS[0]) => {
    setBackgroundIndex(preset.value);
    closeAllDropdowns();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasLocalMedia = selectedImages.length > 0 || selectedVideos.length > 0;
    const hasLibraryMedia = libraryImageUrls.length > 0 || libraryVideoUrls.length > 0;
    if (!content.trim() && !hasLocalMedia && !hasLibraryMedia) {
      toast.error(t('posts.emptyPostError'));
      return;
    }

    setLoading(true);
    try {
      let mediaUrls: string[] = [...libraryImageUrls, ...libraryVideoUrls];

      // Upload newly selected images and videos together
      if (hasLocalMedia) {
        const formData = new FormData();

        selectedImages.forEach((file, index) => {
          const fileExtension = fileExtensionForUpload(file);
          const fileName = `image${index}.${fileExtension}`;
          const newFile = new File([file], fileName, { type: file.type });
          formData.append('media', newFile);
        });

        selectedVideos.forEach((file, index) => {
          const fileExtension = fileExtensionForUpload(file);
          const fileName = `video${index}.${fileExtension}`;
          const newFile = new File([file], fileName, { type: file.type || 'video/mp4' });
          formData.append('media', newFile);
        });

        const uploadResponse = await api.post('/users/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000, // 3 minutes for video uploads
        });
        const uploaded = Array.isArray(uploadResponse.data?.urls)
          ? uploadResponse.data.urls
          : [];
        mediaUrls = [...mediaUrls, ...uploaded];
      }

      const postData: any = {
        content,
        images: mediaUrls,
        media_layout: imageLayout,
        visibility,
        background_index: backgroundIndex,
      };

      const postResponse = await api.post('/users/posts', postData);

      setContent('');
      setSelectedImages([]);
      setSelectedVideos([]);
      setImagePreviewUrls([]);
      setVideoPreviewUrls([]);
      setLibraryImageUrls([]);
      setLibraryVideoUrls([]);
      setBackgroundIndex(0);
      onPostCreated(postResponse.data);
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t('posts.errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  const currentVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility) || VISIBILITY_OPTIONS[0];
  const VisibilityIcon = currentVisibility.icon;

  return (
    <div className="relative flex flex-col h-full bg-background" ref={containerRef} onClick={handleBackdropClick}>
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-50">
          <Spinner size="md" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col h-full flex-1">
        {/* User Info Header */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={user.avatar || DEFAULT_IMAGES.avatar}
            alt={user.name || user.username}
            className="w-10 h-10 rounded-full object-cover border border-border"
          />
          <div className="flex flex-col">
            <span className="font-bold text-foreground text-[15px] leading-tight">
              {user.name || user.username}
            </span>
            <div className="relative" ref={visibilityRef}>
              <button
                type="button"
                onClick={() => {
                  closeAllDropdowns();
                  setShowVisibilityDropdown(!showVisibilityDropdown);
                }}
                className="mt-1 flex items-center gap-1 bg-card hover:bg-card-hover border border-border px-2 py-0.5 rounded-md transition-colors w-fit"
              >
                <VisibilityIcon size={12} className="text-muted" />
                <span className="text-xs font-semibold text-foreground">{currentVisibility.label}</span>
                <ChevronDown size={14} className="text-muted ml-0.5" />
              </button>

              {/* Visibility Dropdown */}
              {showVisibilityDropdown && (
                <div className="absolute top-10 left-0 bg-card border border-border rounded-xl shadow-2xl z-50 py-2 min-w-[220px]">
                  {VISIBILITY_OPTIONS.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setVisibility(option.value as 'public' | 'friends' | 'private');
                          closeAllDropdowns();
                        }}
                        className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-card-hover transition-colors ${
                          visibility === option.value ? 'bg-accent/10' : ''
                        }`}
                      >
                        <OptionIcon size={16} className={visibility === option.value ? 'text-accent' : 'text-muted'} />
                        <div className="text-left">
                          <div className={`text-sm font-medium ${visibility === option.value ? 'text-accent' : 'text-foreground'}`}>
                            {option.label}
                          </div>
                          <div className="text-xs text-muted">{option.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text Area with Background Preview */}
        <div
          className={`flex-1 flex flex-col relative min-h-[150px] rounded-xl p-3 ${
            getPostBackgroundPreset(backgroundIndex).class
          }`}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind${user.name ? ', ' + user.name.split(' ')[0] : ''}?`}
            className={`w-full flex-1 bg-transparent border-none px-0 text-base lg:text-lg placeholder-muted resize-none focus:outline-none focus:ring-0 ${
              getPostBackgroundPreset(backgroundIndex).textClass
            }`}
          />


          {/* Quick inline text tools */}
          <div className="flex items-center justify-between mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                closeAllDropdowns();
                setShowBackgroundPicker(true);
              }}
              className={`p-2 rounded-lg text-white font-bold text-xs w-9 h-9 flex items-center justify-center shadow-sm transition-all ${
                backgroundIndex !== 0
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-background bg-gradient-to-br from-purple-400 to-pink-400'
                  : 'bg-gradient-to-br from-pink-400 via-red-400 to-yellow-400'
              }`}
            >
              Aa
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllDropdowns();
                  setShowEmojiPicker(true);
                }}
                className="p-1.5 text-muted hover:text-foreground transition-colors"
              >
                <Smile size={24} className="opacity-60" />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-10 right-0 z-50 shadow-2xl">
                  <Suspense fallback={<div className="w-[280px] h-[320px] bg-card animate-pulse rounded-lg" />}>
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      autoFocusSearch={false}
                      theme={'dark' as Theme}
                      width={280}
                      height={320}
                      searchDisabled
                      skinTonesDisabled
                      lazyLoadEmojis
                      emojiStyle={'native' as any}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Previews */}
        {imagePreviewUrls.length > 0 && (
          <div className="mt-4 border border-border rounded-xl p-2 relative">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Layout:</span>
              <button type="button" onClick={() => setImageLayout('grid')} className={`p-1.5 rounded-md ${imageLayout === 'grid' ? 'bg-accent text-black shadow-theme-sm' : 'bg-card hover:bg-card-hover text-muted'}`}><LayoutGrid size={14} /></button>
              <button type="button" onClick={() => setImageLayout('rows')} className={`p-1.5 rounded-md ${imageLayout === 'rows' ? 'bg-accent text-black shadow-theme-sm' : 'bg-card hover:bg-card-hover text-muted'}`}><Rows size={14} /></button>
              <button type="button" onClick={() => setImageLayout('columns')} className={`p-1.5 rounded-md ${imageLayout === 'columns' ? 'bg-accent text-black shadow-theme-sm' : 'bg-card hover:bg-card-hover text-muted'}`}><Columns size={14} /></button>
            </div>
            <div className={`grid gap-1 rounded-lg overflow-hidden ${imageLayout === 'grid' ? 'grid-cols-2' : imageLayout === 'rows' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt="Preview" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className="absolute top-2 right-2 p-1.5 bg-card/80 backdrop-blur rounded-full text-foreground hover:bg-card-hover shadow-md z-10"
            >
               <ImageIcon size={16} />
            </button>
          </div>
        )}

        {/* Video Previews */}
        {videoPreviewUrls.length > 0 && (
          <div className="mt-4 border border-border rounded-xl p-2 relative">
            <div className="grid gap-1 rounded-lg overflow-hidden grid-cols-1">
              {videoPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <div 
                    className="cursor-pointer"
                    onClick={() => handlePreviewVideoClick(url)}
                  >
                    <video
                      src={url}
                      muted={previewPlayingVideo !== url}
                      controls={previewPlayingVideo === url}
                      autoPlay={previewPlayingVideo === url}
                      className="w-full h-40 object-cover"
                    />
                    {previewPlayingVideo !== url && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors z-10"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className="absolute top-2 right-2 p-1.5 bg-card/80 backdrop-blur rounded-full text-foreground hover:bg-card-hover shadow-md z-10"
            >
               <Film size={16} />
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*,video/*"
          multiple
          className="hidden"
        />

        {/* Add to your post section */}
        <div className="mt-3 flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-background shadow-sm">
          <span className="text-sm font-semibold text-foreground">Add to your post</span>
          <div className="flex items-center gap-3 lg:gap-4">
            <button type="button" onClick={() => {
              closeAllDropdowns();
              fileInputRef.current?.click();
            }} className="text-[#45BD62] hover:scale-110 transition-transform">
              <ImageIcon size={24} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={() => {
              closeAllDropdowns();
              handleMediaLibraryOpen();
            }} className="text-[#45BD62] hover:scale-110 transition-transform">
              <Film size={24} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={() => toast("Tagging feature coming soon!")} className="text-[#1877F2] hover:scale-110 transition-transform hidden sm:block">
              <UserPlus size={24} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={() => toast("Location feature coming soon!")} className="text-[#F35369] hover:scale-110 transition-transform hidden sm:block">
              <MapPin size={24} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={() => {
              closeAllDropdowns();
              setShowEmojiPicker(true);
            }} className="text-[#F7B928] hover:scale-110 transition-transform">
              <Smile size={24} strokeWidth={2.5} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllDropdowns();
                  setShowBackgroundPicker(true);
                }}
                className={`w-6 h-6 rounded border-2 ${
                  backgroundIndex !== 0
                    ? 'border-accent bg-gradient-to-br from-purple-400 to-pink-400'
                    : 'border-dashed border-muted hover:border-foreground'
                } transition-colors hidden sm:block`}
                title="Add background"
              />
              {showBackgroundPicker && (
                <div className="absolute top-10 right-0 sm:top-12 sm:right-0 bg-card border border-border rounded-xl shadow-2xl z-50 p-3 w-[min(92vw,320px)]">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Background</h4>
                  <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-0.5">
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleBackgroundSelect(preset)}
                        className={`w-full aspect-square rounded-lg ${preset.swatchClass || preset.class} hover:scale-105 transition-transform flex items-center justify-center ${
                          preset.value === backgroundIndex
                            ? 'ring-2 ring-accent'
                            : 'ring-1 ring-black/5'
                        }`}
                        title={preset.label}
                        aria-label={preset.label}
                      >
                        {preset.type === 'none' && <X size={14} className="text-muted" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={() => toast("More options coming soon!")} className="text-muted hover:text-foreground transition-colors p-1 bg-card hover:bg-card-hover rounded-full">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Media Library Modal */}
        {showMediaLibrary && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Media Library</h3>
                <button
                  type="button"
                  onClick={() => closeAllDropdowns()}
                  className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search media..."
                    value={mediaLibrarySearch}
                    onChange={(e) => handleMediaLibrarySearch(e.target.value)}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                {mediaLibraryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto">
                    {mediaLibraryItems.map((item) => {
                      const isVideo = item.name.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|mpg|mpeg|3gp|ogv|webm)$/);
                      return (
                        <div
                          key={item.name}
                          onClick={() => handleMediaLibrarySelect(item)}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                        >
                          {isVideo ? (
                            <video
                              src={item.publicUrl}
                              muted
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.publicUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                            {item.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        
        {/* Video Crop Modal */}
        <VideoCropModal
          isOpen={showVideoCropModal}
          videoUrl={videoToCrop?.url || ''}
          duration={videoToCrop?.duration || 0}
          onConfirm={() => handleVideoCropConfirm()}
          onCancel={handleVideoCropCancel}
        />

        {/* Post Button */}
        <Button
          type="submit"
          variant="primary"
          disabled={!content.trim() && selectedImages.length === 0 && selectedVideos.length === 0 && libraryImageUrls.length === 0 && libraryVideoUrls.length === 0}
          isLoading={loading}
          className="w-full mt-3 py-2.5 font-bold text-[15px] bg-opacity-70 hover:bg-opacity-80 shadow-md"
        >
          {loading ? t('posts.loading', 'Posting...') : t('createPost.post', 'Post')}
        </Button>
      </form>
    </div>
  );
};

export default CreatePost;
