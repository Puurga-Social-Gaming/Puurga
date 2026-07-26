import React, { useState, useEffect } from 'react';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import AvatarViewer from './AvatarViewer';
import { DEFAULT_IMAGES } from '../constants/defaultImages';

const DEFAULT_AVATAR = DEFAULT_IMAGES.avatar;

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showBorder?: boolean;
  userId?: string;
  showOnlineStatus?: boolean;
  expandOnTap?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  size = 'md',
  className = '',
  onClick,
  showBorder = false,
  userId,
  showOnlineStatus = false,
  expandOnTap = false
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset failure state when a new src arrives
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const resolvedSrc = (!src || failed) ? DEFAULT_AVATAR : src;

  const handleError = () => {
    // Avoid infinite reload loop when the fallback itself fails or a broken URL is reused
    if (!failed) setFailed(true);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (expandOnTap) {
      e.preventDefault();
      e.stopPropagation();
      setIsViewerOpen(true);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="relative inline-block">
      <img
        src={resolvedSrc}
        alt={alt}
        onError={handleError}
        onClick={handleAvatarClick}
        className={`rounded-full object-cover bg-[#2d2d2d] shadow-theme-sm ${sizeClasses[size]} ${showBorder ? 'border-2 border-highlight' : ''} ${onClick || expandOnTap ? 'cursor-pointer hover:opacity-90 hover:shadow-theme-md transition-shadow' : ''} ${className}`}
      />
      {showOnlineStatus && userId && (
        <OnlineStatusIndicator 
          userId={userId} 
          size={size === 'sm' ? 'sm' : size === 'xl' ? 'lg' : 'md'}
          className="absolute -bottom-1 -right-1"
        />
      )}
      {expandOnTap && (
        <AvatarViewer
          src={resolvedSrc}
          alt={alt}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default Avatar;