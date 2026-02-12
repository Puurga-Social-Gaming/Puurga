import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  Trophy,
  Coins,
  Star,
  Play,
  Clock,
  Users,
  Zap,
  Crown,
  Flame,
  ArrowLeft
} from 'lucide-react';
import PurgaSlicer from '../../components/Games/PurgaSlicer';

interface Game {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rewardCoins: number;
  playTime: string;
  players: number;
  featured: boolean;
  action: 'embed' | 'navigate';
  target?: string;
  viewDetails?: string;
}

const PurgaGames: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'menu' | 'purgaslicer'>('menu');
  const [lastResult, setLastResult] = useState<any>(null);

  React.useEffect(() => {
    const stored = localStorage.getItem('perga_last_result');
    if (stored) {
      try {
        setLastResult(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse last result');
      }
    }
  }, []);

  const mainGames: Game[] = [
    {
      id: 'judgment',
      title: 'Judgment',
      description: 'Decide the fate of souls. Your judgment must be swift and fair. Pass verdict on users based on their actions.',
      image: '/images/games/judgment.jpg',
      category: 'Strategy',
      difficulty: 'Hard',
      rewardCoins: 600,
      playTime: '15-20 min',
      players: 1500,
      featured: true,
      action: 'embed',
      viewDetails: 'purgaslicer'
    },
    {
      id: 'watchman',
      title: 'The Watchman',
      description: 'Defend the realm from incoming threats. Vigilance is key. Protect your tower from purge attacks.',
      image: '/images/games/watchman.jpg',
      category: 'Action',
      difficulty: 'Hard',
      rewardCoins: 500,
      playTime: '10-15 min',
      players: 1240,
      featured: true,
      action: 'navigate',
      target: '/next-game'
    },
    {
      id: 'redemption',
      title: 'Redemption',
      description: 'A moral scenario game. Make the right choices to restore your status and redeem ghosted users.',
      image: '/images/games/redemption.jpg',
      category: 'Strategy',
      difficulty: 'Medium',
      rewardCoins: 300,
      playTime: '5-10 min',
      players: 890,
      featured: true,
      action: 'navigate',
      target: '/new-game'
    }
  ];

  const handleGameSelect = (game: Game) => {
    if (game.action === 'embed' && game.viewDetails === 'purgaslicer') {
      setCurrentView('purgaslicer');
    } else if (game.action === 'navigate' && game.target) {
      navigate(game.target);
    }
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Render Embedded Game
  if (currentView === 'purgaslicer') {
    return (
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '-100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen bg-background relative"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 left-4 z-50"
        >
          <button
            onClick={handleBackToMenu}
            className="flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Back to Arena</span>
          </button>
        </motion.div>

        {/* Game Container */}
        <div className="w-full h-screen">
          <PurgaSlicer className="w-full h-full" />
        </div>
      </motion.div>
    );
  }

  // Render Arena Dashboard (Professional Landing)
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background-secondary to-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-purple-500/10" />
        <div className="absolute inset-0 bg-[url('/images/games/judgment.jpg')] bg-cover bg-center opacity-5" />

        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/25">
                <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              Puurga <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Arena</span>
            </h1>
            <p className="text-muted text-base md:text-lg max-w-2xl mx-auto">
              Enter the arena, earn credits, and rise through the ranks. Your destiny awaits.
            </p>

            {lastResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 mx-auto max-w-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-3 flex items-center justify-between backdrop-blur-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Zap size={16} className="text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-orange-300 uppercase font-bold">Latest Report</p>
                    <p className="text-sm font-semibold text-white">{lastResult.game}: {lastResult.score} pts</p>
                  </div>
                </div>
                <div className={`text-sm font-bold ${lastResult.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {lastResult.net >= 0 ? '+' : ''}{lastResult.net} Credits
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 md:gap-6 mt-8 max-w-2xl mx-auto"
          >
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border text-center">
              <Coins className="w-5 h-5 md:w-6 md:h-6 text-orange-400 mx-auto mb-1" />
              <p className="text-lg md:text-2xl font-bold text-foreground">2,450</p>
              <p className="text-[10px] md:text-xs text-muted">Credits Earned</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border text-center">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg md:text-2xl font-bold text-foreground">#127</p>
              <p className="text-[10px] md:text-xs text-muted">Global Rank</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border text-center">
              <Flame className="w-5 h-5 md:w-6 md:h-6 text-red-400 mx-auto mb-1" />
              <p className="text-lg md:text-2xl font-bold text-foreground">47</p>
              <p className="text-[10px] md:text-xs text-muted">Games Played</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Games Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
            Featured Games
          </h2>
          <p className="text-muted text-sm mt-1">Choose your arena and prove your worth</p>
        </motion.div>

        {/* Large Game Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {mainGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative cursor-pointer"
              onClick={() => handleGameSelect(game)}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-card to-background-secondary border border-border hover:border-orange-500/50 transition-all duration-300 shadow-xl hover:shadow-orange-500/10">
                {/* Game Image */}
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80" />

                  {/* Featured Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
                      <Star className="w-3 h-3" />
                      Featured
                    </span>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getDifficultyColor(game.difficulty)}`}>
                      {game.difficulty}
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="p-4 bg-orange-500 rounded-full shadow-xl shadow-orange-500/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>
                  </div>

                  {/* Game Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{game.title}</h3>
                    <p className="text-gray-300 text-xs md:text-sm line-clamp-2 mb-3">{game.description}</p>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {game.playTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {game.players.toLocaleString()}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        <Coins className="w-3 h-3" />
                        {game.rewardCoins}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Play Section - Mobile - Navigates instead of linking directly */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 md:hidden"
        >
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Play
          </h2>
          <div className="space-y-3">
            {mainGames.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className="flex items-center gap-4 p-3 rounded-xl bg-card/50 border border-border hover:border-orange-500/30 transition-all cursor-pointer"
              >
                <img
                  src={game.image}
                  alt={game.title}
                  className="w-16 h-16 rounded-lg object-cover shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{game.title}</h3>
                  <p className="text-xs text-muted">{game.category} • {game.difficulty}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-orange-400">
                    <Coins className="w-3 h-3" />
                    <span>{game.rewardCoins} credits</span>
                  </div>
                </div>
                <Play className="w-5 h-5 text-orange-500" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* How to Play Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-border"
        >
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">How the Arena Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Choose Your Game</h3>
                <p className="text-muted text-xs">Select from Judgment, Watchman, or Redemption</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Play & Win</h3>
                <p className="text-muted text-xs">Complete challenges and earn credits</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Rise in Ranks</h3>
                <p className="text-muted text-xs">Climb the leaderboard and unlock rewards</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PurgaGames;
