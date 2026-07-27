import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Swords } from 'lucide-react';
import type { PuurgaGameCatalogEntry } from '../../config/puurgaGamesCatalog';

interface GameIconTileProps {
  game: PuurgaGameCatalogEntry;
  onClick: () => void;
  index?: number;
  /** Friends currently playing this game */
  friendsPlayingCount?: number;
  friendsPlayingNames?: string[];
  onChallengeClick?: () => void;
}

/** Phone-style square app icon + label — aligned rows on mobile */
const GameIconTile: React.FC<GameIconTileProps> = ({
  game,
  onClick,
  index = 0,
  friendsPlayingCount = 0,
  friendsPlayingNames = [],
  onChallengeClick,
}) => {
  const { t } = useTranslation();
  const hasFriends = friendsPlayingCount > 0;
  const tip =
    hasFriends && friendsPlayingNames.length
      ? friendsPlayingNames.slice(0, 2).join(', ') +
        (friendsPlayingNames.length > 2 ? ` +${friendsPlayingNames.length - 2}` : '')
      : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.04 * index, duration: 0.25 }}
      className="flex flex-col items-center gap-1.5 sm:gap-2 w-full min-w-0"
    >
      <motion.button
        type="button"
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        onClick={onClick}
        className="group relative flex flex-col items-center w-full min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
        aria-label={`Play ${game.title}${hasFriends ? ` — ${friendsPlayingCount} friend(s) playing` : ''}`}
        title={tip ? `Playing: ${tip}` : undefined}
      >
        <div
          className="
            relative w-full max-w-[5.25rem] sm:max-w-[6rem] mx-auto aspect-square rounded-[22%] overflow-hidden
            bg-card border border-border
            shadow-md shadow-black/10 dark:shadow-black/40
            ring-1 ring-black/[0.04] dark:ring-white/[0.06]
            transition-[box-shadow,transform,border-color] duration-200 ease-out
            group-hover:border-orange-500/45
            group-hover:shadow-lg group-hover:shadow-orange-500/15
            dark:group-hover:shadow-orange-500/20
            group-hover:ring-orange-500/25
          "
        >
          <img
            src={game.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
            loading="lazy"
            draggable={false}
          />
          {/* Theme-aware overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 dark:from-white/[0.06] dark:to-black/40 pointer-events-none" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-orange-500/10 pointer-events-none" />

          {game.isNew && (
            <span className="absolute top-[7%] right-[7%] z-10 rounded-full bg-orange-600 dark:bg-orange-500 px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold uppercase tracking-wide text-white shadow-md leading-none">
              {t('games.new')}
            </span>
          )}

          {hasFriends && (
            <span
              className="absolute top-[7%] left-[7%] z-10 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-md ring-2 ring-background"
              title={tip || `${friendsPlayingCount} friend(s) playing`}
            >
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative">{friendsPlayingCount > 9 ? '9+' : friendsPlayingCount}</span>
            </span>
          )}
        </div>

        <span className="w-full min-h-[1.6rem] sm:min-h-[1.85rem] text-[9px] sm:text-[11px] font-medium text-foreground/90 group-hover:text-foreground text-center line-clamp-2 leading-tight px-0.5 flex items-start justify-center mt-1 transition-colors">
          {game.title}
        </span>
      </motion.button>

      {hasFriends && onChallengeClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChallengeClick();
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold cursor-pointer
            bg-orange-500/10 text-orange-700 border border-orange-500/30
            dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/35
            hover:bg-orange-500 hover:text-white hover:border-orange-500
            dark:hover:bg-orange-500 dark:hover:text-white
            transition-colors duration-150"
        >
          <Swords size={10} />
          {t('games.challenge', 'Challenge')}
        </button>
      )}
    </motion.div>
  );
};

export default GameIconTile;
