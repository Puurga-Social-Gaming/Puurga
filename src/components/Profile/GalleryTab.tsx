import React, { useState, useEffect } from 'react';
import { Loader2, Image, User, ImageIcon, Camera } from 'lucide-react';
import api from '../../lib/axios';

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

  useEffect(() => {
    const fetchGalleryImages = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users/gallery');
        setImages(response.data || []);
      } catch (error) {
        console.error('Failed to fetch gallery images:', error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  // Filter images by category
  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter(img => img.category === selectedCategory);

  // Count images by category
  const categoryCounts = {
    all: images.length,
    profile: images.filter(img => img.category === 'profile').length,
    cover: images.filter(img => img.category === 'cover').length,
    post: images.filter(img => img.category === 'post').length,
  };

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
        <p className="text-muted-light">This gallery is empty. Images from posts, profile pictures, and cover photos will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-border">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedCategory === 'all'
              ? 'bg-accent text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
            }`}
        >
          <ImageIcon size={16} />
          All ({categoryCounts.all})
        </button>
        <button
          onClick={() => setSelectedCategory('profile')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedCategory === 'profile'
              ? 'bg-accent text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
            }`}
        >
          <User size={16} />
          Profile ({categoryCounts.profile})
        </button>
        <button
          onClick={() => setSelectedCategory('cover')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedCategory === 'cover'
              ? 'bg-accent text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
            }`}
        >
          <Camera size={16} />
          Cover ({categoryCounts.cover})
        </button>
        <button
          onClick={() => setSelectedCategory('post')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedCategory === 'post'
              ? 'bg-accent text-white'
              : 'bg-card text-muted hover:bg-card-hover hover:text-foreground'
            }`}
        >
          <Image size={16} />
          Posts ({categoryCounts.post})
        </button>
      </div>

      {/* Gallery Grid */}
      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <Image className="w-12 h-12 text-muted" />
          <h3 className="text-lg font-semibold text-foreground">No {selectedCategory === 'all' ? '' : selectedCategory} Images</h3>
          <p className="text-muted-light">No images found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="aspect-square bg-card rounded-lg overflow-hidden relative group cursor-pointer"
            >
              <img
                src={image.imageUrl}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-white text-xs font-medium capitalize px-2 py-1 bg-black/50 rounded">
                  {image.category}
                </span>
              </div>
              {/* Category badge in corner */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`px-2 py-1 rounded text-xs font-medium ${image.category === 'profile' ? 'bg-blue-500/80 text-white' :
                    image.category === 'cover' ? 'bg-purple-500/80 text-white' :
                      'bg-orange-500/80 text-white'
                  }`}>
                  {image.category}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryTab;
