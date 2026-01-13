import React, { useState } from 'react';
import { Gamepad2, Trophy, Star, Clock, ArrowLeft, Zap, Puzzle, Target } from 'lucide-react';
import PurgaSlicer from '../../components/Games/PurgaSlicer';

type GameType = 'menu' | 'purgaslicer' | 'purgapuzzle' | 'purgashooter';

const PurgaGames: React.FC = () => {
  const [currentView, setCurrentView] = useState<GameType>('menu');

  const games = [
    {
      id: 'purgaslicer',
      name: 'Sword of Judgment',
      description: 'Wield divine precision to cleanse corruption with righteous strikes',
      icon: Zap,
      gradient: 'from-orange-600 to-red-600',
      available: true
    },
    {
      id: 'redemptionpuzzle',
      name: 'Wisdom Scrolls',
      description: 'Decipher ancient mysteries and unlock divine knowledge through wisdom',
      icon: Puzzle,
      gradient: 'from-gray-700 to-gray-900',
      available: false
    },
    {
      id: 'persianconquest',
      name: 'Kingdom Wars',
      description: 'Lead righteous armies in the eternal battle between light and darkness',
      icon: Target,
      gradient: 'from-gray-700 to-black',
      available: false
    }
  ];

  const handleGameSelect = (gameId: string) => {
    if (gameId === 'purgaslicer') {
      setCurrentView('purgaslicer');
    }
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  if (currentView === 'purgaslicer') {
    return (
      <div className="min-h-screen bg-black">
        {/* Back Button */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
          <button
            onClick={handleBackToMenu}
            className="flex items-center gap-1 sm:gap-2 bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Back to Games</span>
            <span className="xs:hidden">Back</span>
          </button>
        </div>
        
        {/* Game Container */}
        <div className="w-full h-screen">
          <PurgaSlicer className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Judgment Hall</h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto px-4">
            Enter the trials of wisdom and prove your righteousness through divine challenges.
          </p>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-orange-500/20">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-2 sm:mb-3" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">High Score</h3>
            <p className="text-xl sm:text-2xl font-bold text-orange-400">0</p>
          </div>
          
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-orange-500/20">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-2 sm:mb-3" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">Games Played</h3>
            <p className="text-xl sm:text-2xl font-bold text-orange-400">0</p>
          </div>
          
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-orange-500/20">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-2 sm:mb-3" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">Total Time</h3>
            <p className="text-xl sm:text-2xl font-bold text-orange-400">0m</p>
          </div>
        </div>

        {/* Games Selection */}
        <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-orange-500/20">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Select a Game</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className={`relative group cursor-pointer transition-all duration-300 ${
                  game.available 
                    ? 'hover:scale-105 hover:shadow-2xl' 
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => game.available && handleGameSelect(game.id)}
              >
                <div className="bg-black rounded-xl overflow-hidden border border-gray-700 hover:border-orange-500/50 transition-colors">
                  {/* Game Preview */}
                  <div className={`h-32 sm:h-40 lg:h-48 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative`}>
                    <game.icon className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white" />
                    {!game.available && (
                      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                        <span className="text-white font-bold text-sm sm:text-base lg:text-lg">Coming Soon</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Game Info */}
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{game.name}</h3>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 sm:mb-4 line-clamp-2">{game.description}</p>
                    
                    {game.available ? (
                      <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-semibold transition-colors">
                        Play Now
                      </button>
                    ) : (
                      <button disabled className="w-full bg-gray-700 text-gray-400 py-2 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-semibold cursor-not-allowed">
                        Coming Soon
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurgaGames;
