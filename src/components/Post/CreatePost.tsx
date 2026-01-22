import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Image, Smile, Send, X, LayoutGrid, Rows, Columns } from 'lucide-react';
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
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [imageLayout, setImageLayout] = useState('grid');
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
    if (files.length + selectedImages.length > 10) {
      toast.error(t('posts.maxImagesError'));
      return;
    }

    const newImages = files.filter(file => file.type.startsWith('image/'));

    // Show loading toast
    const loadingToast = toast.loading(t('posts.compressingImages'));

    try {
      // Compress images
      const compressedImages = await Promise.all(
        newImages.map(file => compressImage(file))
      );

      setSelectedImages(prev => [...prev, ...compressedImages]);

      // Create preview URLs
      const newPreviewUrls = compressedImages.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);

      toast.success(t('posts.imagesCompressed'), { id: loadingToast });
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error(t('posts.errorProcessing'), { id: loadingToast });
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
      toast.error(t('posts.emptyPostError'));
      return;
    }

    setIsLoading(true);
    try {
      let imageUrls: string[] = [];
      const layout = imageLayout;

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
        layout,
      });

      setContent('');
      setSelectedImages([]);
      setImagePreviewUrls([]);
      onPostCreated(postResponse.data);
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t('posts.errorCreating'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <Spinner size="md" />
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <img
              src={user.avatar || DEFAULT_IMAGES.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-accent/20 hover:border-accent/40 transition-colors"
              title={`Posting as ${user.name} (@${user.username || 'user'})`}
            />
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder={`${t('createPost.placeholder')}`}
              className={`w-full ${isExpanded ? 'rounded-2xl py-3' : 'rounded-2xl py-2'} neo-input px-4 text-foreground placeholder-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent/40`}
              rows={isExpanded ? 3 : 1}
            />

            {/* Image Previews & Layout Controls */}
            {isExpanded && imagePreviewUrls.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-muted">Layout:</span>
                  <button type="button" onClick={() => setImageLayout('grid')} className={`p-1.5 rounded-md ${imageLayout === 'grid' ? 'bg-accent text-white' : 'bg-card-hover'}`}><LayoutGrid size={16} /></button>
                  <button type="button" onClick={() => setImageLayout('rows')} className={`p-1.5 rounded-md ${imageLayout === 'rows' ? 'bg-accent text-white' : 'bg-card-hover'}`}><Rows size={16} /></button>
                  <button type="button" onClick={() => setImageLayout('columns')} className={`p-1.5 rounded-md ${imageLayout === 'columns' ? 'bg-accent text-white' : 'bg-card-hover'}`}><Columns size={16} /></button>
                </div>
                <div className={`grid gap-2 ${imageLayout === 'grid' ? 'grid-cols-2' : imageLayout === 'rows' ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
                      className="absolute top-1 right-1 p-1 bg-background/50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                </div>
              </div>
            )}

            {isExpanded && (
              <div className="mt-3 flex items-center justify-between relative">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-muted hover:text-accent rounded-full hover:bg-accent/10"
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
                      className="p-2 text-muted hover:text-accent rounded-full hover:bg-accent/10"
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
                        <div className="bg-background/50 backdrop-blur-sm rounded-lg p-1">
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
                      className="px-3 py-2 text-muted hover:text-foreground"
                      onClick={() => setIsExpanded(false)}
                    >
                      {t('common.cancel')}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || (!content.trim() && selectedImages.length === 0)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${loading || (!content.trim() && selectedImages.length === 0)
                        ? 'bg-accent/50 cursor-not-allowed'
                        : 'bg-accent hover:bg-accent-hover'
                      }`}
                  >
                    <Send size={18} />
                    {loading ? t('posts.loading') : t('createPost.post')}
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