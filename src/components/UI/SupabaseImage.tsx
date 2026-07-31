import React, { useState, useEffect, useRef } from 'react';
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
  const lastSrcRef = useRef(src);

  useEffect(() => {
    if (src === lastSrcRef.current && imageSrc) return;
    lastSrcRef.current = src;
    setImageSrc(src);

    const processImage = async () => {
      // Public Media bucket URLs don't need signing
      if (!src.includes('supabase.co/storage/v1/object/public/')) return;

      try {
        const urlObj = new URL(src);
        const pathParts = urlObj.pathname.split('/object/public/');
        if (pathParts.length !== 2) return;

        const [bucket, ...filePathParts] = pathParts[1].split('/');
        const filePath = filePathParts.join('/');

        if (bucket === 'Media') return;

        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600);

        if (data?.signedUrl && !error && lastSrcRef.current === src) {
          setImageSrc(data.signedUrl);
        }
      } catch (error) {
        console.error('Error processing Supabase image:', error);
      }
    };

    processImage();
  }, [src]);

  // Show the image immediately — no pulse skeleton swap that causes blinking
  return (
    <img
      src={imageSrc || src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      crossOrigin="anonymous"
      onError={(e) => {
        if (onError) onError(e);
      }}
      onLoad={() => {
        if (onLoad) onLoad();
      }}
    />
  );
};

export default SupabaseImage;
