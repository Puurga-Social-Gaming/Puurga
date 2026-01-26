import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Trophy,
  Star,
  Clock,
  ArrowLeft,
  Zap,
  Puzzle,
  Target,
  Sparkles,
  Play,
  Users,
  TrendingUp,
  Crown,
  Shield,
  Eye
} from 'lucide-react';
import PurgaSlicer from '../../components/Games/PurgaSlicer';

type GameType = 'menu' | 'purgaslicer' | 'purgapuzzle' | 'purgashooter';

const PurgaGames: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<GameType>('menu');
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const games = [
    {
      id: 'purgaslicer',
      name: 'Sword of Judgment',
      description: 'Wield divine precision to cleanse corruption with righteous strikes',
      icon: Zap,
      color: 'orange',
      players: '1.2K',
      rating: 4.8,
      available: true
    },
    {
      id: 'redemption',
      name: 'Redemption',
      description: 'Path of Restoration: Make moral choices to redeem your soul.',
      icon: Shield,
      color: 'orange',
      players: '2.4K',
      rating: 4.9,
      available: true
    },
    {
      id: 'redemptionpuzzle',
      name: 'Wisdom Scrolls',
      description: 'Decipher ancient mysteries and unlock divine knowledge through wisdom',
      icon: Puzzle,
      color: 'purple',
      players: '856',
      rating: 4.5,
      available: false
    },
    {
      id: 'persianconquest',
      name: 'Kingdom Wars',
      description: 'Lead righteous armies in the eternal battle between light and darkness',
      icon: Target,
      color: 'blue',
      players: '2.1K',
      rating: 4.9,
      available: false
    },
    {
      id: 'watchman',
      name: 'Path of the Watchman',
      description: 'Navigate the chaos. Use your light to strike down corruption.',
      icon: Eye,
      color: 'blue',
      players: '150',
      rating: 5.0,
      available: true
    }
  ];

  const stats = [
    { icon: Trophy, label: 'High Score', value: '0', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Star, label: 'Games Played', value: '0', color: 'text-accent', bg: 'bg-accent/10' },
    { icon: Clock, label: 'Total Time', value: '0m', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const handleGameSelect = (gameId: string) => {
    if (gameId === 'purgaslicer') {
      setCurrentView('purgaslicer');
    } else if (gameId === 'redemption') {
      navigate('/new-game');
    } else if (gameId === 'nextgame' || gameId === 'watchman') {
      navigate('/next-game');
    }
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  };

  const glowVariants = {
    initial: { opacity: 0.5 },
    animate: {
      opacity: [0.5, 0.8, 0.5],
      scale: [1, 1.05, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  if (currentView === 'purgaslicer') {
    return (
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '-100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen bg-background"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10"
        >
          <button
            onClick={handleBackToMenu}
            className="flex items-center gap-2 bg-card hover:bg-card-hover text-foreground px-4 py-2 rounded-xl transition-all duration-300 border border-border hover:border-accent/50 shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Back to Games</span>
            <span className="sm:hidden font-medium">Back</span>
          </button>
        </motion.div>

        {/* Game Container */}
        <div className="w-full h-screen">
          <PurgaSlicer className="w-full h-full" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="min-h-screen bg-background relative overflow-hidden"
    >
      {/* Animated Background Orbs */}
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate="animate"
        className="absolute top-[-100px] right-[10%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-accent/20 to-transparent blur-[80px] pointer-events-none"
      />
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate="animate"
        style={{ animationDelay: '1.5s' }}
        className="absolute bottom-[-100px] left-[-50px] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-purple-500/15 to-transparent blur-[80px] pointer-events-none"
      />
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate="animate"
        style={{ animationDelay: '0.75s' }}
        className="absolute top-[40%] right-[-100px] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-blue-500/10 to-transparent blur-[60px] pointer-events-none"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto space-y-6 sm:space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              <Gamepad2 className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-orange-100 to-orange-300 bg-clip-text text-transparent">
              Puurga Games
            </h1>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" />
            </motion.div>
          </div>
          <p className="text-muted text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            Enter the trials of wisdom and prove your righteousness through divine challenges
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-3 gap-3 sm:gap-6"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -2 }}
              className="bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border hover:border-muted transition-all duration-300"
            >
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <motion.div
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${stat.bg}`}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </motion.div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-sm text-muted/80 uppercase tracking-wide">{stat.label}</p>
                  <motion.p
                    className="text-lg sm:text-2xl font-bold text-foreground mt-1"
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    {stat.value}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Game Banner */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 via-card to-red-500/10 border border-accent/30 p-4 sm:p-6"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <motion.div
              className="p-4 sm:p-6 bg-gradient-to-br from-accent to-red-600 rounded-xl sm:rounded-2xl shadow-lg shadow-orange-500/25"
              animate={{
                boxShadow: [
                  '0 10px 40px -10px rgba(249, 115, 22, 0.3)',
                  '0 10px 40px -10px rgba(249, 115, 22, 0.5)',
                  '0 10px 40px -10px rgba(249, 115, 22, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </motion.div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="px-2 py-1 bg-accent/20 text-orange-400 text-xs font-semibold rounded-full border border-orange-500/30">
                  FEATURED
                </span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                  LIVE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Sword of Judgment</h2>
              <p className="text-muted text-sm mb-3">The most played game this week! Join thousands of players.</p>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-muted">
                <span className="flex items-center gap-1"><Users size={14} /> 1.2K playing</span>
                <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" /> 4.8</span>
              </div>
            </div>
            <motion.button
              onClick={() => handleGameSelect('purgaslicer')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-accent to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all duration-300"
            >
              <Play className="w-5 h-5" fill="white" />
              Play Now
            </motion.button>
          </div>
        </motion.div>

        {/* Games Grid */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              All Games
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted">
              <TrendingUp size={16} className="text-green-500" />
              <span>3 games available</span>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            <AnimatePresence>
              {games.map((game) => (
                <motion.div
                  key={game.id}
                  variants={cardVariants}
                  whileHover={game.available ? "hover" : undefined}
                  onHoverStart={() => setHoveredGame(game.id)}
                  onHoverEnd={() => setHoveredGame(null)}
                  className={`relative group cursor-pointer ${!game.available && 'opacity-70'}`}
                  onClick={() => game.available && handleGameSelect(game.id)}
                >
                  <div className={`
                    bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden 
                    border transition-all duration-500
                    ${hoveredGame === game.id && game.available
                      ? 'border-accent/50 shadow-xl shadow-orange-500/10'
                      : 'border-border hover:border-gray-700'
                    }
                  `}>
                    {/* Game Icon Header */}
                    <div className={`
                      relative h-32 sm:h-40 flex items-center justify-center overflow-hidden
                      ${game.available
                        ? 'bg-gradient-to-br from-accent/20 via-card to-red-500/10'
                        : 'bg-gradient-to-br from-gray-700/20 via-card to-gray-800/20'
                      }
                    `}>
                      {/* Animated background glow */}
                      {game.available && hoveredGame === game.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute inset-0 bg-gradient-to-br from-accent/30 to-transparent"
                        />
                      )}

                      <motion.div
                        animate={hoveredGame === game.id && game.available ? {
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{ duration: 0.5 }}
                        className={`
                          p-4 sm:p-6 rounded-2xl z-10
                          ${game.available
                            ? 'bg-gradient-to-br from-accent to-red-600 shadow-lg shadow-orange-500/30'
                            : 'bg-gradient-to-br from-gray-600 to-gray-700'
                          }
                        `}
                      >
                        <game.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </motion.div>

                      {/* Coming Soon Overlay */}
                      {!game.available && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <motion.span
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="px-4 py-2 bg-gray-800/80 text-white font-bold rounded-full border border-gray-600"
                          >
                            Coming Soon
                          </motion.span>
                        </div>
                      )}
                    </div>

                    {/* Game Info */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-foreground">{game.name}</h3>
                        {game.available && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star size={14} fill="currentColor" />
                            <span className="text-sm font-medium">{game.rating}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-muted text-sm mb-4 line-clamp-2">{game.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-muted text-sm">
                          <Users size={14} />
                          <span>{game.players} players</span>
                        </div>

                        <motion.button
                          whileHover={game.available ? { scale: 1.05 } : {}}
                          whileTap={game.available ? { scale: 0.95 } : {}}
                          disabled={!game.available}
                          className={`
                            px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300
                            ${game.available
                              ? 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-orange-500/20'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          <Play size={14} fill={game.available ? 'white' : 'currentColor'} />
                          {game.available ? 'Play' : 'Soon'}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Bottom Spacing for Mobile Nav */}
        <div className="h-4 sm:h-8" />
      </motion.div>
    </motion.div>
  );
};

export default PurgaGames;
