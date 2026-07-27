import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gamepad2, Play, Trophy, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGameStats, getCurrentlyPlaying, subscribeToPlayingUsers, GameStats, PlayingUser } from '../../services/purgaService';
import { useUser } from '../../context/UserContext';
import { GAMES_CATALOG, getTranslatedGameName } from '../../games/catalog';

const GAME_ICONS: Record<string, string> = {
  judgment: '⚖️',
  watchman: '🛡️',
  redemption: '✨',
  'purga-rift': '🌀',
  'cyber-runner': '🏃',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Hard: 'text-red-400',
  Medium: 'text-yellow-400',
  Easy: 'text-green-400',
};

const GamingDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [playingUsers, setPlayingUsers] = useState<PlayingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, playing] = await Promise.all([
          getGameStats(),
          getCurrentlyPlaying()
        ]);
        setGameStats(stats);
        setPlayingUsers(playing);
      } catch (error) {
        console.error('Error fetching gaming data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubscribe = subscribeToPlayingUsers((users) => {
      setPlayingUsers(users);
    });

    return () => { unsubscribe(); };
  }, []);

  const availableGames = GAMES_CATALOG
    .filter(g => g.status === 'live')
    .map(g => ({
      id: g.id,
      title: getTranslatedGameName(g.id),
      icon: GAME_ICONS[g.id] || '🎮',
      description: g.description,
      difficulty: g.difficulty,
      rewardCoins: g.rewardCoins,
      target: g.route,
    }));

  const goTo = useCallback((index: number) => {
    const total = availableGames.length;
    setCurrentIndex(((index % total) + total) % total);
  }, [availableGames.length]);

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(next, 4000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, next]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50) next();
    else if (info.offset.x > 50) prev();
  };

  const getGameStat = (gameId: string): GameStats | undefined => {
    if (!Array.isArray(gameStats)) return undefined;
    return gameStats.find(stat => stat.gameId === gameId);
  };

  const getActivePlayers = (gameId: string): number => {
    if (!Array.isArray(playingUsers)) return 0;
    return playingUsers.filter(u => u.currentGame === gameId).length;
  };

  const totalPlaying = playingUsers.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mb-2 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 min-w-0 truncate">
          <Gamepad2 size={13} className="text-muted shrink-0" />
          <span className="truncate">{t('rightSidebar.gamingArena', 'Gaming Arena')}</span>
        </span>
        {totalPlaying > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium shrink-0">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {totalPlaying} live
          </span>
        )}
      </div>

      {/* Carousel */}
      <div
        ref={containerRef}
        className="relative overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={handleDragEnd}
          style={{ touchAction: 'pan-y' }}
        >
          {availableGames.map((game) => {
            const s = getGameStat(game.id);
            const ap = getActivePlayers(game.id);

            return (
              <div
                key={game.id}
                className="w-full flex-shrink-0"
                onClick={() => navigate(game.target)}
              >
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card hover:bg-card-hover transition-colors duration-150 cursor-pointer group/card">
                  <div className="p-2.5">
                    {/* Top row: icon + title + score */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-base shrink-0">
                        {game.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[12px] font-semibold text-foreground group-hover/card:text-accent transition-colors truncate">
                            {game.title}
                          </span>
                          {s && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted shrink-0">
                              <Trophy size={9} />
                              {s.highScore.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium ${DIFFICULTY_COLOR[game.difficulty] || 'text-muted'}`}>
                            {game.difficulty}
                          </span>
                          {ap > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-500">
                              <span className="w-1 h-1 bg-green-500 rounded-full" />
                              {ap} live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[10.5px] text-muted leading-relaxed mt-2 line-clamp-1">
                      {game.description}
                    </p>

                    {/* Bottom row: reward + play */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-muted">
                        <Zap size={10} className="text-accent" />
                        +{game.rewardCoins} credits
                      </span>
                      <button className="flex items-center gap-1 px-2.5 py-1 bg-accent/10 hover:bg-accent/20 rounded-xl text-[11px] font-medium text-foreground transition-colors">
                        <Play size={10} />
                        Play
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Nav arrows — visible on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted hover:text-foreground transition-all opacity-0 group-hover:opacity-100 z-10"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted hover:text-foreground transition-all opacity-0 group-hover:opacity-100 z-10"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1 mt-2">
        {availableGames.map((game, i) => (
          <button
            key={game.id}
            onClick={() => goTo(i)}
            className={`transition-all rounded-full ${i === currentIndex ? 'w-4 h-1 bg-accent' : 'w-1 h-1 bg-border hover:bg-muted'
              }`}
          />
        ))}
      </div>

      {/* Credits + view all */}
      {user && (
        <div className="mt-2 flex items-center justify-between text-[10.5px] px-0.5">
          <span className="text-muted">
            Credits:{' '}
            <span className="text-foreground font-medium">
              {(user as any).credits?.toLocaleString() || 0}
            </span>
          </span>
          <button
            onClick={() => navigate('/puurga-games')}
            className="text-muted hover:text-accent transition-colors flex items-center gap-0.5"
          >
            View all <span className="text-sm">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GamingDashboard;