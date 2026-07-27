import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../../context/UserContext';

const LEVEL_TITLES = [
  'Newcomer', 'Curious', 'Watcher', 'Regular', 'Known',
  'Trusted', 'Established', 'Veteran', 'Champion', 'Elite',
  'Master', 'Grandmaster', 'Legendary', 'Mythical', 'Cosmic',
  'Divine', 'Transcendent', 'Ascended', 'Eternal', 'Puurga'
];

export function getLevelTitle(level: number): string {
  if (level <= 0) return LEVEL_TITLES[0];
  if (level > LEVEL_TITLES.length) return LEVEL_TITLES[LEVEL_TITLES.length - 1];
  return LEVEL_TITLES[level - 1];
}

export function getXPForNextLevel(level: number): number {
  const thresholds = [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000,
    7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000];
  if (level >= thresholds.length) return 55000;
  return thresholds[level];
}

export function getXPForCurrentLevel(level: number): number {
  const thresholds = [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000,
    7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000];
  if (level <= 0) return 0;
  if (level >= thresholds.length) return thresholds[thresholds.length - 1];
  return thresholds[level - 1];
}

interface XPBarProps {
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export default function XPBar({ showLabel = true, compact = false, className = '' }: XPBarProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const title = getLevelTitle(level);
  const currentLevelXP = getXPForCurrentLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const progress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  if (compact) {
    return (
      <div
        onClick={() => navigate('/dashboard')}
        className={`cursor-pointer group ${className}`}
        title={`${title} · Level ${level} · ${xp} XP`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
            {level}
          </div>
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate('/dashboard')}
      className={`bg-gradient-to-r from-purple-900/40 to-gray-900/40 border border-purple-500/20 rounded-lg p-3 cursor-pointer hover:border-purple-500/40 transition-all ${className}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-600/30">
            {level}
          </div>
          <div>
            <p className="text-xs font-medium text-purple-300">{title}</p>
            <p className="text-[10px] text-gray-500">{xp} XP</p>
          </div>
        </div>
        {showLabel && (
          <span className="text-[10px] text-gray-600">
            {nextLevelXP - xp} XP to Lv.{level + 1}
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 rounded-full"
        />
      </div>
    </div>
  );
}
