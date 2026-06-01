import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface SupabaseVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onLoad?: () => void;
  controls?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  onClick?: () => void;
}

const SupabaseVideo: React.FC<SupabaseVideoProps> = ({
  src,
  className = '',
  style,
  onError,
  onLoad,
  controls = true,
  muted = false,
  autoPlay = false,
  loop = false,
  playsInline = true,
  onClick,
}) => {
  const [videoSrc, setVideoSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const processVideo = async () => {
      // If it's a Supabase storage URL, try to get a signed URL
      if (src.includes('supabase.co/storage/v1/object/public/')) {
        try {
          // Extract bucket and file path from URL
          const urlObj = new URL(src);
          const pathParts = urlObj.pathname.split('/object/public/');
          if (pathParts.length === 2) {
            const [bucket, ...filePathParts] = pathParts[1].split('/');
            const filePath = filePathParts.join('/');

            // Get signed URL (skip for public Media bucket)
            if (bucket !== 'Media') {
              const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 3600); // 1 hour expiry

              if (data?.signedUrl && !error) {
                setVideoSrc(data.signedUrl);
              }
            }
          }
        } catch (error) {
          console.error('Error processing Supabase video:', error);
        }
      }
      setIsLoading(false);
    };

    processVideo();
  }, [src]);

  const handleLoadedData = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };

  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse rounded-xl flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-gray-400 text-sm">Loading video...</div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      className={className}
      style={style}
      controls={controls}
      muted={muted}
      autoPlay={autoPlay}
      loop={loop}
      playsInline={playsInline}
      onClick={onClick}
      onLoadedData={handleLoadedData}
      onError={(e) => {
        console.error('Video failed to load:', videoSrc);
        if (onError) onError(e);
      }}
    />
  );
};

export default SupabaseVideo;
