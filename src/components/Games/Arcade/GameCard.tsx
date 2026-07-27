import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star, Users, Heart, Play, Clock, ChevronRight } from 'lucide-react';
import type { GameEntry } from '../../../games/catalog';

interface GameCardProps {
  game: GameEntry;
  index?: number;
  onClick?: () => void;
  friendsPlayingCount?: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const GameCard: React.FC<GameCardProps> = ({
  game,
  index = 0,
  onClick,
  friendsPlayingCount = 0,
}) => {
  const { t } = useTranslation();
  const [favourited, setFavourited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const difficultyClass = DIFFICULTY_COLORS[game.difficulty] || DIFFICULTY_COLORS.Medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative"
    >
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-full text-left rounded-2xl overflow-hidden
          bg-card border border-border/50
          shadow-md shadow-black/5 dark:shadow-black/20
          hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30
          hover:border-orange-500/30
          transition-shadow duration-300 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Artwork */}
        <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
          <img
            src={game.icon}
            alt={game.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              group-hover:scale-110`}
          />
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Difficulty badge */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${difficultyClass}`}>
              {t(`games.difficulty.${game.difficulty.toLowerCase()}`)}
            </span>
          </div>

          {/* Favourite button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFavourited(!favourited);
            }}
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full
              bg-black/40 backdrop-blur-sm border border-white/10
              flex items-center justify-center
              hover:bg-black/60 hover:border-white/20
              transition-all duration-200"
            aria-label={favourited ? t('games.removeFromFavorites') : t('games.addToFavorites')}
          >
            <Heart
              size={14}
              className={`transition-colors duration-200 ${
                favourited ? 'fill-red-400 text-red-400' : 'text-white/70 hover:text-white'
              }`}
            />
          </button>

          {/* Friends playing badge */}
          {friendsPlayingCount > 0 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/90 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white">
                {friendsPlayingCount} {t('games.players')}
              </span>
            </div>
          )}

          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600/90 backdrop-blur-sm shadow-lg shadow-orange-600/30">
              <Play size={16} className="text-white fill-white" />
              <span className="text-sm font-bold text-white">{t('games.play')}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="px-3 py-3 sm:px-4 sm:py-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors">
              {game.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400">{game.rating}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted mt-1 line-clamp-1 leading-snug">
            {game.description}
          </p>

          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/40">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <Users size={10} className="text-muted/70" />
                {game.playerCount?.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <Clock size={10} className="text-muted/70" />
                {game.playTime}
              </span>
            </div>
            <ChevronRight size={14} className="text-muted group-hover:text-orange-400 transition-colors" />
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
};

export default GameCard;
