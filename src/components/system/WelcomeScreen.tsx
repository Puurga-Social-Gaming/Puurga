import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users, Flame, Gamepad2, Zap, Gift, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onContinue: () => void;
  fadeOut?: boolean;
}

const features = [
  { icon: Users, key: 'onboarding.features.connect' },
  { icon: Flame, key: 'onboarding.features.purge' },
  { icon: Gamepad2, key: 'onboarding.features.play' },
  { icon: Zap, key: 'onboarding.features.earn' },
  { icon: Gift, key: 'onboarding.features.redeem' },
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue, fadeOut = false }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: fadeOut ? 'none' : 'auto' }}
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#0a0a0a] via-[#0f0a0f] to-[#0a0a0a] flex flex-col items-center justify-center"
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"
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
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
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

      <div className="relative z-10 w-full max-w-lg px-6">
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center text-white mb-4"
        >
          {t('onboarding.intro.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-gray-400 text-base md:text-lg leading-relaxed text-center mb-8"
        >
          {t('onboarding.intro.description')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid grid-cols-5 gap-2 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex flex-col items-center gap-1.5 p-3 bg-white/5 border border-white/10 rounded-xl"
            >
              <feature.icon size={20} className="text-white/80" />
              <span className="text-[10px] text-gray-400 font-medium">
                {t(feature.key)}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          onClick={onContinue}
          className="flex items-center justify-center gap-2 w-full p-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {t('common.continue')}
          <ArrowRight size={20} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default WelcomeScreen;
