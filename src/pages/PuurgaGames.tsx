import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Gamepad2,
  Trophy,
  Coins,
  Star,
  Play,
  Clock,
  Crown,
  Flame,
  Calendar
} from 'lucide-react';

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
  link: string;
  upcoming?: boolean;
}

const PuurgaGames: React.FC = () => {
  const featuredGames: Game[] = [
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
      link: '/new-game'
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
      link: '/new-game'
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
      link: '/new-game'
    }
  ];

  const upcomingGames: Game[] = [
    {
      id: 'ghost-protocol',
      title: 'Ghost Protocol',
      description: 'Master the art of stealth. Evade detection, hack security systems, and vanish without a trace.',
      image: '/images/games/ghost-protocol.jpg',
      category: 'Stealth',
      difficulty: 'Hard',
      rewardCoins: 700,
      playTime: '20-25 min',
      players: 0,
      featured: false,
      link: '#',
      upcoming: true
    },
    {
      id: 'final-stand',
      title: 'Final Stand',
      description: 'Survive the onslaught. Fortify your position and outlast waves of relentless attackers.',
      image: '/images/games/final-stand.jpg',
      category: 'Survival',
      difficulty: 'Hard',
      rewardCoins: 650,
      playTime: '15-20 min',
      players: 0,
      featured: false,
      link: '#',
      upcoming: true
    }
  ];

  const allGames = [...featuredGames, ...upcomingGames];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a]">
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
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Puurga <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Arena</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
              Enter the arena, earn credits, and rise through the ranks. Your destiny awaits.
            </p>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 md:gap-6 mt-8 max-w-2xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 text-center">
              <Coins className="w-5 h-5 md:w-6 md:h-6 text-orange-400 mx-auto mb-1" />
              <p className="text-lg md:text-2xl font-bold text-white">2,450</p>
              <p className="text-[10px] md:text-xs text-gray-500">Credits Earned</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 text-center">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg md:text-2xl font-bold text-white">#127</p>
              <p className="text-[10px] md:text-xs text-gray-500">Global Rank</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 text-center">
              <Flame className="w-5 h-5 md:w-6 md:h-6 text-red-400 mx-auto mb-1" />
              <p className="text-lg md:text-2xl font-bold text-white">47</p>
              <p className="text-[10px] md:text-xs text-gray-500">Games Played</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Games Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Games - 3 Columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
            Featured Games
          </h2>
          <p className="text-gray-500 text-sm mt-1">Choose your arena and prove your worth</p>
        </motion.div>

        {/* Featured Games Grid - Mobile: horizontal scroll, Tablet: 2 cols, Desktop: 3 cols */}
        <div className="flex md:grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-visible pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x md:snap-none mb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="min-w-[280px] md:min-w-0 snap-start">
          {featuredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group"
            >
              <Link to={game.link} className="block">
                <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-white/10 hover:border-orange-500/50 transition-all duration-300 shadow-xl hover:shadow-orange-500/10">
                  {/* Game Image - Full picture visible with aspect ratio */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-900">
                    <img
                      src={game.image}
                      alt={game.title}
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Featured Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-2 py-1 rounded-full font-medium shadow-lg">
                        <Star className="w-3 h-3" />
                        <span>Featured</span>
                      </span>
                    </div>

                    {/* Difficulty Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${getDifficultyColor(game.difficulty)}`}>
                        {game.difficulty}
                      </span>
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 bg-orange-500 rounded-full shadow-xl shadow-orange-500/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                    </div>

                    {/* Game Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-base md:text-lg font-bold text-white mb-1">{game.title}</h3>
                      <p className="text-gray-300 text-xs line-clamp-2 mb-2">{game.description}</p>

                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{game.playTime}</span>
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-orange-400 font-medium">
                          <Coins className="w-3 h-3" />
                          {game.rewardCoins}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        </div>

        {/* All Games Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
            All Games
          </h2>
          <p className="text-gray-500 text-sm mt-1">Browse all available games</p>
        </motion.div>

        {/* All Games Grid - Mobile: 2 cols, Tablet: 3-4, Desktop: 5 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-12">
          {allGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="group"
            >
              {game.upcoming ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Soon
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-white/10">
                    <div className="w-full aspect-square overflow-hidden bg-gray-900">
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                        <Gamepad2 className="w-8 h-8 text-purple-400 opacity-50" />
                      </div>
                    </div>
                    <div className="p-2">
                      <h3 className="text-sm font-semibold text-white truncate">{game.title}</h3>
                      <p className="text-[10px] text-gray-500">{game.category}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to={game.link} className="block">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-white/10 hover:border-orange-500/50 transition-all duration-300">
                    <div className="w-full aspect-square overflow-hidden bg-gray-900">
                      <img
                        src={game.image}
                        alt={game.title}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="text-sm font-semibold text-white truncate">{game.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-gray-500">{game.category}</p>
                        <span className="flex items-center gap-0.5 text-orange-400 text-[10px] font-medium">
                          <Coins className="w-2.5 h-2.5" />
                          {game.rewardCoins}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Upcoming Games Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
            Upcoming Games
          </h2>
          <p className="text-gray-500 text-sm mt-1">Get ready for new challenges coming soon</p>
        </motion.div>

        {/* Upcoming Games Grid - Mobile: horizontal scroll, Desktop: 3 cols */}
        <div className="flex md:grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-visible pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x md:snap-none mb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="min-w-[280px] md:min-w-0 snap-start">
          {upcomingGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className="group"
            >
              <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-b from-purple-900/30 to-gray-900/80 border border-purple-500/30">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5" />
                
                {/* Game Image Placeholder */}
                <div className="relative w-full aspect-video overflow-hidden bg-gray-900">
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                    <Gamepad2 className="w-12 h-12 text-purple-400 opacity-50" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Coming Soon Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-medium shadow-lg">
                      <Calendar className="w-3 h-3" />
                      <span>Coming Soon</span>
                    </span>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${getDifficultyColor(game.difficulty)}`}>
                      {game.difficulty}
                    </span>
                  </div>

                  {/* Game Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-base md:text-lg font-bold text-white mb-1">{game.title}</h3>
                    <p className="text-gray-300 text-xs line-clamp-2 mb-2">{game.description}</p>

                    {/* Category */}
                    <div className="flex items-center gap-2 text-xs text-purple-400">
                      <span>{game.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        </div>

        {/* How to Play Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-white/10"
        >
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">How the Arena Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Choose Your Game</h3>
                <p className="text-gray-400 text-xs">Select from Judgment, Watchman, or Redemption</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Play & Win</h3>
                <p className="text-gray-400 text-xs">Complete challenges and earn credits</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Rise in Ranks</h3>
                <p className="text-gray-400 text-xs">Climb the leaderboard and unlock rewards</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PuurgaGames;
