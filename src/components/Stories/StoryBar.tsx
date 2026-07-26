import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';

import Avatar from '../Avatar';
import ProfileLink from '../Profile/ProfileLink';
import api from '../../api/api';
import { toast } from 'react-hot-toast';
import { useUser } from '../../context/UserContext';

interface StoryUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isFriend?: boolean;
}

interface Story {
  id: string;
  content?: string;
  mediaUrl?: string;
  type: 'text' | 'media';
  gradientIndex?: number;
  createdAt: string;
  expiresAt: string;
  viewCount?: number;
  User: StoryUser;
  isOwn?: boolean;
}

interface StoryBarProps {
  onStoryClick?: (story: Story, index: number) => void;
  onAddStoryClick?: () => void;
}

const StoryBar: React.FC<StoryBarProps> = ({ onStoryClick, onAddStoryClick }) => {
  const { user } = useUser();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [gradientIndex, setGradientIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradients = [
    'from-orange-500 via-pink-500 to-purple-600',
    'from-blue-500 via-cyan-400 to-teal-500',
    'from-green-500 via-emerald-400 to-teal-600',
    'from-purple-600 via-violet-500 to-indigo-600',
    'from-rose-500 via-red-500 to-orange-500',
    'from-amber-500 via-yellow-500 to-orange-400',
    'from-indigo-500 via-blue-500 to-cyan-400',
    'from-fuchsia-500 via-pink-500 to-rose-500',
  ];

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/statuses/feed');
      const rawData = Array.isArray(response.data) ? response.data : [];
      
      const mappedStories = rawData.map((item: Record<string, unknown>) => mapStory(item));
      setStories(mappedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const mapStory = (data: Record<string, unknown>): Story => {
    const userObj = (data.User as Record<string, unknown>) || {};
    return {
      id: data.id as string,
      content: data.content as string | undefined,
      mediaUrl: data.mediaUrl as string | undefined,
      type: (data.type as 'text' | 'media') || 'text',
      gradientIndex: data.gradientIndex as number | undefined,
      createdAt: data.createdAt as string,
      expiresAt: data.expiresAt as string,
      viewCount: data.viewCount as number | undefined,
      isOwn: data.isOwn as boolean | undefined,
      User: {
        id: (userObj.id as string) || '',
        name: (userObj.name as string) || '',
        username: (userObj.username as string) || '',
        avatar: (userObj.avatar as string) || '',
        isFriend: userObj.isFriend as boolean | undefined,
      },
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File is too large. Max 50MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCreateStory = async () => {
    if (!content && !selectedFile) {
      toast.error('Add some content or an image');
      return;
    }

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      if (content) {
        formData.append('content', content);
      }
      formData.append('gradientIndex', String(gradientIndex));

      await api.post('/statuses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 minutes for video uploads
      });

      toast.success('Story posted!');
      setCreating(false);
      setSelectedFile(null);
      setContent('');
      setGradientIndex(0);
      fetchStories();
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to post story');
    }
  };

  const handleStoryClick = (story: Story, index: number) => {
    if (onStoryClick) {
      onStoryClick(story, index);
    }
  };

  const handleAddStoryClick = () => {
    if (onAddStoryClick) {
      onAddStoryClick();
    } else {
      setCreating(true);
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

  return (
    <div className="p-4" onClick={handleBackdropClick}>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {/* Add Story */}
        <div 
          className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer"
          onClick={handleAddStoryClick}
        >
          <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center hover:from-orange-400 hover:via-pink-400 hover:to-purple-500 transition-all">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Your story"
                className="w-full h-full rounded-full object-cover border-2 border-[#1a1a1a]"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#2d2d2d] flex items-center justify-center">
                <Plus className="text-white" size={24} />
              </div>
            )}
          </div>
          <span className="text-sm text-gray-400">Your Story</span>
        </div>

        {/* User Stories */}
        {loading ? (
          <div className="flex items-center justify-center w-14">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          stories.map((story, index) => (
            <div 
              key={story.id}
              className="flex flex-col items-center gap-1 min-w-[72px]"
              onClick={() => handleStoryClick(story, index)}
            >
              <div className={`w-14 h-14 rounded-full p-[2px] bg-gradient-to-br ${gradients[story.gradientIndex || 0]} cursor-pointer hover:scale-105 transition-transform`}>
                <Avatar
                  src={story.User.avatar}
                  alt={story.User.name}
                  className="w-full h-full border-2 border-[#1a1a1a] rounded-full"
                  userId={story.User.id}
                />
                {story.viewCount && story.viewCount > 0 && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#1a1a1a]">
                    <span className="text-[8px] text-white font-bold">{story.viewCount > 9 ? '9+' : story.viewCount}</span>
                  </div>
                )}
              </div>
              <ProfileLink
                username={story.User.username}
                className="text-sm text-gray-400 truncate w-full text-center hover:text-accent"
                stopPropagation
              >
                {story.User.name.split(' ')[0]}
              </ProfileLink>
            </div>
          ))
        )}

        {!loading && stories.length === 0 && (
          <div className="flex flex-col items-center gap-1 min-w-[72px]">
            <div className="w-14 h-14 rounded-full p-[2px] bg-gray-600 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No stories</span>
            </div>
            <span className="text-sm text-gray-500">None</span>
          </div>
        )}
      </div>

      {/* Create Story Modal - Inline */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card border border-border rounded-xl p-4 w-[90%] max-w-md shadow-theme-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Create Story</h3>
              <button onClick={() => setCreating(false)} className="text-muted hover:text-foreground">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            {/* Image Preview or Text Input */}
            <div className="mb-4">
              {selectedFile ? (
                <div className="relative aspect-[9/16] max-h-[300px] bg-black rounded-lg overflow-hidden">
                  {selectedFile.type.startsWith('video/') ? (
                    <video
                      src={URL.createObjectURL(selectedFile)}
                      className="w-full h-full object-contain"
                      autoPlay
                      playsInline
                      muted
                      loop
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                  >
                    <Plus size={16} className="rotate-45" />
                  </button>
                </div>
              ) : (
                <div className={`aspect-[9/16] max-h-[300px] bg-gradient-to-br ${gradients[gradientIndex]} rounded-lg flex items-center justify-center`}>
                  {content ? (
                    <p className="text-white text-center p-4 font-bold">{content}</p>
                  ) : (
                    <span className="text-white/50">Add some text...</span>
                  )}
                </div>
              )}
            </div>

            {/* Text Input */}
            <input
              type="text"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#2a2a2a] text-white rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {/* Gradient Picker */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {gradients.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => setGradientIndex(index)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex-shrink-0 ${
                    gradientIndex === index ? 'ring-2 ring-white' : ''
                  }`}
                />
              ))}
            </div>

            {/* Image/Video Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-gray-400 mb-4 hover:text-white transition-colors"
            >
              <ImageIcon size={20} />
              <span>Add Media</span>
            </button>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setCreating(false)}
                className="flex-1 py-2 bg-[#2a2a2a] text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStory}
                disabled={!content && !selectedFile}
                className="flex-1 py-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryBar;