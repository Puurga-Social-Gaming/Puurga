import React from 'react';
import { Shield, AlertTriangle, Skull, Ghost, Flame } from 'lucide-react';
import {
  SURVIVAL_STATE_COLORS,
  SURVIVAL_STATE_LABELS,
  SurvivalState,
} from '../../types/survival';

interface SurvivalBadgeProps {
  state: SurvivalState;
  threatLevel?: number;
  reputationScore?: number;
  size?: 'sm' | 'md';
}

const ICON_MAP: Record<SurvivalState, React.ReactNode> = {
  SAFE: <Shield size={10} />,
  WARNING: <AlertTriangle size={10} />,
  HUNTED: <Flame size={10} />,
  COLLAPSING: <Skull size={10} />,
  GHOSTED: <Ghost size={10} />,
};

const ICON_MAP_MD: Record<SurvivalState, React.ReactNode> = {
  SAFE: <Shield size={12} />,
  WARNING: <AlertTriangle size={12} />,
  HUNTED: <Flame size={12} />,
  COLLAPSING: <Skull size={12} />,
  GHOSTED: <Ghost size={12} />,
};

const SurvivalBadge: React.FC<SurvivalBadgeProps> = ({
  state,
  reputationScore,
  size = 'sm',
}) => {
  const colorClass = SURVIVAL_STATE_COLORS[state] || SURVIVAL_STATE_COLORS.SAFE;
  const label = SURVIVAL_STATE_LABELS[state] || 'Safe';
  const icon = size === 'sm' ? ICON_MAP[state] : ICON_MAP_MD[state];

  return (
    <div className={`inline-flex items-center gap-1 rounded-full ${size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'} font-semibold ${colorClass}`}>
      {icon}
      <span>{label}</span>
      {reputationScore !== undefined && (
        <span className="ml-0.5 opacity-70">({reputationScore})</span>
      )}
    </div>
  );
};

export default SurvivalBadge;
