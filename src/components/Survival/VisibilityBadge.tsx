import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface VisibilityBadgeProps {
  visibilityScore: number;
}

const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({ visibilityScore }) => {
  const getColor = () => {
    if (visibilityScore >= 80) return 'text-green-400';
    if (visibilityScore >= 50) return 'text-cyan-400';
    if (visibilityScore >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getIcon = () => {
    if (visibilityScore >= 80) return <Eye size={10} />;
    if (visibilityScore >= 50) return <Eye size={10} />;
    if (visibilityScore >= 20) return <EyeOff size={10} />;
    return <EyeOff size={10} />;
  };

  const getLabel = () => {
    if (visibilityScore >= 80) return 'Visible';
    if (visibilityScore >= 50) return 'Fading';
    if (visibilityScore >= 20) return 'Dimmed';
    return 'Ghosted';
  };

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${getColor()} border border-current/20`}>
      {getIcon()}
      <span>{getLabel()}</span>
      <span className="opacity-60">({visibilityScore})</span>
    </div>
  );
};

export default VisibilityBadge;
