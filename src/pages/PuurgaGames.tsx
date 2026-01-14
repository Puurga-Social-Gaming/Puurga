import React, { useState } from 'react';
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
  Target,
  Puzzle,
  Sword,
  Brain
} from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'puzzle' | 'action' | 'strategy' | 'trivia';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rewardCoins: number;
  playTime: string;
  players: number;
  featured: boolean;
}

const PuurgaGames: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const games: Game[] = [
    {
      id: '1',
      title: 'Puurga Puzzle Master',
      description: 'Solve challenging puzzles to earn coins and climb the leaderboard.',
      icon: <Puzzle className="w-8 h-8" />,
      category: 'puzzle',
      difficulty: 'Medium',
      rewardCoins: 150,
      playTime: '5-10 min',
      players: 1247,
      featured: true
    },
    {
      id: '2',
      title: 'Coin Rush Arena',
      description: 'Fast-paced action game where speed and precision earn you rewards.',
      icon: <Zap className="w-8 h-8" />,
      category: 'action',
      difficulty: 'Hard',
      rewardCoins: 200,
      playTime: '3-5 min',
      players: 892,
      featured: true
    },
    {
      id: '3',
      title: 'Strategy Empire',
      description: 'Build your empire and compete with other players for dominance.',
      icon: <Sword className="w-8 h-8" />,
      category: 'strategy',
      difficulty: 'Hard',
      rewardCoins: 300,
      playTime: '15-20 min',
      players: 654,
      featured: false
    },
    {
      id: '4',
      title: 'Brain Teaser Quiz',
      description: 'Test your knowledge across various topics and earn coins.',
      icon: <Brain className="w-8 h-8" />,
      category: 'trivia',
      difficulty: 'Easy',
      rewardCoins: 100,
      playTime: '2-3 min',
      players: 1532,
      featured: false
    },
    {
      id: '5',
      title: 'Target Practice',
      description: 'Improve your aim and reflexes in this skill-based game.',
      icon: <Target className="w-8 h-8" />,
      category: 'action',
      difficulty: 'Medium',
      rewardCoins: 175,
      playTime: '4-6 min',
      players: 743,
      featured: false
    },
    {
      id: '6',
      title: 'Word Wizard',
      description: 'Create words and solve word puzzles to earn maximum rewards.',
      icon: <Star className="w-8 h-8" />,
      category: 'puzzle',
      difficulty: 'Easy',
      rewardCoins: 125,
      playTime: '5-8 min',
      players: 1089,
      featured: true
    }
  ];

  const categories = [
    { id: 'all', label: 'All Games', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'puzzle', label: 'Puzzle', icon: <Puzzle className="w-4 h-4" /> },
    { id: 'action', label: 'Action', icon: <Zap className="w-4 h-4" /> },
    { id: 'strategy', label: 'Strategy', icon: <Sword className="w-4 h-4" /> },
    { id: 'trivia', label: 'Trivia', icon: <Brain className="w-4 h-4" /> }
  ];

  const filteredGames = selectedCategory === 'all' 
    ? games 
    : games.filter(game => game.category === selectedCategory);

  const featuredGames = games.filter(game => game.featured);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-400/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'Hard': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3"
        >
          <Gamepad2 className="w-12 h-12 text-orange-500" />
          <h1 className="text-4xl font-bold text-white">Puurga Games</h1>
        </motion.div>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Play games, earn coins, and climb the leaderboard. Complete challenges and unlock rewards!
        </p>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Coins className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Coins Earned</p>
              <p className="text-2xl font-bold text-white">2,450</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Leaderboard Rank</p>
              <p className="text-2xl font-bold text-white">#127</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Play className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Games Played</p>
              <p className="text-2xl font-bold text-white">47</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Featured Games */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-orange-500" />
          Featured Games
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredGames.map((game) => (
            <motion.div
              key={game.id}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20 relative overflow-hidden"
            >
              <div className="absolute top-2 right-2">
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  FEATURED
                </span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/20 rounded-lg text-orange-500">
                  {game.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white">{game.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                    {game.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4">{game.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {game.playTime}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {game.players.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-orange-500 font-semibold">
                  <Coins className="w-4 h-4" />
                  {game.rewardCoins} coins
                </div>
                <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Play Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-white">All Games</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] border border-[var(--border)]'
              }`}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Games Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredGames.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            className="bg-[#1a1a1a] rounded-xl p-6 border border-[var(--border)] hover:border-orange-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gray-500/20 rounded-lg text-gray-300">
                {game.icon}
              </div>
              <div>
                <h3 className="font-bold text-white">{game.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                  {game.difficulty}
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-4">{game.description}</p>

            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {game.playTime}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {game.players.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-orange-500 font-semibold">
                <Coins className="w-4 h-4" />
                {game.rewardCoins} coins
              </div>
              <button className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
                <Play className="w-4 h-4" />
                Play
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
      </div>
    </div>
  );
};

export default PuurgaGames;
