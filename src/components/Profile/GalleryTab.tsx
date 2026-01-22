import React, { useState, useEffect } from 'react';
import { Loader2, Image } from 'lucide-react';
// import api from '../../lib/axios'; // TODO: Uncomment when API is ready

interface GalleryImage {
  id: string;
  imageUrl: string;
  alt: string;
}

const GalleryTab: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGalleryImages = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call once the endpoint is available.
        // For now, we assume no images are found to hide placeholders.
        // const response = await api.get('/api/users/gallery');
        // setImages(response.data);
        setImages([]); // This will show the "No Images Yet" message.
      } catch (error) {
        console.error('Failed to fetch gallery images:', error);
        setImages([]); // Also clear on error
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
      {images.map((image) => (
        <div key={image.id} className="aspect-square bg-card rounded-lg overflow-hidden relative group">
          <img src={image.imageUrl} alt={image.alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ))}
    </div>
  );
};

export default GalleryTab;
