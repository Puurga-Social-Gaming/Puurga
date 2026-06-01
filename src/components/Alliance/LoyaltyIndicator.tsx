import React from 'react';
import { Heart } from 'lucide-react';

interface LoyaltyIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LoyaltyIndicator: React.FC<LoyaltyIndicatorProps> = ({ score, showLabel = false, size = 'md' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-1.5';
      case 'lg':
        return 'w-24 h-3';
      default:
        return 'w-16 h-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  const getColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="flex items-center gap-2">
      <Heart className={`${getIconSize()} ${getTextColor()}`} />
      <div className={`bg-gray-700 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-semibold ${getTextColor()}`}>
          {score}
        </span>
      )}
    </div>
  );
};

export default LoyaltyIndicator;
