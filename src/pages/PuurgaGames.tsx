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
  Brain,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  link?: string;
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
    },
    {
      id: 'redemption',
      title: 'Redemption',
      description: 'A moral scenario game. Make the right choices to restore your status.',
      icon: <Shield className="w-8 h-8" />,
      category: 'strategy',
      difficulty: 'Medium',
      rewardCoins: 150,
      playTime: '2 min',
      players: 342,
      featured: true,
      link: '/new-game'
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
      default: return 'text-muted bg-muted/10';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3"
          >
            <Gamepad2 className="w-12 h-12 text-accent" />
            <h1 className="text-4xl font-bold text-foreground">Puurga Games</h1>
          </motion.div>
          <p className="text-muted text-lg max-w-2xl mx-auto">
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
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Coins className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-muted text-sm">Total Coins Earned</p>
                <p className="text-2xl font-bold text-foreground">2,450</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-muted text-sm">Leaderboard Rank</p>
                <p className="text-2xl font-bold text-foreground">#127</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Play className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-muted text-sm">Games Played</p>
                <p className="text-2xl font-bold text-foreground">47</p>
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
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-accent" />
            Featured Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredGames.map((game) => (
              <motion.div
                key={game.id}
                whileHover={{ scale: 1.02 }}
                className="bg-accent/5 rounded-xl p-6 border border-accent/20 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <span className="bg-accent text-white text-xs px-2 py-1 rounded-full font-semibold">
                    FEATURED
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-accent/20 rounded-lg text-accent">
                    {game.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{game.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                      {game.difficulty}
                    </span>
                  </div>
                </div>

                <p className="text-muted text-sm mb-4">{game.description}</p>

                <div className="flex items-center justify-between text-sm text-muted mb-4">
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
                  <div className="flex items-center gap-1 text-accent font-semibold">
                    <Coins className="w-4 h-4" />
                    {game.rewardCoins} coins
                  </div>
                  <Link
                    to={game.link || '#'}
                    className={`bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${!game.link && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <Play className="w-4 h-4" />
                    Play Now
                  </Link>
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
          <h2 className="text-2xl font-bold text-foreground">All Games</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === category.id
                  ? 'bg-accent text-white'
                  : 'bg-card text-muted hover:bg-background-secondary border border-border'
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
              className="bg-card rounded-xl p-6 border border-border hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-muted/20 rounded-lg text-muted">
                  {game.icon}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{game.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                    {game.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-muted text-sm mb-4">{game.description}</p>

              <div className="flex items-center justify-between text-sm text-muted mb-4">
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
                <div className="flex items-center gap-1 text-accent font-semibold">
                  <Coins className="w-4 h-4" />
                  {game.rewardCoins} coins
                </div>
                <Link
                  to={game.link || '#'}
                  className={`bg-muted hover:bg-muted-light text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${!game.link && 'opacity-50 cursor-not-allowed'}`}
                >
                  <Play className="w-4 h-4" />
                  Play
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default PuurgaGames;
