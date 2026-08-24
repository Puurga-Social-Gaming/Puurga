import React, { useState, useEffect } from 'react';
import SupabaseImage from './SupabaseImage';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  aspectRatio?: string; // e.g., '16/9', '4/3', '3/4', '1/1', or 'auto' to preserve original
  maxWidth?: string;
  maxHeight?: string;
  defaultAspectRatio?: string; // Fallback aspect ratio before image loads (prevents CLS)
  onClick?: () => void;
}

/**
 * ResponsiveImage component that preserves original aspect ratios
 * and provides flexible, responsive image rendering.
 * 
 * Features:
 * - Preserves original aspect ratio (no stretching/squashing)
 * - Responsive width with automatic height
 * - CSS aspect-ratio support
 * - object-fit for proper containment
 * - Lazy loading support
 * - No image distortion
 */
const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className = '',
  objectFit = 'cover',
  aspectRatio = 'auto',
  maxWidth = '100%',
  maxHeight,
  defaultAspectRatio = '4/5', // Default to portrait-like ratio for social media
  onClick,
}) => {
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Calculate natural aspect ratio from the image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      setNaturalAspectRatio(ratio);
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);

  // Determine the CSS aspect-ratio value
  // Use natural ratio if available, otherwise use default fallback, then auto
  const cssAspectRatio = aspectRatio === 'auto' && naturalAspectRatio
    ? `${naturalAspectRatio} / 1`
    : aspectRatio === 'auto'
    ? defaultAspectRatio // Use default ratio before image loads to prevent CLS
    : aspectRatio;

  const containerStyle: React.CSSProperties = {
    maxWidth,
    maxHeight,
    width: '100%',
    aspectRatio: cssAspectRatio === 'auto' ? undefined : cssAspectRatio,
  };

  const imageStyle: React.CSSProperties = {
    objectFit,
    width: '100%',
    height: '100%',
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
      onClick={onClick}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse backdrop-blur-sm" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.1))' }} />
      )}
      <SupabaseImage
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={imageStyle}
      />
    </div>
  );
};

export default ResponsiveImage;
