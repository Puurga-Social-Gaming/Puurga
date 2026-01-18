import React, { useState, useEffect } from 'react';
import { Flame, User, Calendar, Loader2, AlertCircle, Coins, Zap } from 'lucide-react';
import api from '../../lib/axios';
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
  credits: number;
  purgeStreak: number;
}

type TabType = 'given' | 'received';

const PurgasTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('given');
  const [purgeData, setPurgeData] = useState<PurgeData | null>(null);
  const [creditData, setCreditData] = useState<CreditData>({ credits: 0, purgeStreak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurgeActivity();
    fetchCredits();
  }, []);

  const fetchPurgeActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/posts/purges/my-activity');
      setPurgeData(response.data);
    } catch (error) {
      console.error('Failed to fetch purge activity:', error);
      toast.error('Failed to load purge activity');
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await api.get('/api/credits');
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
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-medium text-gray-400">Purges Given</h3>
          </div>
          <p className="text-2xl font-bold text-white">{purgeData.stats.totalGiven}</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium text-gray-400">Purges Received</h3>
          </div>
          <p className="text-2xl font-bold text-white">{purgeData.stats.totalReceived}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 p-4 rounded-lg border border-orange-500/50">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-medium text-orange-300">Credits</h3>
          </div>
          <p className="text-2xl font-bold text-orange-400">{creditData.credits}</p>
          <p className="text-xs text-orange-300/70 mt-1">Redeem ghosted users</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-medium text-gray-400">Purge Streak</h3>
          </div>
          <p className="text-2xl font-bold text-white">{creditData.purgeStreak}/5</p>
          <p className="text-xs text-gray-500 mt-1">Next bonus: {5 - creditData.purgeStreak} purges</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('given')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'given'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Purges You Gave ({purgeData.stats.totalGiven})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'received'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Purges You Received ({purgeData.stats.totalReceived})
        </button>
      </div>

      {/* Purge List */}
      <div className="space-y-3">
        {currentPurges.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">
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
                className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
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
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {profile?.name || 'Unknown User'}
                      </span>
                      <span className="text-gray-400 text-sm">
                        @{profile?.username || 'unknown'}
                      </span>
                      <span className="text-gray-500 text-xs">•</span>
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Calendar className="w-3 h-3" />
                        {formatDate(purge.createdAt)}
                      </div>
                    </div>

                    {/* Action Description */}
                    <p className="text-sm text-gray-400 mb-2">
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
                      <div className="bg-black/50 p-3 rounded border border-gray-700 mt-2">
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {purge.post.content}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Purge Icon */}
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-full ${
                      activeTab === 'given' ? 'bg-orange-500/20' : 'bg-red-500/20'
                    }`}>
                      <Flame className={`w-5 h-5 ${
                        activeTab === 'given' ? 'text-orange-500' : 'text-red-500'
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
