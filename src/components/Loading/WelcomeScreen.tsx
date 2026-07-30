import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PuurgaLogo from '../Icons/PuurgaLogo';
import { Users, Flame, Gamepad2, Zap, Gift } from 'lucide-react';

interface WelcomeScreenProps {
  username: string;
  onComplete?: () => void;
  minDisplayTime?: number;
}

const features = [
  { icon: Users, key: 'onboarding.features.connect' },
  { icon: Flame, key: 'onboarding.features.purge' },
  { icon: Gamepad2, key: 'onboarding.features.play' },
  { icon: Zap, key: 'onboarding.features.earn' },
  { icon: Gift, key: 'onboarding.features.redeem' },
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  username, 
  onComplete,
  minDisplayTime = 3500 
}) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, minDisplayTime / 50);

    // Auto-complete after minimum display time
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, minDisplayTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [minDisplayTime, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center z-[10002]"
      style={{ backgroundColor: 'rgb(var(--bg))', color: 'rgb(var(--fg))' }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgb(var(--accent) / 0.1)' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgb(var(--accent) / 0.1)' }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center justify-center"
        >
          <PuurgaLogo size={56} className="animate-pulse" />
          <div className="absolute -inset-4 rounded-full blur-2xl animate-pulse" style={{ backgroundColor: 'rgb(var(--accent) / 0.1)' }}></div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 text-center space-y-3"
        >
          <p className="text-lg font-medium" style={{ color: 'rgb(var(--muted))' }}>
            {t('auth.welcomeBack', 'Welcome back')}
          </p>
          <p className="text-3xl font-bold tracking-wider" style={{ color: 'rgb(var(--fg))' }}>
            {username}
          </p>
        </motion.div>

        {/* Loading progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 w-64 mx-auto"
        >
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--border))' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: 'rgb(var(--accent))' }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-xs text-center mt-2" style={{ color: 'rgb(var(--muted))' }}>
            {t('common.loading', 'Loading...')}
          </p>
        </motion.div>
      </div>

      {/* Feature preview icons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-12 left-0 right-0 flex justify-center gap-8 sm:gap-12"
      >
        {features.map((feature) => (
          <div key={feature.key} className="flex flex-col items-center gap-1.5" style={{ color: 'rgb(var(--muted))' }}>
            <feature.icon size={22} />
            <span className="text-[10px] font-medium">{t(feature.key)}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;