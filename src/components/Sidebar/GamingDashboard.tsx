import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gamepad2, Play, Trophy, Zap } from 'lucide-react';
import { getGameStats, getCurrentlyPlaying, subscribeToPlayingUsers, GameStats, PlayingUser } from '../../services/purgaService';
import { useUser } from '../../context/UserContext';

const GAMES = [
  {
    id: 'judgment',
    title: 'Judgment',
    icon: '⚖️',
    description: 'Decide the fate of souls. Your judgment must be swift and fair.',
    difficulty: 'Hard',
    rewardCoins: 600
  },
  {
    id: 'watchman',
    title: 'Watchman',
    icon: '🛡️',
    description: 'Defend the realm from incoming threats. Vigilance is key.',
    difficulty: 'Hard',
    rewardCoins: 500
  },
  {
    id: 'redemption',
    title: 'Redemption',
    icon: '✨',
    description: 'Make the right choices to restore your status and redeem ghosted users.',
    difficulty: 'Medium',
    rewardCoins: 300
  }
];

const GamingDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [playingUsers, setPlayingUsers] = useState<PlayingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

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

    return () => {
      unsubscribe();
    };
  }, []);

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
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Gamepad2 size={16} className="text-muted" />
          {t('rightSidebar.gamingArena')}
        </h2>
        {totalPlaying > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted bg-accent/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {totalPlaying} playing
          </div>
        )}
      </div>

      <div className="space-y-2">
        {GAMES.map((game) => {
          const stats = getGameStat(game.id);
          const activePlayers = getActivePlayers(game.id);
          const isHovered = hoveredGame === game.id;

          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              className="relative overflow-hidden rounded-lg hover:bg-card-hover transition-all duration-200 cursor-pointer group"
              onClick={() => navigate('/puurga-games')}
            >
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-lg">
                      {game.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {game.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted uppercase tracking-wide">
                          {game.difficulty}
                        </span>
                        {activePlayers > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-green-500">
                            <span className="w-1 h-1 bg-green-500 rounded-full" />
                            {activePlayers} live
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {stats && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[10px] text-muted">
                        <Trophy size={10} />
                        <span>{stats.lastScore.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-muted/50 mt-0.5">
                        Best: {stats.highScore.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <p className="text-xs text-muted mb-2">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Zap size={12} />
                        <span>+{game.rewardCoins} credits</span>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-xs font-medium text-foreground transition-colors">
                        <Play size={12} />
                        Play Now
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {user && (
        <div className="mt-3 px-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted">
            <span>Your Credits:</span>
            <span className="text-foreground font-medium">{(user as any).credits?.toLocaleString() || 0}</span>
          </div>
          <button
            onClick={() => navigate('/puurga-games')}
            className="text-muted hover:text-foreground transition-colors flex items-center gap-1"
          >
            View All
            <span className="text-lg">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GamingDashboard;
