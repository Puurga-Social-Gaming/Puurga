import React, { useState, useEffect } from 'react';
import { Loader2, Image, User, ImageIcon, Camera } from 'lucide-react';
import api from '../../lib/axios';
import { PostMediaViewer } from '../Post/PostMediaGallery';

interface GalleryImage {
  id: string;
  imageUrl: string;
  category: 'profile' | 'cover' | 'post';
  alt: string;
  createdAt?: string;
}

type CategoryFilter = 'all' | 'profile' | 'cover' | 'post';

const GalleryTab: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchGalleryImages = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users/gallery');
        setImages(response.data || []);
      } catch (error: any) {
        if (import.meta.env.DEV && !/network|fetch failed/i.test(String(error?.message || ''))) {
          console.warn('Gallery unavailable:', error?.message || error);
        }
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  const filteredImages =
    selectedCategory === 'all'
      ? images
      : images.filter((img) => img.category === selectedCategory);

  const categoryCounts = {
    all: images.length,
    profile: images.filter((img) => img.category === 'profile').length,
    cover: images.filter((img) => img.category === 'cover').length,
    post: images.filter((img) => img.category === 'post').length,
  };

  const mediaUrls = filteredImages.map((img) => img.imageUrl);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <Image className="w-12 h-12 text-muted" />
        <h3 className="text-lg font-semibold text-foreground">No Images Yet</h3>
        <p className="text-muted-light">
          This gallery is empty. Images from posts, profile pictures, and cover photos will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 pb-4 border-b border-border">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('all');
            setViewerIndex(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === 'all'
              ? 'bg-gray-700 text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
          }`}
        >
          <ImageIcon size={16} />
          All ({categoryCounts.all})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('profile');
            setViewerIndex(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === 'profile'
              ? 'bg-gray-700 text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
          }`}
        >
          <User size={16} />
          Profile ({categoryCounts.profile})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('cover');
            setViewerIndex(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === 'cover'
              ? 'bg-gray-700 text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
          }`}
        >
          <Camera size={16} />
          Cover ({categoryCounts.cover})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('post');
            setViewerIndex(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === 'post'
              ? 'bg-gray-700 text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
          }`}
        >
          <Image size={16} />
          Posts ({categoryCounts.post})
        </button>
      </div>

      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <Image className="w-12 h-12 text-muted" />
          <h3 className="text-lg font-semibold text-foreground">
            No {selectedCategory === 'all' ? '' : selectedCategory} Images
          </h3>
          <p className="text-muted-light">No images found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
          {filteredImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setViewerIndex(index)}
              className="aspect-square bg-card rounded-lg overflow-hidden relative group cursor-pointer text-left"
              aria-label={`Open ${image.alt || image.category} image`}
            >
              <img
                src={image.imageUrl}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <span className="text-white text-xs font-medium capitalize px-2 py-1 bg-black/50 rounded">
                  {image.category}
                </span>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    image.category === 'profile'
                      ? 'bg-blue-500/80 text-white'
                      : image.category === 'cover'
                        ? 'bg-purple-500/80 text-white'
                        : 'bg-orange-500/80 text-white'
                  }`}
                >
                  {image.category}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewerIndex !== null && mediaUrls.length > 0 && (
        <PostMediaViewer
          media={mediaUrls}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

export default GalleryTab;
