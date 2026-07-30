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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm"
      >
        <div className="mx-auto w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
          <Construction className="w-10 h-10 text-muted" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            {gameName || t('games.comingSoon', 'Coming Soon')}
          </h1>
          <p className="text-sm text-muted">
            {t('games.comingSoonDesc', 'This game is under construction. Check back soon!')}
          </p>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-card-hover transition-colors"
          >
            <Gamepad2 className="w-4 h-4" />
            {t('games.backToGames', 'Back to Games')}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default ComingSoon;
