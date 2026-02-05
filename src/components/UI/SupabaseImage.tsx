import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface SupabaseImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onLoad?: () => void;
}

const SupabaseImage: React.FC<SupabaseImageProps> = ({
  src,
  alt,
  className,
  style,
  onError,
  onLoad,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processImage = async () => {
      // If it's a Supabase storage URL, try to get a signed URL
      if (src.includes('supabase.co/storage/v1/object/public/')) {
        try {
          // Extract bucket and file path from URL
          const urlObj = new URL(src);
          const pathParts = urlObj.pathname.split('/object/public/');
          if (pathParts.length === 2) {
            const [bucket, ...filePathParts] = pathParts[1].split('/');
            const filePath = filePathParts.join('/');

            // Get signed URL
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (data?.signedUrl && !error) {
              setImageSrc(data.signedUrl);
            }
          }
        } catch (error) {
          console.error('Error processing Supabase image:', error);
        }
      }
      setIsLoading(false);
    };

    processImage();
  }, [src]);

  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse rounded-xl ${className}`}
        style={style}
      />
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        console.error('Image failed to load:', imageSrc);
        if (onError) onError(e);
      }}
      onLoad={() => {
        console.log('Image loaded successfully:', imageSrc);
        if (onLoad) onLoad();
      }}
    />
  );
};

export default SupabaseImage;
