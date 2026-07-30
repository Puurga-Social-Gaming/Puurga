import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAMES_CATALOG, getTranslatedGameName, type GameEntry } from '../../games/catalog';

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

const STAGGER_DELAY_MS = 800;

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

  const [visibleCount, setVisibleCount] = useState(1);

  const undismissed = useMemo(
    () => newGames.filter((g) => !dismissedIds.has(g.id)),
    [newGames, dismissedIds],
  );

  const visible = undismissed.slice(0, visibleCount);

  useEffect(() => {
    if (visibleCount >= undismissed.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, STAGGER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visibleCount, undismissed.length]);

  if (undismissed.length === 0) return null;

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
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-lg border border-orange-500/20 dark:border-orange-500/30 bg-card dark:bg-card"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-[0.10] dark:opacity-[0.15]"
              style={{ backgroundImage: `url('${game.icon}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.06] via-transparent to-transparent dark:from-orange-500/10 pointer-events-none" />

            <div className="relative flex items-center gap-2 p-2 sm:p-2.5">
              <div className="p-1.5 rounded-md bg-orange-500/15 dark:bg-orange-500/20 shrink-0 border border-orange-500/15">
                <Sparkles className="w-3 h-3 text-orange-600 dark:text-orange-300" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[8px] uppercase tracking-widest text-orange-600 dark:text-orange-400 font-bold leading-none">
                  {t('games.newGameAvailable')}
                </p>
                <h3 className="text-[11px] sm:text-xs font-bold text-foreground truncate leading-tight mt-0.5">
                  {getTranslatedGameName(game.id)}
                </h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => play(game)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md
                    bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                    text-white text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5" fill="currentColor" />
                  {t('games.playNow')}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(game.id)}
                  className="p-1 rounded text-muted hover:text-foreground hover:bg-card-hover transition cursor-pointer"
                  aria-label={t('games.dismiss')}
                >
                  <X className="w-3 h-3" />
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
