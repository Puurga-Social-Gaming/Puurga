import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getNewGames,
  isPromoDismissed,
  dismissPromo,
  type PuurgaGameCatalogEntry,
} from '../../config/puurgaGamesCatalog';

interface NewGamePromoBannerProps {
  className?: string;
}

const NewGamePromoBanner: React.FC<NewGamePromoBannerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const newGames = useMemo(() => getNewGames(), []);
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

  const play = (game: PuurgaGameCatalogEntry) => {
    navigate(`/puurga-games?play=${game.id}`);
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
            className="relative overflow-hidden rounded-xl border border-violet-500/40 bg-gradient-to-r from-violet-950/80 via-neutral-950 to-orange-950/40"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url('${game.image}')` }}
            />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-violet-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-violet-300 font-bold">
                    {t('games.newGameAvailable')}
                  </p>
                  <h3 className="text-base font-bold text-white truncate">{game.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{game.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => play(game)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  {t('games.playNow')}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(game.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
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
