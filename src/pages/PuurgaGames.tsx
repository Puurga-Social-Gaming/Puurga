import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, 
  Coins, 
  Star, 
  Play, 
  Clock, 
  Users,
  Zap,
  Target,
  Puzzle,
  Sword,
  Brain,
  Search,
  Grid3X3,
  List,
  TrendingUp
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

type ViewType = 'grid' | 'list';

const PuurgaGames: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredGames = useMemo(() => {
    let result = games;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(game => game.category === selectedCategory);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game => 
        game.title.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [games, selectedCategory, searchQuery]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-400/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'Hard': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-10 h-10 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Puurga Games</h1>
            <p className="text-gray-400 text-sm">Play games, earn coins, climb the leaderboard</p>
          </div>
        </div>

        {/* Category Filter and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex bg-[#1a1a1a] rounded-xl p-1 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>

          {/* Search and View Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex bg-[#1a1a1a] rounded-lg p-1">
              <button
                onClick={() => setViewType('grid')}
                className={`p-2 rounded transition-colors ${viewType === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Grid view"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-2 rounded transition-colors ${viewType === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <AnimatePresence mode="wait">
          {viewType === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                >
                  <div 
                    className="h-28 bg-cover bg-center relative"
                    style={{ backgroundColor: '#2d2d2d' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {game.featured && (
                        <span className="flex items-center gap-1 text-xs bg-orange-500/80 text-white px-2 py-1 rounded-full">
                          <Star size={10} /> Featured
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                        {game.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 -mt-10 mb-3 relative">
                      <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-2 border-[#1a1a1a] text-orange-500">
                        {game.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-6">
                        <h3 className="text-white font-semibold truncate">{game.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Users size={10} /> {game.players.toLocaleString()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {game.playTime}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{game.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-orange-500 font-semibold text-sm">
                        <Coins className="w-4 h-4" />
                        {game.rewardCoins} coins
                      </div>
                    </div>

                    <button className="w-full py-2 bg-[#2d2d2d] text-white text-sm rounded-lg hover:bg-orange-500 transition-colors font-medium flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" />
                      Play Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-[#1a1a1a] rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#2d2d2d] text-orange-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {game.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{game.title}</h3>
                      {game.featured && <Star size={12} className="text-orange-500" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                        {game.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{game.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Users size={10} /> {game.players.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {game.playTime}</span>
                      <span className="flex items-center gap-1 text-orange-500"><Coins size={10} /> {game.rewardCoins}</span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[#2d2d2d] text-white text-sm rounded-lg hover:bg-orange-500 transition-colors font-medium flex items-center gap-2">
                    <Play size={14} />
                    Play
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trending Games */}
        {games.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="text-orange-500" size={20} />
              <h2 className="text-lg font-bold text-white">Trending Games</h2>
            </div>
            <div className="space-y-4">
              {games.filter(g => g.featured).slice(0, 3).map((game) => (
                <div key={game.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2d2d2d] flex items-center justify-center overflow-hidden text-orange-500">
                      {game.icon}
                    </div>
                    <div>
                      <p className="text-white font-medium">{game.title}</p>
                      <p className="text-sm text-gray-400">{game.players.toLocaleString()} players</p>
                    </div>
                  </div>
                  <button className="px-4 py-1 bg-[#2d2d2d] text-white rounded-full hover:bg-orange-500 transition-colors text-sm">
                    Play
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PuurgaGames;
