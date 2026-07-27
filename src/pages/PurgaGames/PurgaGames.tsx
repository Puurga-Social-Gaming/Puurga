import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import MatchmakingPanel from '../../components/Games/MatchmakingPanel';
import ChallengePanel from '../../components/Games/ChallengePanel';
import { createIntegratedLazy } from '../../components/Games/integratedGameLoaders';
import { useGamePresence } from '../../hooks/useGamePresence';
import { getGamePresence, type GamePresenceUser } from '../../services/challengeService';
import { websocketService } from '../../services/websocketService';
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
  const [friendPresence, setFriendPresence] = useState<GamePresenceUser[]>([]);
  const [challengeFocus, setChallengeFocus] = useState<{
    opponentId?: string;
    gameId?: string;
  } | null>(null);

  const mainGames = useMemo(() => getTranslatedGamesCatalog(), [t]);

  const refreshPresence = useCallback(() => {
    void getGamePresence()
      .then(setFriendPresence)
      .catch(() => setFriendPresence([]));
  }, []);

  useEffect(() => {
    refreshPresence();
    const unsubs = [
      websocketService.on('friend_started_game', refreshPresence),
      websocketService.on('friend_left_game', refreshPresence),
    ];
    const iv = window.setInterval(refreshPresence, 45000);
    return () => {
      unsubs.forEach((u) => u());
      window.clearInterval(iv);
    };
  }, [refreshPresence]);

  const presenceByGame = useMemo(() => {
    const map = new Map<string, GamePresenceUser[]>();
    for (const p of friendPresence) {
      const list = map.get(p.gameId) || [];
      list.push(p);
      map.set(p.gameId, list);
    }
    return map;
  }, [friendPresence]);

  const presenceGameId =
    currentView === 'purgaslicer'
      ? 'judgment'
      : currentView === 'integrated' && integratedSlot === 'rift'
        ? 'purga-rift'
        : currentView === 'integrated' && integratedSlot === 'slot2'
          ? 'puurga-slot-2'
          : null;
  const presenceTitle = presenceGameId
    ? getGameById(presenceGameId)?.title || presenceGameId
    : undefined;
  useGamePresence(presenceGameId, presenceTitle, Boolean(presenceGameId));

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
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 sm:left-4 z-[10001]"
      >
        <button
          type="button"
          onClick={handleBackToMenu}
          className="flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-md border border-white/10"
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
          <div className="flex min-h-[50vh] items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-muted" />
          </div>
        }
      >
        <Shell onExit={handleBackToMenu} />
      </Suspense>,
    );
  }

  return (
    <div className="w-full space-y-5 min-h-full pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.07] via-transparent to-red-500/[0.05] dark:from-orange-500/12 dark:to-red-500/8 pointer-events-none" />
        <div className="relative px-4 py-5 sm:px-5 sm:py-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 dark:shadow-orange-500/30 mb-3">
              <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
              Puurga{' '}
              <span className="bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
                {t('games.arena')}
              </span>
            </h1>
            <p className="text-muted text-xs sm:text-sm mt-1.5 max-w-[18rem] sm:max-w-none mx-auto leading-snug">
              {t('games.tapToPlay')}
            </p>
          </motion.div>

          <div className="mt-4 w-full text-left">
            <NewGamePromoBanner />
          </div>

          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 sm:mt-4 w-full rounded-xl border border-orange-500/25 dark:border-orange-500/30 bg-orange-500/[0.08] dark:bg-orange-500/10 px-3 py-2.5 flex items-center gap-2.5 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 dark:bg-orange-500/20">
                <Zap size={15} className="text-orange-600 dark:text-orange-400" />
              </span>
              <p className="text-xs text-foreground min-w-0 leading-snug">
                <span className="font-semibold truncate block sm:inline">
                  {String(lastResult.game ?? 'Arena')}
                </span>
                <span className="text-muted"> · {String(lastResult.score ?? 0)} pts</span>
              </p>
            </motion.div>
          )}

          {/* Stats — equal columns, aligned on all breakpoints */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
            {[
              {
                icon: Coins,
                color: 'text-orange-600 dark:text-orange-400',
                value: '2,450',
                label: t('games.credits'),
              },
              {
                icon: Trophy,
                color: 'text-amber-600 dark:text-yellow-400',
                value: '#127',
                label: t('games.rank'),
              },
              {
                icon: Flame,
                color: 'text-red-600 dark:text-red-400',
                value: '47',
                label: t('games.played'),
              },
            ].map(({ icon: Icon, color, value, label }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl bg-background/80 dark:bg-background/60 border border-border px-1.5 py-2.5 sm:px-3 sm:py-3 flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-orange-500/30 hover:bg-card-hover cursor-default"
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color} shrink-0`} />
                <p className="text-sm sm:text-base font-bold text-foreground tabular-nums leading-none mt-1">
                  {value}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wide leading-none truncate w-full text-center px-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games grid */}
      <section className="w-full space-y-5">
        <div id="challenge-panel">
          <ChallengePanel
            initialOpponentId={challengeFocus?.opponentId}
            initialGameId={challengeFocus?.gameId}
            onConsumedFocus={() => setChallengeFocus(null)}
          />
        </div>
        <MatchmakingPanel />

        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-3 sm:mb-4 flex items-center gap-2"
          >
            <Crown className="w-4 h-4 text-orange-600 dark:text-orange-500 shrink-0" />
            <h2 className="text-sm font-semibold text-foreground leading-none">
              {t('games.allGames')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-4 md:grid-cols-5 lg:grid-cols-6 justify-items-stretch">
            {mainGames.map((game, index) => {
              const playing = presenceByGame.get(game.id) || [];
              return (
                <GameIconTile
                  key={game.id}
                  game={game}
                  index={index}
                  onClick={() => handleGameSelect(game)}
                  friendsPlayingCount={playing.length}
                  friendsPlayingNames={playing.map((p) => p.name)}
                  onChallengeClick={
                    playing.length
                      ? () => {
                          setChallengeFocus({
                            opponentId: playing[0].id,
                            gameId: game.id,
                          });
                          document
                            .getElementById('challenge-panel')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PurgaGames;
