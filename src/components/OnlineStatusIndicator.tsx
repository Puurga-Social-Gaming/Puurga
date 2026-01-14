import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OnlineStatusIndicatorProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({ 
  userId, 
  size = 'sm', 
  className = '' 
}) => {
  const { isUserOnline } = useOnlineStatus();
  const online = isUserOnline(userId);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (!online) return null;

  return (
    <div 
      className={`${sizeClasses[size]} bg-green-500 rounded-full border-2 border-white ${className}`}
      title="Online"
    />
  );
};

interface OnlineStatusBadgeProps {
  userId: string;
  showText?: boolean;
  className?: string;
}

export const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({ 
  userId, 
  showText = false, 
  className = '' 
}) => {
  const { isUserOnline } = useOnlineStatus();
  const online = isUserOnline(userId);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      {showText && (
        <span className={`text-xs ${online ? 'text-green-500' : 'text-gray-400'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

export default OnlineStatusIndicator;
