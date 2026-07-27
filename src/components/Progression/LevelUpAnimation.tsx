import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getLevelTitle } from './XPBar';

interface LevelUpData {
  level: number;
  title: string;
  bonusCredits?: number;
}

export default function LevelUpAnimation() {
  const { user } = useUser();
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);

  useWebSocket({
    onLevelUp: (payload) => {
      if (payload.userId === user?.id) {
        setLevelUp({
          level: payload.level,
          title: payload.title || getLevelTitle(payload.level),
          bonusCredits: payload.bonusCredits,
        });
      }
    },
  });

  useEffect(() => {
    if (levelUp) {
      const timer = setTimeout(() => setLevelUp(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [levelUp]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="fixed bottom-6 right-6 z-[100] pointer-events-none"
        >
          <div className="bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 border-2 border-purple-400 rounded-xl px-6 py-4 shadow-2xl shadow-purple-600/30 backdrop-blur-xl min-w-[240px]">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-purple-600/40 border border-purple-400/30"
              >
                {levelUp.level}
              </motion.div>
              <div>
                <p className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold">Level Up!</p>
                <p className="text-base font-bold text-white">{levelUp.title}</p>
                <p className="text-xs text-gray-400">Level {levelUp.level}</p>
              </div>
            </div>
            {levelUp.bonusCredits && (
              <div className="mt-2 pt-2 border-t border-purple-500/20 text-center">
                <p className="text-[10px] text-purple-400">+{levelUp.bonusCredits} bonus credits</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
