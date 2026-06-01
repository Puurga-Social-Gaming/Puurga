import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  Trophy,
  Coins,
  Zap,
  Crown,
  Flame,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import PurgaSlicer from '../../components/Games/PurgaSlicer';
import NewGamePromoBanner from '../../components/Games/NewGamePromoBanner';
import GameIconTile from '../../components/Games/GameIconTile';
import { createIntegratedLazy } from '../../components/Games/integratedGameLoaders';
import {
  getGameById,
  getTranslatedGamesCatalog,
  type PuurgaGameCatalogEntry,
  type IntegratedSlotId,
} from '../../config/puurgaGamesCatalog';

type ArenaView = 'menu' | 'purgaslicer' | 'integrated';

const PurgaGames: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<ArenaView>('menu');
  const [integratedSlot, setIntegratedSlot] = useState<IntegratedSlotId | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const mainGames = useMemo(() => getTranslatedGamesCatalog(), [t]);

  const IntegratedShell = useMemo(
    () => (integratedSlot ? createIntegratedLazy(integratedSlot) : null),
    [integratedSlot],
  );

  useEffect(() => {
    const stored = localStorage.getItem('perga_last_result');
    if (stored) {
      try {
        setLastResult(JSON.parse(stored));
      } catch {
        console.error('Failed to parse last result');
      }
    }
  }, []);

  useEffect(() => {
    const playId = searchParams.get('play');
    if (!playId) return;

    const game = getGameById(playId);
    if (game?.embedKey === 'integrated' && game.integratedSlot) {
      setIntegratedSlot(game.integratedSlot);
      setCurrentView('integrated');
    } else if (game?.embedKey === 'purgaslicer') {
      setCurrentView('purgaslicer');
    }

    searchParams.delete('play');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleGameSelect = (game: PuurgaGameCatalogEntry) => {
    localStorage.setItem(
      'perga_last_result',
      JSON.stringify({ game: game.title, score: 0, net: 0 }),
    );

    if (game.action === 'embed') {
      if (game.embedKey === 'purgaslicer') {
        setCurrentView('purgaslicer');
        return;
      }
      if (game.embedKey === 'integrated' && game.integratedSlot) {
        setIntegratedSlot(game.integratedSlot);
        setCurrentView('integrated');
        return;
      }
    }
    if (game.action === 'navigate' && game.target) {
      navigate(game.target);
    }
  };

  const handleBackToMenu = () => {
    setIntegratedSlot(null);
    setCurrentView('menu');
  };

  const embedShell = (child: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-background relative"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-4 z-[10001]"
      >
        <button
          type="button"
          onClick={handleBackToMenu}
          className="flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-md border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">{t('games.backToArena')}</span>
        </button>
      </motion.div>
      <div className="w-full h-full min-h-0 overflow-hidden">{child}</div>
    </motion.div>
  );

  if (currentView === 'purgaslicer') {
    return embedShell(<PurgaSlicer className="w-full h-full min-h-screen" />);
  }

  if (currentView === 'integrated' && IntegratedShell) {
    const Shell = IntegratedShell;
    return embedShell(
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-neutral-950">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          </div>
        }
      >
        <Shell onExit={handleBackToMenu} />
      </Suspense>,
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background-secondary to-background pb-10">
      <div className="relative border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 via-transparent to-purple-500/8" />
        <div className="relative max-w-lg mx-auto px-4 pt-8 pb-6 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20 mb-3">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Puurga{' '}
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                {t('games.arena')}
              </span>
            </h1>
            <p className="text-muted text-sm mt-1">{t('games.tapToPlay')}</p>
          </motion.div>

          <div className="mt-4">
            <NewGamePromoBanner />
          </div>

          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-2.5 flex items-center gap-2 text-left"
            >
              <Zap size={16} className="text-orange-400 shrink-0" />
              <p className="text-xs text-foreground">
                <span className="font-semibold">{String(lastResult.game ?? 'Arena')}</span>
                {' · '}
                {String(lastResult.score ?? 0)} pts
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-xl bg-card/60 border border-border p-2 text-center">
              <Coins className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
              <p className="text-sm font-bold text-foreground">2,450</p>
              <p className="text-[9px] text-muted">{t('games.credits')}</p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border p-2 text-center">
              <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-0.5" />
              <p className="text-sm font-bold text-foreground">#127</p>
              <p className="text-[9px] text-muted">{t('games.rank')}</p>
            </div>
            <div className="rounded-xl bg-card/60 border border-border p-2 text-center">
              <Flame className="w-4 h-4 text-red-400 mx-auto mb-0.5" />
              <p className="text-sm font-bold text-foreground">47</p>
              <p className="text-[9px] text-muted">{t('games.played')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4 flex items-center gap-2"
        >
          <Crown className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-foreground">{t('games.allGames')}</h2>
        </motion.div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
          {mainGames.map((game, index) => (
            <GameIconTile
              key={game.id}
              game={game}
              index={index}
              onClick={() => handleGameSelect(game)}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default PurgaGames;
