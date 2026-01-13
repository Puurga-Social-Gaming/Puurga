import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Image, Smile, Send, X } from 'lucide-react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import imageCompression from 'browser-image-compression';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import type { Post } from '../../types';
import Spinner from '../../components/Spinner';
import type { EmojiClickData } from 'emoji-picker-react';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CUSTOM_EMOJIS = [
  {
    id: 'puurga',
    names: ['puurga', 'logo'],
    imgUrl: '/logo.png',
    text: ':puurga:',
  },
];

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [loading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isExpanded) return;
      if (content.trim() || selectedImages.length > 0) return;
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded && !content.trim() && selectedImages.length === 0) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, content, selectedImages.length]);

  // If user is not logged in, don't render the component
  if (!user) {
    return null;
  }

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      
      if (compressedFile.size > file.size) {
        console.log('Compressed file is larger than original, using original');
        return file;
      }
      
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }

    const newImages = files.filter(file => file.type.startsWith('image/'));
    
    // Show loading toast
    const loadingToast = toast.loading('Compressing images...');
    
    try {
      // Compress images
      const compressedImages = await Promise.all(
        newImages.map(file => compressImage(file))
      );
      
      setSelectedImages(prev => [...prev, ...compressedImages]);

      // Create preview URLs
      const newPreviewUrls = compressedImages.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
      
      toast.success('Images compressed successfully', { id: loadingToast });
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Error processing images', { id: loadingToast });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedImages.length === 0) {
      toast.error('Please add some content or images to your post');
      return;
    }

    setIsLoading(true);
    try {
      let imageUrls: string[] = [];
      
      if (selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach((file, index) => {
          // Ensure file has proper extension in name
          const fileExtension = file.type.split('/')[1];
          const fileName = `image${index}.${fileExtension}`;
          const newFile = new File([file], fileName, { type: file.type });
          formData.append('images', newFile);
        });

        const response = await api.post('/users/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        imageUrls = response.data.urls;
      }

      const postResponse = await api.post('/users/posts', {
        user_id: user.id,
        content,
        images: imageUrls,
      });

      setContent('');
      setSelectedImages([]);
      setImagePreviewUrls([]);
      onPostCreated(postResponse.data);
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <Spinner size="md" />
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <img
              src={user.avatar || DEFAULT_IMAGES.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/20 hover:border-orange-500/40 transition-colors"
              title={`Posting as ${user.name} (@${user.username || 'user'})`}
            />
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder={`What's on your mind, ${user.name?.split(' ')[0] || 'there'}?`}
              className={`w-full ${isExpanded ? 'rounded-2xl py-3' : 'rounded-2xl py-2'} neo-input px-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/80 focus:border-orange-500/40`}
              rows={isExpanded ? 3 : 1}
            />

            {/* Image Previews */}
            {isExpanded && imagePreviewUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isExpanded && (
              <div className="mt-3 flex items-center justify-between relative">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-500/10"
                  >
                    <Image size={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-500/10"
                    >
                      <Smile size={20} />
                    </button>
                    {showEmojiPicker && (
                      <div 
                        className="absolute bottom-12 -left-2 z-50"
                        style={{
                          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
                        }}
                      >
                        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1">
                          <EmojiPicker 
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme={'dark' as Theme}
                            width={280}
                            height={320}
                            searchDisabled
                            skinTonesDisabled
                            customEmojis={CUSTOM_EMOJIS}
                            previewConfig={{
                              showPreview: false
                            }}
                            lazyLoadEmojis
                            emojiStyle={EmojiStyle.NATIVE}
                            emojiVersion="1.0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isExpanded && !content && selectedImages.length === 0 && (
                    <button
                      type="button"
                      className="px-3 py-2 text-gray-400 hover:text-white"
                      onClick={() => setIsExpanded(false)}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || (!content.trim() && selectedImages.length === 0)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      loading || (!content.trim() && selectedImages.length === 0)
                        ? 'bg-orange-500/50 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                  >
                    <Send size={18} />
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;