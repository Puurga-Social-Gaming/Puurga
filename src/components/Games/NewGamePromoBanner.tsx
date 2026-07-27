import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAMES_CATALOG, getTranslatedGameName, getTranslatedGameDescription, type GameEntry } from '../../games/catalog';

const PROMO_STORAGE_PREFIX = 'puurga_new_game_promo_dismissed_';

function isPromoDismissed(gameId: string): boolean {
  return localStorage.getItem(`${PROMO_STORAGE_PREFIX}${gameId}`) === '1';
}

function dismissPromo(gameId: string): void {
  localStorage.setItem(`${PROMO_STORAGE_PREFIX}${gameId}`, '1');
}

interface NewGamePromoBannerProps {
  className?: string;
}

const NewGamePromoBanner: React.FC<NewGamePromoBannerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const newGames = useMemo(() => GAMES_CATALOG.filter(g => g.status === 'live'), []);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    newGames.forEach((g) => {
      if (isPromoDismissed(g.id)) s.add(g.id);
    });
    return s;
  });

  const visible = newGames.filter((g) => !dismissedIds.has(g.id));
  if (visible.length === 0) return null;

  const dismiss = (gameId: string) => {
    dismissPromo(gameId);
    setDismissedIds((prev) => new Set(prev).add(gameId));
  };

  const play = (game: GameEntry) => {
    navigate(game.route);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {visible.map((game) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="relative overflow-hidden rounded-xl border border-orange-500/25 dark:border-orange-500/35 bg-card dark:bg-card"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-[0.12] dark:opacity-[0.18]"
              style={{ backgroundImage: `url('${game.icon}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.08] via-transparent to-red-500/[0.06] dark:from-orange-500/15 dark:to-red-500/10 pointer-events-none" />

            <div className="relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-orange-500/15 dark:bg-orange-500/20 shrink-0 border border-orange-500/20">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-widest text-orange-700 dark:text-orange-300 font-bold">
                      {t('games.newGameAvailable')}
                    </p>
                    <button
                      type="button"
                      onClick={() => dismiss(game.id)}
                      className="sm:hidden p-1 -mt-0.5 -mr-1 rounded-md text-muted hover:text-foreground hover:bg-card-hover transition shrink-0 cursor-pointer"
                      aria-label={t('games.dismiss')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">
                    {getTranslatedGameName(game.id)}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted line-clamp-2 mt-0.5 leading-snug">
                    {getTranslatedGameDescription(game.id)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => play(game)}
                  className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg
                    bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                    text-white text-sm font-semibold transition-colors min-h-[40px] cursor-pointer
                    shadow-sm shadow-orange-600/20 dark:shadow-orange-500/25"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  {t('games.playNow')}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(game.id)}
                  className="hidden sm:inline-flex p-2 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition cursor-pointer"
                  aria-label={t('games.dismiss')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NewGamePromoBanner;
