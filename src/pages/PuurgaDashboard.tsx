import React, { useState, useEffect } from 'react';
import { Shield, Award, Trophy, RefreshCw, Gift, CheckCircle, XCircle, User as UserIcon, Zap, Users, Heart } from 'lucide-react';
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

interface FeedEvent {
  id: number | string;
  user: string;
  action: string;
  detail: string;
  time: string;
}

interface LeaderboardUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  credits?: number;
}

const DEFAULT_IMAGES = {
  avatar: 'https://via.placeholder.com/150'
};

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
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  
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
  const [friendsStats, setFriendsStats] = useState<Array<{
    id: string;
    username: string;
    name: string;
    avatar: string;
    credits: number;
    purgeStreak: number;
    rank: string;
    isPublic: boolean;
  }>>([]);

  const [gameStats, setGameStats] = useState<{
    gamesPlayed: number;
    totalScore: number;
    highScore: number;
    averageScore: number;
    recentGames: Array<{
      id: string;
      gameType: string;
      score: number;
      playedAt: string;
    }>;
  }>({
    gamesPlayed: 0,
    totalScore: 0,
    highScore: 0,
    averageScore: 0,
    recentGames: []
  });

  const [purgingActivity, setPurgingActivity] = useState<Array<{
    id: string;
    userId: string;
    username: string;
    name: string;
    avatar: string;
    action: 'purged' | 'redeemed';
    timestamp: string;
    creditsNeeded?: number;
    isFriend: boolean;
  }>>([]);

  const [redemptionNeeded, setRedemptionNeeded] = useState<Array<{
    id: string;
    userId: string;
    username: string;
    name: string;
    avatar: string;
    creditsNeeded: number;
    daysPurged: number;
  }>>([]);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const [creditsRes, purgesRes, leaderboardRes, postsRes, friendsRes, purgingRes, gameStatsRes, redemptionRes] = await Promise.all([
        api.get('/credits'),
        api.get('/posts/purges/my-activity'),
        api.get('/games/leaderboard'),
        api.get('/posts/feed?limit=20'), // Get recent activity
        api.get('/friends/stats'), // Get friends' public stats
        api.get('/purging/activity'), // Get purging activity
        api.get('/games/stats'), // Get user's game statistics
        api.get('/purging/redemption-needed') // Get friends who need redemption
      ]);

      const creditData: CreditData = creditsRes.data;
      const purgeData: PurgeStats = purgesRes.data;

      // Update Leaderboard
      if (Array.isArray(leaderboardRes.data)) {
        setLeaderboard(leaderboardRes.data);
      }

      // Update Friends Stats
      if (Array.isArray(friendsRes.data)) {
        const processedFriends = friendsRes.data.map((friend: any) => ({
          id: friend.id,
          username: friend.username,
          name: friend.full_name || friend.username,
          avatar: friend.avatar_url || DEFAULT_IMAGES.avatar,
          credits: friend.credits || 0,
          purgeStreak: friend.purge_streak || 0,
          rank: friend.credits >= 500 ? 'Elite Survivor' : friend.credits >= 200 ? 'Veteran' : friend.credits >= 50 ? 'Survivor' : 'Novice',
          isPublic: friend.stats_public !== false // Default to public if not specified
        })).filter((friend: any) => friend.isPublic);
        setFriendsStats(processedFriends);
      }
      
      if (Array.isArray(purgingRes.data)) {
        const processedActivity = purgingRes.data.map((activity: any) => ({
          id: activity.id,
          userId: activity.userId,
          username: activity.username,
          name: activity.name || activity.username,
          avatar: activity.avatar || DEFAULT_IMAGES.avatar,
          action: activity.action,
          timestamp: activity.timestamp,
          creditsNeeded: activity.creditsNeeded,
          isFriend: activity.isFriend || false
        }));
        setPurgingActivity(processedActivity);
      }

      // Update Game Stats
      if (gameStatsRes?.data) {
        setGameStats(gameStatsRes.data);
      }

      // Update Redemption Needed
      if (redemptionRes?.data) {
        setRedemptionNeeded(redemptionRes.data);
      }

      // Generate Feed from Posts
      const postFeed = postsRes.data.map((post: any) => {
        let action = 'posted';
        let detail = post.content?.substring(0, 30) + '...';

        if (post.type === 'purge') {
          action = 'purged a user';
          detail = 'Process complete';
        } else if (post.media_url) {
          action = 'shared media';
        }

        return {
          id: post.id,
          user: post.author?.username || 'Unknown',
          action,
          detail,
          time: new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });
      setFeed(prev => [...prev, ...postFeed]); // Append to any local actions

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
            <span className="text-4xl font-bold text-accent">{Math.round(displayCredits)}</span>
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

        {/* Game Stats */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Game Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-accent">{gameStats.gamesPlayed}</p>
              <p className="text-xs text-muted">Games Played</p>
            </div>
            <div className="text-center">
              <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-500">{gameStats.highScore.toLocaleString()}</p>
              <p className="text-xs text-muted">High Score</p>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-500">{gameStats.totalScore.toLocaleString()}</p>
              <p className="text-xs text-muted">Total Score</p>
            </div>
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-500">{gameStats.averageScore.toFixed(1)}</p>
              <p className="text-xs text-muted">Avg Score</p>
            </div>
          </div>

          {/* Recent Games */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Recent Games</h3>
            {gameStats.recentGames.length === 0 ? (
              <div className="text-center text-muted py-4 bg-background-secondary rounded-lg">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent games</p>
                <p className="text-sm">Play some games to see your stats!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gameStats.recentGames.map((game) => (
                  <div key={game.id} className="flex items-center justify-between bg-background-secondary rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">{game.gameType}</p>
                        <p className="text-xs text-muted">
                          {new Date(game.playedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-accent font-bold">{game.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Friends' Perga Stats */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Friends' Perga Stats</h2>
          {friendsStats.length === 0 ? (
            <div className="text-center text-muted py-8 bg-background-secondary rounded-lg">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No friends with public stats yet</p>
              <p className="text-sm text-muted mt-1">Connect with friends to see their Perga progress!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friendsStats.map((friend) => (
                <div key={friend.id} className="bg-background-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-semibold truncate">{friend.name}</p>
                      <p className="text-muted text-sm">@{friend.username}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-sm">Credits</span>
                      <span className="text-accent font-bold">{friend.credits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-sm">Purge Streak</span>
                      <span className="text-orange-500 font-bold">{friend.purgeStreak}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-sm">Rank</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        friend.rank === 'Elite Survivor' ? 'bg-purple-500/20 text-purple-400' :
                        friend.rank === 'Veteran' ? 'bg-blue-500/20 text-blue-400' :
                        friend.rank === 'Survivor' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {friend.rank}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {/* Redemption Needed */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Friends Needing Redemption</h2>
          {redemptionNeeded.length === 0 ? (
            <div className="text-center text-muted py-8 bg-background-secondary rounded-lg">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>All friends are safe!</p>
              <p className="text-sm text-muted mt-1">No friends currently need redemption</p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptionNeeded.map((friend) => (
                <div key={friend.id} className="flex items-center gap-4 bg-background-secondary rounded-lg p-4 border border-red-500/20">
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-12 h-12 rounded-full border-2 border-red-500/30"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold truncate">{friend.name}</p>
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        Purged
                      </span>
                    </div>
                    <p className="text-sm text-muted">Purged {friend.daysPurged} days ago</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-500">{friend.creditsNeeded.toLocaleString()}</div>
                    <div className="text-xs text-muted">Credits needed</div>
                    <button className="mt-2 px-3 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors">
                      Redeem Friend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purging Activity */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Purging Activity</h2>
          {purgingActivity.length === 0 ? (
            <div className="text-center text-muted py-8 bg-background-secondary rounded-lg">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent purging activity</p>
              <p className="text-sm text-muted mt-1">Purging events will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {purgingActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 bg-background-secondary rounded-lg p-3">
                  <img
                    src={activity.avatar}
                    alt={activity.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold truncate">{activity.name}</p>
                      {activity.isFriend && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          Friend
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        activity.action === 'purged'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {activity.action === 'purged' ? 'Purged' : 'Redeemed'}
                      </span>
                      {activity.creditsNeeded && activity.action === 'purged' && (
                        <span className="text-xs text-muted">
                          {activity.creditsNeeded} credits needed for redemption
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Activity Feed</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {feed.map((event, i) => (
              <div key={event.id || i} className="flex items-center gap-3 bg-background rounded-lg p-3">
                <UserIcon className="text-accent" size={20} />
                <div className="flex-1">
                  <span className="text-foreground font-semibold">{event.user}</span> <span className="text-muted">{event.action}</span> <span className="text-accent text-sm block">{event.detail}</span>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">{event.time}</span>
              </div>
            ))}
            {feed.length === 0 && <div className="text-muted text-center py-4">No recent activity</div>}
          </div>
        </div>

        {/* Enhanced Leaderboard */}
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Enhanced Leaderboard</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {leaderboard.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">Loading leaderboard stats...</div>
            ) : (
              leaderboard.map((user, idx) => {
                const rankChange = idx === 0 ? 0 : Math.floor(Math.random() * 3) - 1; // Mock rank change
                return (
                  <div key={user.id} className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] ${
                    idx === 0 ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30' :
                    idx === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border border-gray-400/30' :
                    idx === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border border-orange-600/30' :
                    'bg-background-secondary border border-border hover:border-accent/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        idx === 0 ? 'bg-orange-500 text-white' :
                        idx === 1 ? 'bg-gray-400 text-white' :
                        idx === 2 ? 'bg-orange-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {rankChange !== 0 && (
                          <div className={`flex items-center text-xs ${rankChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {rankChange > 0 ? '↑' : '↓'} {Math.abs(rankChange)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar_url || DEFAULT_IMAGES.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full border-2 border-background"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground font-semibold truncate">{user.username || user.full_name || 'Survivor'}</p>
                          <div className="flex items-center gap-4 text-xs text-muted">
                            <span>Credits: {user.credits?.toLocaleString() || 0}</span>
                            <span>Purge Streak: {Math.floor(Math.random() * 10)}</span>
                            <span>Games: {Math.floor(Math.random() * 20) + 5}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">{user.credits?.toLocaleString() || 0}</div>
                      <div className="text-xs text-muted">Total Points</div>
                    </div>

                    {idx < 3 && (
                      <div className="ml-2">
                        <Trophy className={`w-6 h-6 ${idx === 0 ? 'text-orange-500 animate-bounce' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuurgaDashboard;