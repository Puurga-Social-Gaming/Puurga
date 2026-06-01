import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Flame, Gamepad2, Zap, Gift, ArrowRight } from 'lucide-react';

const IntroScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleContinue = () => {
    navigate('/login');
  };

  const features = [
    { icon: Users, key: 'onboarding.features.connect' },
    { icon: Flame, key: 'onboarding.features.purge' },
    { icon: Gamepad2, key: 'onboarding.features.play' },
    { icon: Zap, key: 'onboarding.features.earn' },
    { icon: Gift, key: 'onboarding.features.redeem' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg text-center"
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-4"
        >
          {t('onboarding.intro.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-muted text-base md:text-lg leading-relaxed mb-8"
        >
          {t('onboarding.intro.description')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="grid grid-cols-5 gap-2 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex flex-col items-center gap-1 p-3 bg-card border border-border rounded-xl"
            >
              <feature.icon size={20} className="text-accent" />
              <span className="text-[10px] text-muted">
                {t(feature.key)}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          onClick={handleContinue}
          className="flex items-center justify-center gap-2 w-full p-4 bg-accent text-black font-medium rounded-xl hover:opacity-90 transition-colors"
        >
          {t('common.continue')}
          <ArrowRight size={20} />
        </motion.button>
      </motion.div>
    </div>
  );
};

export default IntroScreen;