import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertTriangle, Ghost, Coins, RotateCcw, Clock } from 'lucide-react';
import { getGhostedFriends, redeemFriend, GhostedFriend } from '../../services/purgaService';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';

const PurgeDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [ghostedFriends, setGhostedFriends] = useState<GhostedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const userCredits = (user as any)?.credits || 0;
  const purgeRisk = Math.min(100, Math.max(0, (user as any)?.purgeRisk || 0));

  useEffect(() => {
    const fetchGhostedFriends = async () => {
      try {
        const friends = await getGhostedFriends();
        setGhostedFriends(friends);
      } catch (error) {
        console.error('Error fetching ghosted friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGhostedFriends();
  }, []);

  const handleRedeem = async (friend: GhostedFriend) => {
    if (userCredits < friend.creditsRequired) {
      toast.error('Not enough credits to redeem this friend');
      return;
    }

    setRedeemingId(friend.id);
    try {
      const result = await redeemFriend(friend.id);
      if (result.success) {
        toast.success(`Redeemed ${friend.name}!`);
        setGhostedFriends(prev => prev.filter(f => f.id !== friend.id));
      }
    } catch (error) {
      toast.error('Failed to redeem friend');
    } finally {
      setRedeemingId(null);
    }
  };

  const formatDuration = (days: number): string => {
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    return `${Math.floor(days / 30)} months`;
  };

  const getRiskLabel = (risk: number): string => {
    if (risk < 25) return 'Low';
    if (risk < 50) return 'Moderate';
    if (risk < 75) return 'High';
    return 'Critical';
  };

  const getRiskColor = (risk: number): string => {
    if (risk < 25) return 'from-accent/30 to-accent/50';
    if (risk < 50) return 'from-accent/50 to-accent/70';
    if (risk < 75) return 'from-accent/70 to-accent/90';
    return 'from-accent/90 to-accent';
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={16} className="text-muted" />
          {t('rightSidebar.purgeRisk') || 'Purge Risk'}
        </h2>
        <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${
          purgeRisk < 25 ? 'bg-card-hover text-muted' :
          purgeRisk < 50 ? 'bg-accent/10 text-foreground/70' :
          purgeRisk < 75 ? 'bg-accent/20 text-foreground' :
          'bg-accent/30 text-foreground font-medium'
        }`}>
          {getRiskLabel(purgeRisk)}
        </span>
      </div>

      <div className="mb-4">
        <div className="h-2 bg-card-hover rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${purgeRisk}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${getRiskColor(purgeRisk)} rounded-full`}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted">
          <span>Safe</span>
          <span>{purgeRisk}%</span>
          <span>At Risk</span>
        </div>
      </div>

      <div className="mb-3 px-1">
        <h3 className="text-xs font-medium text-muted flex items-center gap-2">
          <Ghost size={14} />
          Ghosted Friends ({ghostedFriends.length})
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ghostedFriends.length === 0 ? (
        <div className="text-center py-4 text-muted text-xs">
          <Ghost size={24} className="mx-auto mb-2 opacity-30" />
          <p>No ghosted friends</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ghostedFriends.map((friend) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-card-hover transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm">
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Ghost size={14} className="text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{friend.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <Clock size={10} />
                    <span>{formatDuration(friend.purgeDuration)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <Coins size={10} />
                    <span className={userCredits >= friend.creditsRequired ? 'text-foreground/70' : 'text-red-500/70'}>
                      {friend.creditsRequired.toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRedeem(friend)}
                  disabled={redeemingId === friend.id || userCredits < friend.creditsRequired}
                  className={`p-1.5 rounded-full transition-all ${
                    userCredits >= friend.creditsRequired
                      ? 'bg-accent/10 hover:bg-accent/20 text-foreground/70 hover:text-foreground'
                      : 'bg-card-hover text-muted/30 cursor-not-allowed'
                  } ${redeemingId === friend.id ? 'animate-pulse' : ''}`}
                  title="Redeem"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {userCredits > 0 && (
        <div className="mt-3 pt-3 border-t border-border px-1 flex items-center justify-between text-xs">
          <span className="text-muted">Available Credits</span>
          <span className="text-foreground font-medium">{userCredits.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default PurgeDashboard;
