import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Crown,
  Gamepad,
  Trophy,
  Coins,
  Flame,
} from 'lucide-react';
import HeroBanner from '../../components/Games/Arcade/HeroBanner';
import GameCard from '../../components/Games/Arcade/GameCard';
import SearchBar from '../../components/Games/Arcade/SearchBar';
import CategoryFilter from '../../components/Games/Arcade/CategoryFilter';
import NewGamePromoBanner from '../../components/Games/NewGamePromoBanner';
import { useGamePresence } from '../../shared/presence/useGamePresence';
import { getGamePresence, type GamePresenceUser } from '../../services/challengeService';
import { websocketService } from '../../services/websocketService';
import {
  GAMES_CATALOG,
  getTranslatedGameName,
  getTranslatedGameDescription,
  getCategories,
  type GameEntry,
} from '../../games/catalog';

const PurgaGames: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [friendPresence, setFriendPresence] = useState<GamePresenceUser[]>([]);

  const mainGames = useMemo(() => {
    return GAMES_CATALOG.filter(g => g.status === 'live').map(g => ({
      ...g,
      name: getTranslatedGameName(g.id),
      description: getTranslatedGameDescription(g.id),
    }));
  }, [t]);

  const categories = useMemo(() => getCategories(), []);

  // Filtered games
  const filteredGames = useMemo(() => {
    let games = mainGames;

    if (selectedCategory !== 'all') {
      games = games.filter(g => g.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      games = games.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    }

    return games;
  }, [mainGames, selectedCategory, search]);

  // Featured game — always promote Cyber Runner
  const featuredGame = useMemo(() => {
    return mainGames.find(g => g.id === 'cyber-runner') || mainGames[0] || null;
  }, [mainGames]);

  // Last played game
  const lastPlayedGame = useMemo(() => {
    if (!lastResult?.game) return null;
    return mainGames.find(g => g.name === String(lastResult.game)) || null;
  }, [mainGames, lastResult]);

  // Presence
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

  useGamePresence(null, undefined, false);

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

  const handlePlay = (game: GameEntry) => {
    localStorage.setItem(
      'perga_last_result',
      JSON.stringify({ game: game.name, score: 0, net: 0 }),
    );
    navigate(game.route);
  };

  return (
    <div className="w-full min-h-full pb-8">
      {/* Hero Banner — scrolls away */}
      <div className="space-y-5">
        <HeroBanner
          featuredGame={featuredGame}
          lastPlayedGame={lastPlayedGame}
          lastResult={lastResult}
          onPlay={handlePlay}
        />

        {/* Stats strip — scrolls away */}
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            {
              icon: Coins,
              color: 'text-orange-500 dark:text-orange-400',
              bg: 'bg-orange-500/10',
              value: '2,450',
              label: t('games.credits'),
            },
            {
              icon: Trophy,
              color: 'text-amber-500 dark:text-amber-400',
              bg: 'bg-amber-500/10',
              value: '#127',
              label: t('games.rank'),
            },
            {
              icon: Flame,
              color: 'text-red-500 dark:text-red-400',
              bg: 'bg-red-500/10',
              value: '47',
              label: t('games.played'),
            },
          ].map(({ icon: Icon, color, bg, value, label }) => (
            <div
              key={label}
              className={`rounded-xl ${bg} border border-border/30 px-3 py-3 flex flex-col items-center justify-center gap-1 transition-all duration-200 hover:border-orange-500/30`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-base font-bold text-foreground tabular-nums leading-none mt-0.5">
                {value}
              </p>
              <p className="text-[9px] text-muted uppercase tracking-wider leading-none">
                {label}
              </p>
            </div>
          ))}
        </section>

        {/* Promo banner — scrolls away */}
        <NewGamePromoBanner />
      </div>

      {/* Sticky bar: Search + Filter + All Games header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 -mx-0.5 px-0.5 pt-3 pb-3 space-y-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <SearchBar value={search} onChange={setSearch} />
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-orange-500" />
            {selectedCategory === 'all' ? t('games.allGames') : t(`games.category.${selectedCategory.toLowerCase()}`)}
          </h2>
          <span className="text-[11px] text-muted">
            {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}
          </span>
        </div>
      </div>

      {/* Game Grid — scrolls underneath the sticky bar */}
      <section className="pt-3">
        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Gamepad size={40} className="text-muted/30 mb-3" />
            <p className="text-sm text-muted">{t('games.noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredGames.map((game, index) => {
              const playing = presenceByGame.get(game.id) || [];
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  index={index}
                  onClick={() => handlePlay(game)}
                  friendsPlayingCount={playing.length}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PurgaGames;
