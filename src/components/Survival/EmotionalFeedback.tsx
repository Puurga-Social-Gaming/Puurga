import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSurvival } from '../../context/SurvivalContext';
import { getPurgeTier } from '../../types/survival';

const EmotionalFeedback: React.FC = () => {
  const { survivalState } = useSurvival();
  const prevPurgeCountRef = useRef(survivalState?.purge_count ?? 0);
  const [showPulse, setShowPulse] = React.useState(false);
  const [pulseIntensity, setPulseIntensity] = React.useState(0);

  useEffect(() => {
    if (!survivalState) return;
    const prev = prevPurgeCountRef.current;
    const current = survivalState.purge_count;

    if (current > prev) {
      const intensity = tier === 'COLLAPSING' ? 2 : tier === 'HUNTED' ? 1 : 0.5;

      setPulseIntensity(intensity);
      setShowPulse(true);

      const timer = setTimeout(() => setShowPulse(false), 2000);
      const prevTimer = setTimeout(() => {
        setPulseIntensity(0);
      }, 500);

      prevPurgeCountRef.current = current;
      return () => {
        clearTimeout(timer);
        clearTimeout(prevTimer);
      };
    }
    prevPurgeCountRef.current = current;
  }, [survivalState?.purge_count, survivalState]);

  if (!survivalState) return null;

  const tier = getPurgeTier(survivalState.purge_count);
  const colors: Record<string, string> = {
    STABLE: 'rgba(34,197,94,0.15)',
    WATCHED: 'rgba(251,191,36,0.2)',
    HUNTED: 'rgba(251,146,60,0.25)',
    COLLAPSING: 'rgba(239,68,68,0.35)',
    GHOSTED: 'rgba(156,163,175,0.2)',
  };

  return (
    <>
      <AnimatePresence>
        {showPulse && (
          <motion.div
            key="purge-pulse"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6 * pulseIntensity, 0],
              scale: [1, 1.02, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="fixed inset-0 pointer-events-none z-[60]"
            style={{
              boxShadow: `inset 0 0 ${80 * pulseIntensity}px ${20 * pulseIntensity}px ${colors[tier] || 'rgba(251,191,36,0.2)'}`,
            }}
          />
        )}
      </AnimatePresence>

      {tier !== 'STABLE' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-[52px] left-0 right-0 pointer-events-none z-50"
        >
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="h-[2px] mx-auto"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors[tier]?.replace('0.2', '0.6') || 'rgba(251,191,36,0.6)'}, transparent)`,
              width: tier === 'GHOSTED' ? '80%' : tier === 'COLLAPSING' ? '60%' : '40%',
            }}
          />
        </motion.div>
      )}
    </>
  );
};

export default EmotionalFeedback;
