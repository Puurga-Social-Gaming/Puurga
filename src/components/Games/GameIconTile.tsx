import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { PuurgaGameCatalogEntry } from '../../config/puurgaGamesCatalog';

interface GameIconTileProps {
  game: PuurgaGameCatalogEntry;
  onClick: () => void;
  index?: number;
}

/** Phone-style square app icon + label */
const GameIconTile: React.FC<GameIconTileProps> = ({ game, onClick, index = 0 }) => {
  const { t } = useTranslation();
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.04 * index, duration: 0.25 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      aria-label={`Play ${game.title}`}
    >
      <div className="relative w-full aspect-square rounded-[22%] overflow-hidden shadow-md border border-white/10 bg-neutral-900 ring-1 ring-black/20">
        <img
          src={game.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/25 pointer-events-none" />

        {game.isNew && (
          <span className="absolute top-[8%] right-[8%] z-10 rounded-full bg-violet-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow-lg">
            {t('games.new')}
          </span>
        )}

      </div>

      <span className="w-full text-[11px] sm:text-xs font-medium text-foreground text-center line-clamp-2 leading-tight px-0.5">
        {game.title}
      </span>
    </motion.button>
  );
};

export default GameIconTile;
