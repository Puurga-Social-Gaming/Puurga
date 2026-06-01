import React from 'react';
import { motion } from 'framer-motion';
import { Skull, Flame, Activity, Shield } from 'lucide-react';

interface ThreatMeterProps {
  threatLevel: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const THREAT_COLORS = [
  { max: 20, color: 'bg-green-500', label: 'Low', icon: Shield },
  { max: 40, color: 'bg-yellow-500', label: 'Rising', icon: Activity },
  { max: 60, color: 'bg-orange-500', label: 'Dangerous', icon: Flame },
  { max: 80, color: 'bg-red-500', label: 'Hunted', icon: Flame },
  { max: 100, color: 'bg-purple-500', label: 'Legendary', icon: Skull },
];

const ThreatMeter: React.FC<ThreatMeterProps> = ({ threatLevel, size = 'md', showLabel = true }) => {
  const tier = THREAT_COLORS.find(t => threatLevel <= t.max) || THREAT_COLORS[THREAT_COLORS.length - 1];
  const Icon = tier.icon;

  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };
  const iconSizes = { sm: 12, md: 14, lg: 16 };
  const textSizes = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${heights[size]} rounded-full bg-border/40 overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${threatLevel}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${tier.color}`}
        />
      </div>
      {showLabel && (
        <div className={`flex items-center gap-1 ${textSizes[size]} text-muted/70`}>
          <Icon size={iconSizes[size]} />
          <span className="font-semibold">{tier.label}</span>
        </div>
      )}
    </div>
  );
};

export default ThreatMeter;
