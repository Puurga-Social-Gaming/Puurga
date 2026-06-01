import React, { useState, useEffect } from 'react';
import { Flame, User, Calendar, Loader2, AlertCircle, Heart, Shield, AlertTriangle, Zap, Coins, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import { useCredits } from '../../hooks/useCredits';
import { PURGE_THRESHOLD } from '../../constants/purgeConstants';
import toast from 'react-hot-toast';

interface PurgeActivity {
  id: string;
  postId: string;
  post: {
    id: string;
    content: string;
    created_at: string;
  } | null;
  targetUser?: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  actor?: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  createdAt: string;
  type: 'given' | 'received';
}

interface PurgeData {
  given: PurgeActivity[];
  received: PurgeActivity[];
  stats: {
    totalGiven: number;
    totalReceived: number;
  };
}

interface CreditData {
  purgeStreak: number;
}

type TabType = 'given' | 'received';

const PurgasTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('given');
  const [purgeData, setPurgeData] = useState<PurgeData | null>(null);
  const [creditData, setCreditData] = useState<CreditData>({ purgeStreak: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { balance, refreshCredits } = useCredits();
  const [redemptionNeeded, setRedemptionNeeded] = useState<any[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    fetchPurgeActivity();
    fetchCredits();
    fetchRedemptionNeeded();
    refreshCredits();
  }, [refreshCredits]);

  const fetchRedemptionNeeded = async () => {
    try {
      const response = await api.get('/purging/redemption-needed');
      setRedemptionNeeded(response.data);
    } catch (error) {
      console.error('Failed to fetch redemption needed:', error);
    }
  };

  const handleRedeemFriend = async (friendId: string, name: string) => {
    try {
      setRedeeming(friendId);
      const toastId = toast.loading(`Redeeming ${name}...`);
      const response = await api.post(`/redeem/${friendId}`);

      if (response.data.success) {
        toast.success(response.data.message || `Successfully redeemed ${name}`, { id: toastId });
        refreshCredits();
        fetchRedemptionNeeded();
        fetchPurgeActivity();
      }
    } catch (error: any) {
      console.error('Redemption error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to redeem friend';
      toast.error(errorMsg);
      // If it fails with "not in ghost mode", sync the list
      if (error.response?.status === 400 && errorMsg.includes('not in ghost mode')) {
        fetchRedemptionNeeded();
        fetchPurgeActivity();
      }
    } finally {
      setRedeeming(null);
    }
  };

  const fetchPurgeActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts/purges/my-activity');
      setPurgeData(response.data);
    } catch (error) {
      console.error('Failed to fetch purge activity, falling back to local storage stats:', error);

      // Calculate stats from LocalStorage Posts
      let givenCount = 0;
      let receivedCount = 0;

      try {
        const storedPosts = JSON.parse(localStorage.getItem('posts') || '[]');
        if (Array.isArray(storedPosts)) {
          // Purges Given: Posts where 'purged' is true (meaning I purged them)
          givenCount = storedPosts.filter((p: any) => p.purged === true).length;

          // Purges Received: My posts, sum of 'purges' count
          // We need to match current user ID
          if (user?.id) {
            receivedCount = storedPosts
              .filter((p: any) => p.userId === user.id || p.user?.id === user.id)
              .reduce((sum: number, p: any) => sum + (Number(p.purges) || Number(p.purge_count) || 0), 0);
          }
        }
      } catch (e) {
        console.error("Error calculating local purge stats", e);
      }

      setPurgeData({
        given: [],
        received: [],
        stats: {
          totalGiven: givenCount,
          totalReceived: receivedCount
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await api.get('/credits');
      setCreditData(response.data);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!purgeData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-400">Failed to load purge activity</p>
      </div>
    );
  }

  const currentPurges = activeTab === 'given' ? purgeData.given : purgeData.received;

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-medium text-muted">Purges Given</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{purgeData.stats.totalGiven}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium text-muted">Purges Received</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{purgeData.stats.totalReceived}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 p-4 rounded-lg border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-medium text-accent">Credits</h3>
          </div>
          <p className="text-2xl font-bold text-accent">{balance}</p>
          <p className="text-xs text-accent/70 mt-1">Redeem ghosted users</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-medium text-muted">Purge Streak</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{creditData.purgeStreak}/5</p>
          <p className="text-xs text-muted mt-1">Next bonus: {5 - creditData.purgeStreak} purges</p>
        </div>
      </div>

      {/* Ghost Risk Analysis */}
      <div className="bg-card p-4 rounded-xl border border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Ghost Status Risk
          </h3>
          <span className="text-xs text-muted font-mono">Threshold: {PURGE_THRESHOLD} Purges</span>
        </div>

        {(() => {
          const received = purgeData.stats.totalReceived;
          const remaining = Math.max(0, PURGE_THRESHOLD - received);
          const percentage = Math.min(100, (received / PURGE_THRESHOLD) * 100);
          const isSafe = percentage < 50;
          const isCritical = percentage > 80;

          return (
            <div className="space-y-4">
              <div className="relative h-4 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isCritical ? 'bg-red-600' : isSafe ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-end text-sm">
                <div>
                  <p className="text-muted mb-1">Current Status:</p>
                  <p className={`font-bold ${isCritical ? 'text-red-500' : isSafe ? 'text-green-500' : 'text-yellow-500'}`}>
                    {isCritical ? 'CRITICAL RISK' : isSafe ? 'SAFE' : 'CAUTION'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted mb-1">Purges until Ghosted:</p>
                  <p className="font-bold text-foreground text-xl">{remaining}</p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Info size={12} /> Recommended Actions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link to="/new-game" className="flex items-center gap-2 p-2 rounded bg-card hover:bg-card-hover border border-border transition-colors text-xs text-foreground group">
                    <Shield className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span>Play Redemption to restore standing</span>
                  </Link>
                  <div className="flex items-center gap-2 p-2 rounded bg-card border border-border text-xs text-muted opacity-75">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span>Engage positively to earn mercy</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Ghosted Friends Section */}
      {redemptionNeeded.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-red-500 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5" />
            Friends Needing Redemption
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {redemptionNeeded.map((friend) => (
              <div key={friend.id} className="bg-card p-4 rounded-lg border border-red-500/30 flex items-center gap-4">
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  className="w-12 h-12 rounded-full border-2 border-red-500/30 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-bold truncate">{friend.name}</p>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Ghosted</span>
                  </div>
                  <p className="text-xs text-muted truncate">@{friend.username}</p>
                  <p className="text-[10px] text-muted mt-1">Ghosted {friend.daysPurged} days ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-500">{friend.creditsNeeded}</div>
                  <div className="text-[10px] text-muted mb-2">credits</div>
                  <button
                    onClick={() => handleRedeemFriend(friend.userId, friend.name)}
                    disabled={redeeming === friend.userId}
                    className="bg-accent hover:opacity-90 text-black text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm font-medium"
                  >
                    {redeeming === friend.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('given')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'given'
            ? 'text-accent border-b-2 border-accent'
            : 'text-muted hover:text-foreground'
            }`}
        >
          Purges You Gave ({purgeData.stats.totalGiven})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'received'
            ? 'text-red-500 border-b-2 border-red-500'
            : 'text-muted hover:text-foreground'
            }`}
        >
          Purges You Received ({purgeData.stats.totalReceived})
        </button>
      </div>

      {/* Purge List */}
      <div className="space-y-3">
        {currentPurges.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="w-12 h-12 mx-auto mb-4 text-muted" />
            <p className="text-muted">
              {activeTab === 'given'
                ? "You haven't purged any posts yet"
                : "You haven't received any purges yet"}
            </p>
          </div>
        ) : (
          currentPurges.map((purge) => {
            const profile = activeTab === 'given' ? purge.targetUser : purge.actor;

            return (
              <div
                key={purge.id}
                className="bg-card p-4 rounded-lg border border-border hover:border-border-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Profile Avatar */}
                  <div className="flex-shrink-0">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-card-secondary flex items-center justify-center">
                        <User className="w-6 h-6 text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {profile?.name || 'Unknown User'}
                      </span>
                      <span className="text-muted text-sm">
                        @{profile?.username || 'unknown'}
                      </span>
                      <span className="text-muted text-xs">•</span>
                      <div className="flex items-center gap-1 text-muted text-xs">
                        <Calendar className="w-3 h-3" />
                        {formatDate(purge.createdAt)}
                      </div>
                    </div>

                    {/* Action Description */}
                    <p className="text-sm text-muted mb-2">
                      {activeTab === 'given' ? (
                        <>
                          You purged <span className="text-orange-500">@{profile?.username}</span>'s post
                        </>
                      ) : (
                        <>
                          <span className="text-red-500">@{profile?.username}</span> purged your post
                        </>
                      )}
                    </p>

                    {/* Post Preview */}
                    {purge.post && (
                      <div className="bg-background/50 p-3 rounded border border-border mt-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {purge.post.content}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Purge Icon */}
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-full ${activeTab === 'given' ? 'bg-orange-500/20' : 'bg-red-500/20'
                      }`}>
                      <Flame className={`w-5 h-5 ${activeTab === 'given' ? 'text-orange-500' : 'text-red-500'
                        }`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PurgasTab;
