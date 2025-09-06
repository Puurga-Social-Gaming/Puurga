import React, { useState } from 'react';
import { Shield, Award, Trophy, RefreshCw, Gift, CheckCircle, XCircle, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserStats {
  shieldPoints: number;
  riskLevel: number;
  groupId: string | null;
  dailyTasksCompleted: number;
  totalPoints: number;
  rank: string;
}

const MOCK_USER_STATS: UserStats = {
  shieldPoints: 450,
  riskLevel: 25,
  groupId: '1',
  dailyTasksCompleted: 3,
  totalPoints: 1500,
  rank: 'Survivor Elite'
};

const MOCK_CHALLENGES = [
  { id: 1, text: 'Complete 3 Group Tasks', points: 50 },
  { id: 2, text: 'Win a Puurga Battle', points: 100 },
  { id: 3, text: 'Survive a Purge Event', points: 200 },
  { id: 4, text: 'Invite a Friend', points: 30 },
  { id: 5, text: 'React to 5 Posts', points: 20 },
];

const MOCK_FEED = [
  { id: 1, user: 'Rita', action: 'completed a challenge', detail: 'Win a Puurga Battle', time: '2m ago' },
  { id: 2, user: 'Chris', action: 'joined a group', detail: 'Night Owls', time: '10m ago' },
  { id: 3, user: 'Alex', action: 'earned bonus points', detail: '+100', time: '20m ago' },
  { id: 4, user: 'Sam', action: 'leveled up', detail: 'Elite Survivor', time: '1h ago' },
];

const MOCK_LEADERBOARD = [
  { id: 1, name: 'Rita', points: 2200 },
  { id: 2, name: 'Chris', points: 2100 },
  { id: 3, name: 'Alex', points: 2000 },
  { id: 4, name: 'Sam', points: 1800 },
  { id: 5, name: 'Taylor', points: 1700 },
];

const BONUS_REWARDS = [
  { icon: <Gift className="text-orange-500 inline" />, label: '+50 Points', value: 50 },
  { icon: <Shield className="text-orange-500 inline" />, label: '+1 Shield', value: 1 },
  { icon: <Award className="text-orange-500 inline" />, label: 'Double Points (1h)', value: 0 },
  { icon: <Trophy className="text-orange-500 inline" />, label: 'Leaderboard Boost', value: 0 },
  { icon: <XCircle className="text-red-500 inline" />, label: 'No Bonus', value: 0 },
];

const PuurgaDashboard: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats>(MOCK_USER_STATS);
  const [challenges, setChallenges] = useState(
    MOCK_CHALLENGES.map(c => ({ ...c, completed: false }))
  );
  const [bonus, setBonus] = useState<{ label: string; icon: React.ReactNode } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [feed, setFeed] = useState(MOCK_FEED);

  // Animated points counter
  const [displayPoints, setDisplayPoints] = useState(userStats.totalPoints);
  React.useEffect(() => {
    if (displayPoints === userStats.totalPoints) return;
    const diff = userStats.totalPoints - displayPoints;
    if (diff === 0) return;
    const step = Math.sign(diff) * Math.max(1, Math.abs(diff) / 20);
    const timer = setTimeout(() => setDisplayPoints(p => p + step), 20);
    return () => clearTimeout(timer);
  }, [userStats.totalPoints, displayPoints]);

  // Challenge completion toggle
  const handleToggleChallenge = (id: number) => {
    setChallenges(prev => prev.map(c =>
      c.id === id ? { ...c, completed: !c.completed } : c
    ));
    const challenge = challenges.find(c => c.id === id);
    if (challenge && !challenge.completed) {
      setUserStats(s => ({ ...s, totalPoints: s.totalPoints + challenge.points }));
      setFeed(f => [
        { id: Date.now(), user: 'You', action: 'completed a challenge', detail: challenge.text, time: 'now' },
        ...f
      ]);
    }
  };

  // Spin the Wheel
  const handleSpin = () => {
    setSpinning(true);
    setBonus(null);
    setTimeout(() => {
      const reward = BONUS_REWARDS[Math.floor(Math.random() * BONUS_REWARDS.length)];
      setBonus(reward);
      setSpinning(false);
      if (reward.value > 0) {
        setUserStats(s => ({ ...s, totalPoints: s.totalPoints + reward.value }));
        setFeed(f => [
          { id: Date.now(), user: 'You', action: 'earned bonus', detail: reward.label, time: 'now' },
          ...f
        ]);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Animated Points & Rank */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-[#1a1a1a] rounded-xl p-6">
          <div>
            <h1 className="text-3xl font-bold text-orange-500 mb-1">Puurga Dashboard</h1>
            <p className="text-gray-400 text-lg">Current Rank: <span className="text-white font-semibold">{userStats.rank}</span></p>
            <div className="flex items-center gap-3 mt-2">
              <Shield className="text-orange-500" size={20} />
              <span className="text-white">{userStats.shieldPoints} Shield Points</span>
            </div>
          </div>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center">
            <span className="text-gray-400">Total Points</span>
            <span className="text-4xl font-bold text-orange-400">{Math.round(displayPoints)}</span>
          </motion.div>
        </div>

        {/* Progress Bars & Risk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Purge Risk Level</span>
              <span className={`text-sm ${userStats.riskLevel > 20 ? 'text-red-500' : 'text-green-500'}`}>{userStats.riskLevel}%</span>
            </div>
            <div className="w-full bg-[#2d2d2d] rounded-full h-2 mb-4">
              <motion.div
                className={`h-2 rounded-full ${userStats.riskLevel > 20 ? 'bg-red-500' : 'bg-green-500'}`}
                animate={{ width: `${userStats.riskLevel}%` }}
                transition={{ duration: 1 }}
                style={{ width: `${userStats.riskLevel}%` }}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Daily Tasks</span>
              <span className="text-white font-bold">{userStats.dailyTasksCompleted}/5</span>
            </div>
          </div>
          {/* Spin the Wheel */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-white mb-2">Spin the Wheel!</h2>
            <button
              className={`rounded-full bg-orange-500 hover:bg-orange-600 text-white p-6 shadow-lg transition-all duration-300 ${spinning ? 'animate-spin' : ''}`}
              onClick={handleSpin}
              disabled={spinning}
            >
              <RefreshCw size={32} />
            </button>
            <AnimatePresence>
              {bonus && !spinning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 text-center"
                >
                  <div className="text-2xl">{bonus.icon}</div>
                  <div className="text-orange-400 font-bold text-lg">{bonus.label}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Challenges */}
        <div className="bg-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Daily & Weekly Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map(challenge => (
              <button
                key={challenge.id}
                onClick={() => handleToggleChallenge(challenge.id)}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 border-2 ${challenge.completed ? 'bg-green-500/10 border-green-500' : 'bg-[#2d2d2d] border-[#333] hover:border-orange-500'}`}
              >
                <span className="text-white text-left">{challenge.text}</span>
                <span className="flex items-center gap-2">
                  <Award className="text-orange-500" size={20} />
                  <span className="text-orange-400 font-bold">+{challenge.points}</span>
                  {challenge.completed ? <CheckCircle className="text-green-500" /> : <XCircle className="text-gray-500" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed & Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Activity Feed</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {feed.map(event => (
                <div key={event.id} className="flex items-center gap-3 bg-[#222] rounded-lg p-3">
                  <UserIcon className="text-orange-500" size={20} />
                  <div className="flex-1">
                    <span className="text-white font-semibold">{event.user}</span> <span className="text-gray-400">{event.action}</span> <span className="text-orange-400">{event.detail}</span>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{event.time}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Leaderboard */}
          <div className="bg-[#1a1a1a] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Leaderboard</h2>
            <div className="space-y-2">
              {MOCK_LEADERBOARD.map((user, idx) => (
                <div key={user.id} className={`flex items-center gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-orange-500/20' : 'bg-[#222]'}`}>
                  <Trophy className={`text-orange-500 ${idx === 0 ? 'animate-bounce' : ''}`} size={20} />
                  <span className="text-white font-semibold">{user.name}</span>
                  <span className="ml-auto text-orange-400 font-bold">{user.points} pts</span>
                  {idx === 0 && <span className="ml-2 text-xs text-orange-400 font-bold">#1</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuurgaDashboard; 