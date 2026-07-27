import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ComingSoonProps {
  gameName?: string;
  onExit?: () => void;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ gameName, onExit }) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm"
      >
        <div className="mx-auto w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <Construction className="w-10 h-10 text-neutral-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">
            {gameName || t('games.comingSoon', 'Coming Soon')}
          </h1>
          <p className="text-sm text-neutral-400">
            {t('games.comingSoonDesc', 'This game is under construction. Check back soon!')}
          </p>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            <Gamepad2 className="w-4 h-4" />
            {t('games.backToArena', 'Back to Arena')}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default ComingSoon;
