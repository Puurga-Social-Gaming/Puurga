import React, { useState, useEffect } from 'react';
import { Shield, Award, Trophy, RefreshCw, Gift, CheckCircle, XCircle, User as UserIcon, Zap, Users, Heart, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUser } from '../context/UserContext';
import { PURGE_THRESHOLD } from '../constants/purgeConstants';
import { DEFAULT_IMAGES } from '../constants/defaultImages';

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

const MOCK_CHALLENGES = [
  { id: 1, text: 'Complete 3 Group Tasks', points: 50 },
  { id: 2, text: 'Win a Puurga Battle', points: 100 },
  { id: 3, text: 'Survive a Purge Event', points: 200 },
  { id: 4, text: 'Invite a Friend', points: 30 },
  { id: 5, text: 'React to 5 Posts', points: 20 },
];

const RANK_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'Elite Survivor': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  'Veteran': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  'Survivor': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
  'Novice': { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' },
};

const SectionHeader: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  subtitle?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}> = ({ icon, title, subtitle, isCollapsed, onToggle }) => (
  <div 
    className={`flex items-center justify-between mb-5 group cursor-pointer select-none`}
    onClick={onToggle}
  >
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/15 text-accent shrink-0 group-hover:bg-accent/25 transition-colors">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {onToggle && (
      <div className="text-muted group-hover:text-accent transition-colors">
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
      </div>
    )}
  </div>
);

const StatPill: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'text-accent' }) => (
  <div className="flex flex-col items-center justify-center bg-background/60 rounded-xl px-4 py-3 min-w-[80px]">
    <span className={`text-xl font-bold ${color}`}>{value}</span>
    <span className="text-[11px] text-muted mt-0.5 whitespace-nowrap">{label}</span>
  </div>
);

const PuurgaDashboard: React.FC = () => {
  const { user } = useUser();

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
  const [bonus, _setBonus] = useState<{ label: string; icon: React.ReactNode } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'games': true, // Collapse games by default to save space
    'activity': true
  });
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [currentRedemptionInfo, setCurrentRedemptionInfo] = useState<any>(null);
  const [redemptionContributors, setRedemptionContributors] = useState<any[]>([]);

  useEffect(() => {
    const checkRedemption = async () => {
      if (currentRedemptionInfo && user?.id) {
        try {
          const res = await api.get(`/redeem/contributors/${user.id}`);
          setRedemptionContributors(res.data);
          setShowRedemptionModal(true);
        } catch (error) {
          console.error('Failed to fetch redemption contributors:', error);
          setShowRedemptionModal(true); // Still show modal even if contributors fail
        }
      }
    };
    checkRedemption();
  }, [currentRedemptionInfo, user?.id]);

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };
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

      // Use allSettled so one failing endpoint doesn't break the whole dashboard
      const [creditsRes, purgesRes, leaderboardRes, postsRes, friendsRes, purgingRes, gameStatsRes, redemptionRes] =
        await Promise.allSettled([
          api.get('/credits'),
          api.get('/posts/purges/my-activity'),
          api.get('/games/leaderboard'),
          api.get('/posts/feed?limit=20'),
          api.get('/friends/stats'),
          api.get('/purging/activity'),
          api.get('/games/stats'),
          api.get('/purging/redemption-needed')
        ]);

      // Helper to extract data safely
      const getData = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' ? result.value?.data : null;

      const creditData: CreditData = getData(creditsRes) || { credits: 0, purgeStreak: 0 };
      const purgeData: PurgeStats = getData(purgesRes) || { stats: { totalGiven: 0, totalReceived: 0 } };
      const leaderboardData = getData(leaderboardRes);
      const postsData = getData(postsRes);
      const friendsData = getData(friendsRes);
      const purgingData = getData(purgingRes);
      const gameStatsData = getData(gameStatsRes);
      const redemptionNeededData = getData(redemptionRes);

      if (Array.isArray(leaderboardData)) {
        setLeaderboard(leaderboardData);
      }

      if (Array.isArray(friendsData)) {
        const processedFriends = friendsData.map((friend: any) => ({
          id: friend.id,
          username: friend.username,
          name: friend.full_name || friend.username,
          avatar: friend.avatar_url || DEFAULT_IMAGES.avatar,
          credits: friend.credits || 0,
          purgeStreak: friend.purge_streak || 0,
          rank: friend.credits >= 500 ? 'Elite Survivor' : friend.credits >= 200 ? 'Veteran' : friend.credits >= 50 ? 'Survivor' : 'Novice',
          isPublic: friend.stats_public !== false
        })).filter((friend: any) => friend.isPublic);
        setFriendsStats(processedFriends);
      }

      if (Array.isArray(purgingData)) {
        const processedActivity = purgingData.map((activity: any) => ({
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

        // Check for redemptions for the current user
        // We look for the most recent 'redeemed' action for the current user
        const newRedemption = purgingData.find((a: any) => 
          a.userId === user?.id && a.action === 'redeemed'
        );
        if (newRedemption) {
          // Only show if it matches the current user's profile state (e.g. they were just restored)
          setCurrentRedemptionInfo(newRedemption);
        }
      }

      if (gameStatsData) {
        setGameStats(gameStatsData);
      }

      if (Array.isArray(redemptionNeededData)) {
        setRedemptionNeeded(redemptionNeededData);
      }

      if (Array.isArray(postsData)) {
        const postFeed = postsData.map((post: any) => {
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
            user: post.author?.username || post.user?.username || 'Unknown',
            action,
            detail,
            time: new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
        setFeed(prev => [...prev, ...postFeed]);
      }

      const riskLevel = Math.min((purgeData.stats.totalReceived / PURGE_THRESHOLD) * 100, 100);

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
    }
  };

  const { isConnected: _isConnected } = useWebSocket({
    onCreditUpdate: (payload: { userId: string; credits: number; change?: number; source?: string }) => {
      console.log('Real-time credit update:', payload);
      setUserStats(prev => ({
        ...prev,
        credits: payload.credits
      }));
      if (payload.change && payload.change > 0) {
        toast.success(`+${payload.change} credits earned!`, {
          icon: '🪙',
          duration: 3000,
        });
      } else if (payload.change && payload.change < 0) {
        toast.error(`${payload.change} credits deducted`, {
          duration: 3000,
        });
      }
    },
    onProfileUpdate: (payload: { userId: string; isGhost: boolean; purgeCount?: number }) => {
      console.log('Real-time profile update:', payload);
      fetchUserStats();
    }
  });

  const handleRedeemFriend = async (friendId: string, friendName: string) => {
    try {
      const toastId = toast.loading(`Redeeming ${friendName}...`);
      const response = await api.post(`/redeem/${friendId}`);

      if (response.data.success) {
        toast.success(response.data.message || `Successfully redeemed ${friendName}`, { id: toastId });

        setUserStats(prev => ({
          ...prev,
          credits: response.data.remainingCredits
        }));

        setRedemptionNeeded(prev => prev.filter(f => f.userId !== friendId));

        setFeed(f => [
          { id: Date.now(), user: 'You', action: 'redeemed a friend', detail: friendName, time: 'now' },
          ...f
        ]);
      }
    } catch (error: any) {
      console.error('Redemption error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to redeem friend';
      toast.error(errorMsg);
      if (error.response?.status === 400 && errorMsg.includes('not in ghost mode')) {
        fetchUserStats();
      }
    }
  };

  const [displayCredits, setDisplayCredits] = useState(userStats.credits);
  React.useEffect(() => {
    if (displayCredits === userStats.credits) return;
    const diff = userStats.credits - displayCredits;
    if (diff === 0) return;
    const step = Math.sign(diff) * Math.max(1, Math.abs(diff) / 10);
    const timer = setTimeout(() => setDisplayCredits(p => {
      const next = p + step;
      if (Math.abs(userStats.credits - next) < Math.abs(step)) return userStats.credits;
      return next;
    }), 20);
    return () => clearTimeout(timer);
  }, [userStats.credits, displayCredits]);

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

  const handleSpin = () => {
    setSpinning(true);
  };

  return (
    <div className="min-h-screen bg-background">
        {/* ── Hero Header ── */}
        <div className="bg-card border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Title + Rank */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-accent" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Puurga Dashboard</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${RANK_CONFIG[userStats.rank].bg} ${RANK_CONFIG[userStats.rank].text} ${RANK_CONFIG[userStats.rank].border}`}>
                      {userStats.rank}
                    </span>
                    <span className="text-muted text-xs">Shield Points: N/A</span>
                  </div>
                </div>
              </div>

              {/* Right: Key Stats Row */}
              <div className="flex flex-wrap gap-2">
                <StatPill label="Total Points" value={Math.round(displayCredits)} />
                <StatPill label="Purge Streak" value={userStats.purgeStreak} color="text-orange-400" />
                <StatPill label="Purges Given" value={userStats.totalPurgesGiven} color="text-red-400" />
                <StatPill label="Purges Received" value={userStats.totalPurgesReceived} color="text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Row 1: Risk + Spin ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risk Level */}
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <SectionHeader 
              icon={<Zap size={18} />} 
              title="Risk & Progress" 
              subtitle="Your current threat level" 
              isCollapsed={collapsedSections['risk']}
              onToggle={() => toggleSection('risk')}
            />
            {!collapsedSections['risk'] && (
              <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted">Purge Risk Level</span>
                  <span className={`text-sm font-bold ${userStats.riskLevel > 20 ? 'text-red-400' : 'text-green-400'}`}>
                    {userStats.riskLevel}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className={`h-2.5 rounded-full ${userStats.riskLevel > 20 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
                    animate={{ width: `${userStats.riskLevel}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ width: `${userStats.riskLevel}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted">Daily Tasks</span>
                  <span className="text-sm font-bold text-foreground">0/5</span>
                </div>
                <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full bg-accent/40" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted">Challenges Completed</span>
                  <span className="text-sm font-bold text-foreground">{challenges.filter(c => c.completed).length}/{challenges.length}</span>
                </div>
                <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="h-2.5 rounded-full bg-gradient-to-r from-accent to-accent/60"
                    animate={{ width: `${(challenges.filter(c => c.completed).length / challenges.length) * 100}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ width: `${(challenges.filter(c => c.completed).length / challenges.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Spin the Wheel */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 flex flex-col items-center justify-center gap-4">
          <SectionHeader 
            icon={<Gift size={18} />} 
            title="Spin the Wheel!" 
            subtitle="Try your luck" 
            isCollapsed={collapsedSections['spin']}
            onToggle={() => toggleSection('spin')}
          />
          {!collapsedSections['spin'] && (
            <div className="flex flex-col items-center gap-4 w-full">
            <button
              className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/70 hover:from-accent/90 hover:to-accent/50 text-white shadow-lg shadow-accent/20 transition-all duration-300 flex items-center justify-center ${spinning ? 'animate-spin' : 'hover:scale-110 active:scale-95'}`}
              onClick={handleSpin}
              disabled={spinning}
            >
              <RefreshCw size={28} />
            </button>
            <AnimatePresence>
              {bonus && !spinning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-2"
                >
                  <div className="text-xl">{bonus.icon}</div>
                  <div className="text-accent font-bold text-base">{bonus.label}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Game Stats ── */}
      <div className="bg-card rounded-2xl p-5 border border-border/50">
        <SectionHeader 
          icon={<Trophy size={18} />} 
          title="Game Statistics" 
          subtitle="Your performance" 
          isCollapsed={collapsedSections['games']}
          onToggle={() => toggleSection('games')}
        />

        {!collapsedSections['games'] && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { icon: <Trophy className="w-5 h-5 text-accent" />, value: gameStats.gamesPlayed, label: 'Games Played', color: 'text-accent' },
                { icon: <Award className="w-5 h-5 text-yellow-500" />, value: gameStats.highScore.toLocaleString(), label: 'High Score', color: 'text-yellow-500' },
                { icon: <Zap className="w-5 h-5 text-blue-400" />, value: gameStats.totalScore.toLocaleString(), label: 'Total Score', color: 'text-blue-400' },
                { icon: <RefreshCw className="w-5 h-5 text-purple-400" />, value: gameStats.averageScore.toFixed(1), label: 'Avg Score', color: 'text-purple-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-background/60 rounded-xl p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
                    {stat.icon}
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Recent Games</h3>
              {gameStats.recentGames.length === 0 ? (
                <div className="text-center text-muted py-8 bg-background/40 rounded-xl border border-border/40">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No recent games</p>
                  <p className="text-sm mt-1 opacity-70">Play some games to see your stats!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gameStats.recentGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between bg-background/60 rounded-xl p-3 hover:bg-background/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/15 rounded-lg flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium text-sm">{game.gameType}</p>
                          <p className="text-xs text-muted">{new Date(game.playedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="text-accent font-bold text-sm">{game.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

        {/* ── Row 3: Friends Stats + Challenges ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Friends Stats */}
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <SectionHeader 
              icon={<Users size={18} />} 
              title="Friends' Perga Stats" 
              subtitle="Public stats" 
              isCollapsed={collapsedSections['friends']}
              onToggle={() => toggleSection('friends')}
            />
            {!collapsedSections['friends'] && (
              <>
                {friendsStats.length === 0 ? (
              <div className="text-center text-muted py-8 bg-background/40 rounded-xl border border-border/40">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No friends with public stats yet</p>
                <p className="text-sm mt-1 opacity-70">Connect with friends to see their progress!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {friendsStats.map((friend) => {
                  const cfg = RANK_CONFIG[friend.rank] || RANK_CONFIG['Novice'];
                  return (
                    <div key={friend.id} className="flex items-center gap-3 bg-background/60 rounded-xl p-3 hover:bg-background/80 transition-colors">
                      <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-semibold text-sm truncate">{friend.name}</p>
                        <p className="text-muted text-xs">@{friend.username}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-accent font-bold text-sm">{friend.credits.toLocaleString()}</p>
                          <p className="text-orange-400 text-xs">🔥 {friend.purgeStreak}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {friend.rank}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>

          {/* Challenges */}
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <SectionHeader 
              icon={<Award size={18} />} 
              title="Challenges" 
              subtitle="Daily & Weekly" 
              isCollapsed={collapsedSections['challenges']}
              onToggle={() => toggleSection('challenges')}
            />
            {!collapsedSections['challenges'] && (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {challenges.map(challenge => (
                <button
                  key={challenge.id}
                  onClick={() => handleToggleChallenge(challenge.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 border text-left group ${challenge.completed
                      ? 'bg-green-500/10 border-green-500/40 hover:bg-green-500/15'
                      : 'bg-background/60 border-border/50 hover:border-accent/40 hover:bg-background/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${challenge.completed ? 'bg-green-500/20' : 'bg-background'}`}>
                      {challenge.completed
                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                        : <XCircle className="w-4 h-4 text-muted" />
                      }
                    </div>
                    <span className={`text-sm font-medium ${challenge.completed ? 'text-muted line-through' : 'text-foreground'}`}>
                      {challenge.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Award className="text-accent w-4 h-4" />
                    <span className="text-accent font-bold text-sm">+{challenge.points}</span>
                  </div>
                </button>
              ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 4: Redemption Needed ── */}
        <div className="bg-card rounded-2xl p-5 border border-border/50">
          <SectionHeader 
            icon={<Heart size={18} />} 
            title="Redemption Needed" 
            subtitle="Help your purged friends" 
            isCollapsed={collapsedSections['redemption-needed']}
            onToggle={() => toggleSection('redemption-needed')}
          />
          {!collapsedSections['redemption-needed'] && (
            <>
              {redemptionNeeded.length === 0 ? (
            <div className="text-center text-muted py-8 bg-background/40 rounded-xl border border-border/40">
              <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">All friends are safe!</p>
              <p className="text-sm mt-1 opacity-70">No friends currently need redemption</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {redemptionNeeded.filter(f => f.userId).map((friend) => (
                <div key={friend.id} className="bg-background/60 rounded-xl p-4 border border-red-500/20 hover:border-red-500/40 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative shrink-0">
                      <img src={friend.avatar} alt={friend.name} className="w-11 h-11 rounded-full object-cover border-2 border-red-500/30" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-card flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">!</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-bold text-sm truncate">{friend.name}</p>
                      <p className="text-xs text-muted truncate">@{friend.username}</p>
                      <p className="text-xs text-red-400/70 mt-0.5">Purged {friend.daysPurged} days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-400 font-bold text-lg leading-none">{friend.creditsNeeded.toLocaleString()}</p>
                      <p className="text-xs text-muted">credits needed</p>
                    </div>
                    <button
                      onClick={() => handleRedeemFriend(friend.userId, friend.name)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-all duration-200 font-semibold hover:scale-105 active:scale-95"
                    >
                      <Heart className="w-3 h-3" />
                      Redeem
                    </button>
                  </div>
                </div>
              ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Row 5: Purging Activity + Activity Feed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Purging Activity */}
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <SectionHeader 
              icon={<Shield size={18} />} 
              title="Purging Activity" 
              subtitle="Recent events" 
              isCollapsed={collapsedSections['activity']}
              onToggle={() => toggleSection('activity')}
            />
            {!collapsedSections['activity'] && (
              <>
                {purgingActivity.length === 0 ? (
              <div className="text-center text-muted py-8 bg-background/40 rounded-xl border border-border/40">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No recent purging activity</p>
                <p className="text-sm mt-1 opacity-70">Purging events will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {purgingActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 bg-background/60 rounded-xl p-3 hover:bg-background/80 transition-colors">
                    <img src={activity.avatar} alt={activity.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-semibold text-sm truncate">{activity.name}</p>
                        {activity.isFriend && (
                          <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/30 shrink-0">Friend</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${activity.action === 'purged' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-green-500/15 text-green-400 border border-green-500/30'}`}>
                          {activity.action === 'purged' ? 'Purged' : 'Redeemed'}
                        </span>
                        {activity.creditsNeeded && activity.action === 'purged' && (
                          <span className="text-[10px] text-muted">{activity.creditsNeeded} credits to redeem</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap shrink-0">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

          {/* Activity Feed */}
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <SectionHeader 
              icon={<Zap size={18} />} 
              title="Activity Feed" 
              subtitle="Live updates" 
              isCollapsed={collapsedSections['feed']}
              onToggle={() => toggleSection('feed')}
            />
            {!collapsedSections['feed'] && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {feed.map((event, i) => (
                  <div key={event.id || i} className="flex items-start gap-3 bg-background/60 rounded-xl p-3 hover:bg-background/80 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="text-accent w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="text-foreground font-semibold">{event.user}</span>{' '}
                        <span className="text-muted">{event.action}</span>
                      </p>
                      <p className="text-accent text-xs mt-0.5 truncate">{event.detail}</p>
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap shrink-0 mt-0.5">{event.time}</span>
                  </div>
                ))}
                {feed.length === 0 && (
                  <div className="text-muted text-center py-8 text-sm bg-background/40 rounded-xl border border-border/40">
                    No recent activity
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 6: Leaderboard ── */}
        <div className="bg-card rounded-2xl p-5 border border-border/50">
          <SectionHeader 
            icon={<Trophy size={18} />} 
            title="Leaderboard" 
            subtitle="Top survivors" 
            isCollapsed={collapsedSections['leaderboard']}
            onToggle={() => toggleSection('leaderboard')}
          />
          {!collapsedSections['leaderboard'] && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {leaderboard.length === 0 ? (
                <div className="text-center text-muted py-8 bg-background/40 rounded-xl border border-border/40 text-sm">Loading leaderboard...</div>
              ) : (
                leaderboard.map((user, idx) => {
                  const rankChange = idx === 0 ? 0 : Math.floor(Math.random() * 3) - 1;
                  const isTop3 = idx < 3;
                  const medalColors = ['text-yellow-400', 'text-gray-400', 'text-orange-500'];
                  const medalBg = ['bg-yellow-500/10 border-yellow-500/30', 'bg-gray-400/10 border-gray-400/30', 'bg-orange-500/10 border-orange-500/30'];

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] border ${isTop3 ? medalBg[idx] : 'bg-background/60 border-border/40 hover:border-accent/30'
                        }`}
                    >
                      {/* Rank badge */}
                      <div className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg font-bold text-sm shrink-0 ${isTop3 ? `${medalBg[idx]} border ${medalColors[idx]}` : 'bg-background text-muted border border-border/50'
                        }`}>
                        <span className={isTop3 ? medalColors[idx] : 'text-muted'}>#{idx + 1}</span>
                      </div>

                      {/* Avatar */}
                      <img
                        src={user.avatar_url || DEFAULT_IMAGES.avatar}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover border-2 border-background shrink-0"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground font-semibold text-sm truncate">{user.username || user.full_name || 'Survivor'}</p>
                          {rankChange !== 0 && (
                            <span className={`text-[10px] font-bold shrink-0 ${rankChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {rankChange > 0 ? '↑' : '↓'}{Math.abs(rankChange)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted mt-0.5">
                          <span>Credits: {user.credits?.toLocaleString() || 0}</span>
                          <span>Streak: {Math.floor(Math.random() * 10)}</span>
                          <span>Games: {Math.floor(Math.random() * 20) + 5}</span>
                        </div>
                      </div>

                      {/* Score + Trophy */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className={`font-bold text-base ${isTop3 ? medalColors[idx] : 'text-accent'}`}>
                            {user.credits?.toLocaleString() || 0}
                          </p>
                          <p className="text-[10px] text-muted">pts</p>
                        </div>
                        {isTop3 && (
                          <Trophy className={`w-5 h-5 shrink-0 ${idx === 0 ? 'text-yellow-400 animate-bounce' : medalColors[idx]}`} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* Redemption Acknowledgment Modal */}
      <AnimatePresence>
        {showRedemptionModal && currentRedemptionInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Award size={32} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Welcome Back!</h2>
                  <p className="text-muted text-sm mt-2">You have been successfully redeemed from ghost mode.</p>
                </div>

                <div className="w-full bg-background/50 rounded-xl p-4 space-y-3 text-left">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Redemption Contributors</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {redemptionContributors.length > 0 ? (
                      redemptionContributors.map((contributor, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                              <Star size={12} className="text-accent" />
                            </div>
                            <span className="text-foreground font-medium">{contributor.name}</span>
                          </div>
                          <span className="text-accent font-bold">{contributor.contribution} {contributor.contribution === 1 ? 'Point' : 'Credits'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                            <Star size={12} className="text-accent" />
                          </div>
                          <span className="text-foreground font-medium">{currentRedemptionInfo.purgedBy?.name || 'Community Member'}</span>
                        </div>
                        <span className="text-accent font-bold">100 Credits</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted italic">
                  "A second chance is a gift. Use it wisely."
                </div>

                <button
                  onClick={() => setShowRedemptionModal(false)}
                  className="w-full py-3 bg-accent hover:opacity-90 text-black rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                  Confirm & Access Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PuurgaDashboard;