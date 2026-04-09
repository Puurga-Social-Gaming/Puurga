import React from 'react';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';

const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyZDJkMmQiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4NSIgcj0iMzUiIGZpbGw9IiM0MDQwNDAiLz48cGF0aCBkPSJNMTYwIDE2NWMwLTMzLjEzNy0yNi44NjMtNjAtNjAtNjBzLTYwIDI2Ljg2My02MCA2MCIgc3Ryb2tlPSIjNDA0MDQwIiBzdHJva2Utd2lkdGg9IjEyIi8+PC9zdmc+';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showBorder?: boolean;
  userId?: string;
  showOnlineStatus?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  size = 'md',
  className = '',
  onClick,
  showBorder = false,
  userId,
  showOnlineStatus = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_AVATAR;
  };

  return (
    <div className="relative inline-block">
      <img
        src={src || DEFAULT_AVATAR}
        alt={alt}
        onError={handleError}
        onClick={onClick}
        className={`rounded-full object-cover bg-[#2d2d2d] shadow-theme-sm ${sizeClasses[size]} ${showBorder ? 'border-2 border-highlight' : ''} ${onClick ? 'cursor-pointer hover:opacity-90 hover:shadow-theme-md transition-shadow' : ''} ${className}`}
      />
      {showOnlineStatus && userId && (
        <OnlineStatusIndicator 
          userId={userId} 
          size={size === 'sm' ? 'sm' : size === 'xl' ? 'lg' : 'md'}
          className="absolute -bottom-1 -right-1"
        />
      )}
    </div>
  );
};

export default Avatar;