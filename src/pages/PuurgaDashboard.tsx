import React, { useState, useEffect } from 'react';
import { Shield, Award, Trophy, RefreshCw, Gift, CheckCircle, XCircle, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';
import toast from 'react-hot-toast';

interface UserStats {
  credits: number;
  purgeStreak: number;
  totalPurgesGiven: number;
  totalPurgesReceived: number;
  riskLevel: number;
  rank: string;
}

interface CreditData {
  credits: number;
  purgeStreak: number;
}

interface PurgeStats {
  stats: {
    totalGiven: number;
    totalReceived: number;
  };
}

const MOCK_CHALLENGES = [
  { id: 1, text: 'Complete 3 Group Tasks', points: 50 },
  { id: 2, text: 'Win a Puurga Battle', points: 100 },
  { id: 3, text: 'Survive a Purge Event', points: 200 },
  { id: 4, text: 'Invite a Friend', points: 30 },
  { id: 5, text: 'React to 5 Posts', points: 20 },
];

const BONUS_REWARDS = [
  { icon: <Gift className="text-accent inline" />, label: '+50 Points', value: 50 },
  { icon: <Shield className="text-accent inline" />, label: '+1 Shield', value: 1 },
  { icon: <Award className="text-accent inline" />, label: 'Double Points (1h)', value: 0 },
  { icon: <Trophy className="text-accent inline" />, label: 'Leaderboard Boost', value: 0 },
  { icon: <XCircle className="text-red-500 inline" />, label: 'No Bonus', value: 0 },
];

const PuurgaDashboard: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats>({
    credits: 0,
    purgeStreak: 0,
    totalPurgesGiven: 0,
    totalPurgesReceived: 0,
    riskLevel: 0,
    rank: 'Novice'
  });
  const [challenges, setChallenges] = useState(
    MOCK_CHALLENGES.map(c => ({ ...c, completed: false }))
  );
  const [bonus, setBonus] = useState<{ label: string; icon: React.ReactNode } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [feed, setFeed] = useState<Array<{ id: number; user: string; action: string; detail: string; time: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const [creditsRes, purgesRes] = await Promise.all([
        api.get('/api/credits'),
        api.get('/api/posts/purges/my-activity')
      ]);

      const creditData: CreditData = creditsRes.data;
      const purgeData: PurgeStats = purgesRes.data;

      const riskLevel = Math.min((purgeData.stats.totalReceived / 5) * 100, 100);

      let rank = 'Novice';
      if (creditData.credits >= 500) rank = 'Elite Survivor';
      else if (creditData.credits >= 200) rank = 'Veteran';
      else if (creditData.credits >= 50) rank = 'Survivor';

      setUserStats({
        credits: creditData.credits,
        purgeStreak: creditData.purgeStreak,
        totalPurgesGiven: purgeData.stats.totalGiven,
        totalPurgesReceived: purgeData.stats.totalReceived,
        riskLevel: Math.round(riskLevel),
        rank
      });
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Animated credits counter
  const [displayCredits, setDisplayCredits] = useState(userStats.credits);
  React.useEffect(() => {
    if (displayCredits === userStats.credits) return;
    const diff = userStats.credits - displayCredits;
    if (diff === 0) return;
    const step = Math.sign(diff) * Math.max(1, Math.abs(diff) / 20);
    const timer = setTimeout(() => setDisplayCredits(p => p + step), 20);
    return () => clearTimeout(timer);
  }, [userStats.credits, displayCredits]);

  // Challenge completion toggle
  const handleToggleChallenge = (id: number) => {
    setChallenges(prev => prev.map(c =>
      c.id === id ? { ...c, completed: !c.completed } : c
    ));
    const challenge = challenges.find(c => c.id === id);
    if (challenge && !challenge.completed) {
      setUserStats(s => ({ ...s, credits: s.credits + challenge.points }));
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
        setUserStats(s => ({ ...s, credits: s.credits + reward.value }));
        setFeed(f => [
          { id: Date.now(), user: 'You', action: 'earned bonus', detail: reward.label, time: 'now' },
          ...f
        ]);
      }
    }, 1200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-accent">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Animated Points & Rank */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-card rounded-xl p-6">
          <div>
            <h1 className="text-3xl font-bold text-accent mb-1">Puurga Dashboard</h1>
            <p className="text-muted text-lg">Current Rank: <span className="text-foreground font-semibold">{userStats.rank}</span></p>
            <div className="flex items-center gap-3 mt-2">
              <Shield className="text-accent" size={20} />
              <span className="text-foreground">Shield Points: N/A</span>
            </div>
          </div>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center">
            <span className="text-muted">Total Points</span>
            <span className="text-4xl font-bold text-accent">0</span>
          </motion.div>
        </div>

        {/* Progress Bars & Risk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground font-medium">Purge Risk Level</span>
              <span className={`text-sm ${userStats.riskLevel > 20 ? 'text-red-500' : 'text-green-500'}`}>{userStats.riskLevel}%</span>
            </div>
            <div className="w-full bg-background-secondary rounded-full h-2 mb-4">
              <motion.div
                className={`h-2 rounded-full ${userStats.riskLevel > 20 ? 'bg-red-500' : 'bg-green-500'}`}
                animate={{ width: `${userStats.riskLevel}%` }}
                transition={{ duration: 1 }}
                style={{ width: `${userStats.riskLevel}%` }}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Daily Tasks</span>
              {/* <span className="text-white font-bold">{userStats.dailyTasksCompleted}/5</span> */}
              <span className="text-white font-bold">0/5</span>
            </div>
          </div>
          {/* Spin the Wheel */}
          <div className="bg-card rounded-xl p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-foreground mb-2">Spin the Wheel!</h2>
            <button
              className={`rounded-full bg-accent hover:bg-accent-hover text-white p-6 shadow-lg transition-all duration-300 ${spinning ? 'animate-spin' : ''}`}
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
                  <div className="text-accent font-bold text-lg">{bonus.label}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Challenges */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Daily & Weekly Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map(challenge => (
              <button
                key={challenge.id}
                onClick={() => handleToggleChallenge(challenge.id)}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 border-2 ${challenge.completed ? 'bg-green-500/10 border-green-500' : 'bg-background-secondary border-border hover:border-accent'}`}
              >
                <span className="text-foreground text-left">{challenge.text}</span>
                <span className="flex items-center gap-2">
                  <Award className="text-accent" size={20} />
                  <span className="text-accent font-bold">+{challenge.points}</span>
                  {challenge.completed ? <CheckCircle className="text-green-500" /> : <XCircle className="text-gray-500" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed & Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Activity Feed</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {feed.map(event => (
                <div key={event.id} className="flex items-center gap-3 bg-background rounded-lg p-3">
                  <UserIcon className="text-accent" size={20} />
                  <div className="flex-1">
                    <span className="text-foreground font-semibold">{event.user}</span> <span className="text-muted">{event.action}</span> <span className="text-accent">{event.detail}</span>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">{event.time}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Leaderboard */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Leaderboard</h2>
            <div className="space-y-2">
              {/* Leaderboard temporarily disabled to avoid build errors */}
              {/* {MOCK_LEADERBOARD.map((user, idx) => (
                <div key={user.id} className={`flex items-center gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-orange-500/20' : 'bg-[#222]'}`}>
                  <Trophy className={`text-orange-500 ${idx === 0 ? 'animate-bounce' : ''}`} size={20} />
                  <span className="text-white font-semibold">{user.name}</span>
                  <span className="ml-auto text-orange-400 font-bold">{user.points} pts</span>
                  {idx === 0 && <span className="ml-2 text-xs text-orange-400 font-bold">#1</span>}
                </div>
              ))} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuurgaDashboard;