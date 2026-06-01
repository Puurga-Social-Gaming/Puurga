import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, Globe, TrendingUp, Plus, Shield, Heart, AlertTriangle, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/api';
import toast from 'react-hot-toast';
import CreateGroupModal from '../components/CreateGroupModal';
import Button from '../components/ui/Button';
import { useSurvival } from '../context/SurvivalContext';
import { Alliance, PendingAllianceRequest } from '../types/survival';
import Avatar from '../components/Avatar';

interface Group {
  id: string;
  name: string;
  description: string;
  profile_image_url?: string;
  cover_image_url?: string;
  is_private: boolean;
  credits: number;
  member_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_member?: boolean;
  user_role?: string | null;
  creator?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

const Groups: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-groups' | 'public' | 'private' | 'my-alliances'>('all');
  const { 
    getAlliances, 
    getPendingAllianceRequests, 
    acceptAlliance, 
    rejectAlliance,
    breakAlliance
  } = useSurvival();
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingAllianceRequest[]>([]);
  const [alliancesLoading, setAlliancesLoading] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await api.get('/groups');
        setGroups(response.data);
      } catch (error) {
        toast.error('Failed to fetch groups');
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const fetchAlliances = async () => {
      if (filter === 'my-alliances') {
        setAlliancesLoading(true);
        try {
          const [alliancesData, requestsData] = await Promise.all([
            getAlliances(),
            getPendingAllianceRequests(),
          ]);
          setAlliances(alliancesData);
          setPendingRequests(requestsData);
        } catch (error) {
          console.error('Error loading alliances:', error);
          toast.error('Failed to load alliances');
        } finally {
          setAlliancesLoading(false);
        }
      }
    };
    fetchAlliances();
  }, [filter, getAlliances, getPendingAllianceRequests]);

  const handleJoinGroup = async (groupId: string) => {
    try {
      await api.post(`/groups/${groupId}/join`);
      toast.success('Successfully joined group!');
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join group');
    }
  };

  const handleCreateGroup = () => setIsCreateModalOpen(true);

  const handleGroupCreated = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error refreshing groups:', error);
    }
  };

  const handleAcceptAlliance = async (requestId: string) => {
    const result = await acceptAlliance(requestId);
    if (result.success) {
      toast.success('Alliance accepted');
      const [alliancesData, requestsData] = await Promise.all([
        getAlliances(),
        getPendingAllianceRequests(),
      ]);
      setAlliances(alliancesData);
      setPendingRequests(requestsData);
    } else {
      toast.error(result.error || 'Failed to accept alliance');
    }
  };

  const handleRejectAlliance = async (requestId: string) => {
    const result = await rejectAlliance(requestId);
    if (result.success) {
      toast.success('Alliance rejected');
      const requestsData = await getPendingAllianceRequests();
      setPendingRequests(requestsData);
    } else {
      toast.error(result.error || 'Failed to reject alliance');
    }
  };

  const handleBreakAlliance = async (allianceId: string) => {
    if (!confirm('Are you sure you want to break this alliance? This action cannot be undone.')) {
      return;
    }
    const result = await breakAlliance(allianceId);
    if (result.success) {
      toast.success('Alliance broken');
      const alliancesData = await getAlliances();
      setAlliances(alliancesData);
    } else {
      toast.error(result.error || 'Failed to break alliance');
    }
  };

  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groups;
    if (filter === 'my-groups') return groups.filter(g => g.is_member);
    if (filter === 'public') return groups.filter(g => !g.is_private);
    if (filter === 'private') return groups.filter(g => g.is_private);
    return [];
  }, [groups, filter]);

  const trendingGroups = useMemo(() => {
    return [...groups].sort((a, b) => b.member_count - a.member_count).slice(0, 2);
  }, [groups]);

  return (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-1 flex-col min-h-0 bg-background overflow-y-auto h-full w-full"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Groups</h1>
          <button
            onClick={handleCreateGroup}
            className="px-3 py-2 bg-[var(--accent)] text-[var(--fg)] rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 text-sm font-medium flex-shrink-0 shadow-md"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create Group</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Filter Pills — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {(['all', 'my-groups', 'my-alliances', 'public', 'private'] as const).map((f) => (
            <FilterButton
              key={f}
              label={f === 'my-groups' ? 'My Groups' : f === 'my-alliances' ? 'My Alliances' : f.charAt(0).toUpperCase() + f.slice(1)}
              isActive={filter === f}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>

        {filter === 'my-alliances' ? (
          alliancesLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
              <p className="text-muted">Loading alliances...</p>
            </div>
          ) : (
            <>
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="text-amber-400" size={20} />
                    <h2 className="text-lg font-bold text-foreground">Pending Requests</h2>
                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                      {pendingRequests.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <AllianceRequestCardMobile
                        key={request.id}
                        request={request}
                        onAccept={handleAcceptAlliance}
                        onReject={handleRejectAlliance}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Active Alliances */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="text-green-400" size={20} />
                  <h2 className="text-lg font-bold text-foreground">Active Alliances</h2>
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                    {alliances.filter(a => a.allianceStatus === 'ACTIVE').length}/5
                  </span>
                </div>
                
                {alliances.filter(a => a.allianceStatus === 'ACTIVE').length === 0 && pendingRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <Shield size={56} className="mx-auto text-muted mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No alliances yet</h3>
                    <p className="text-muted text-sm max-w-md mx-auto">
                      Form alliances with other users to survive together in the game.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: 2-column grid */}
                    <div className="grid grid-cols-2 gap-3 sm:hidden">
                      {alliances.filter(a => a.allianceStatus === 'ACTIVE').map((alliance, i) => (
                        <motion.div
                          key={alliance.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                        >
                          <AllianceCardMobile alliance={alliance} onBreak={handleBreakAlliance} />
                        </motion.div>
                      ))}
                    </div>

                    {/* Desktop: Full-width cards */}
                    <div className="hidden sm:space-y-3">
                      {alliances.filter(a => a.allianceStatus === 'ACTIVE').map((alliance, i) => (
                        <motion.div
                          key={alliance.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                        >
                          <AllianceCardDesktop alliance={alliance} onBreak={handleBreakAlliance} />
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Broken Alliances */}
              {alliances.filter(a => a.allianceStatus === 'BROKEN' || a.allianceStatus === 'BETRAYED').length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <X className="text-gray-400" size={20} />
                    <h2 className="text-lg font-bold text-foreground">Broken Alliances</h2>
                  </div>
                  <div className="space-y-3">
                    {alliances.filter(a => a.allianceStatus === 'BROKEN' || a.allianceStatus === 'BETRAYED').map((alliance) => (
                      <AllianceCardDesktop key={alliance.id} alliance={alliance} showActions={false} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        ) : loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="sm:hidden grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <GroupCardSkeletonCompact key={i} />)}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <GroupCardSkeleton key={i} />)}
            </div>
          </>
        ) : filteredGroups.length > 0 ? (
          <>
            {/* ── MOBILE: 2-column card grid with enhanced mobile shadows ── */}
            <div className="grid grid-cols-2 gap-3 sm:hidden theme-shadow-md">
              {filteredGroups.map((group, i) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <GroupCardMobile group={group} onJoin={handleJoinGroup} />
                </motion.div>
              ))}
            </div>

            {/* ── DESKTOP: full-width card grid with enhanced shadows ── */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 theme-shadow-lg">
              {filteredGroups.map((group, i) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <GroupCard group={group} onJoin={handleJoinGroup} />
                </motion.div>
              ))}
            </div>

            {/* Trending Sidebar - Enhanced with shadows for mobile */}
            {trendingGroups.length > 0 && (
              <div className="bg-card rounded-xl p-4 mt-6 theme-shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-accent" size={20} />
                  <h2 className="text-lg font-bold text-foreground">Trending</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {trendingGroups.map(group => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover cursor-pointer transition-colors"
                      onClick={() => navigate(`/groups/${group.id}`)}
                    >
                      <img
                        src={group.profile_image_url || '/default-avatar.png'}
                        alt={group.name}
                        className="w-10 h-10 rounded-lg object-cover bg-card-secondary flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted">{group.member_count} members</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Users size={56} className="mx-auto text-muted mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No groups found</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              We couldn't find any groups matching your criteria.
            </p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="mt-6 text-accent hover:underline font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
      </motion.div>
  );
};

// ─── Filter Button ───────────────────────────────────────────────────────────
const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
      isActive 
        ? 'bg-[var(--accent)] text-[var(--fg)] dark:bg-white/10 dark:text-white' 
        : 'bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--card-hover)]'
    }`}
  >
    {label}
  </button>
);

// ─── Mobile Two-Column Card ───────────────────────────────────────────────────
const GroupCardMobile: React.FC<{ group: Group; onJoin: (id: string) => void }> = ({ group, onJoin }) => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-card rounded-xl overflow-hidden cursor-pointer shadow-theme-sm hover:shadow-theme-lg transition-all duration-200 active:scale-[0.98] border border-border"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      {/* Cover Image */}
      <div 
        className="h-20 bg-cover bg-center relative"
        style={{ 
          backgroundImage: group.cover_image_url ? `url(${group.cover_image_url})` : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Profile Avatar overlapping cover */}
        <div className="absolute -bottom-5 left-3">
          <img
            src={group.profile_image_url || '/default-avatar.png'}
            alt={group.name}
            className="w-10 h-10 rounded-lg object-cover bg-card border-2 border-border shadow-md"
          />
        </div>
        {/* Private/Public badge */}
        <div className="absolute top-2 right-2">
          {group.is_private ? (
            <Lock size={12} className="text-white/80" />
          ) : (
            <Globe size={12} className="text-white/80" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 pt-6">
        <h3 className="text-sm font-bold text-foreground truncate leading-tight">{group.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <Users size={10} className="text-muted" />
          <span className="text-[10px] text-muted">{group.member_count.toLocaleString()} members</span>
        </div>
        {group.description && (
          <p className="text-[10px] text-muted mt-1 line-clamp-2 leading-tight">{group.description}</p>
        )}
        
        {/* Action Button */}
        <div className="mt-2.5" onClick={e => e.stopPropagation()}>
          {group.is_member ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/groups/${group.id}`)}
              className="w-full text-xs"
            >
              View
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onJoin(group.id)}
              className="w-full text-xs"
            >
              Join
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Desktop Card ────────────────────────────────────────────────────────────────
const GroupCard: React.FC<{ group: Group; onJoin: (id: string) => void }> = ({ group, onJoin }) => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-card rounded-xl overflow-hidden cursor-pointer shadow-theme-sm hover:shadow-theme-lg transition-all duration-300 group theme-shadow-xl"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <div
        className="h-32 bg-cover bg-center relative"
        style={{ 
          backgroundImage: group.cover_image_url 
            ? `url(${group.cover_image_url})` 
            : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          backgroundColor: group.cover_image_url ? undefined : 'var(--accent)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-[-28px] left-4">
          <img
            src={group.profile_image_url || '/default-avatar.png'}
            alt={group.name}
            className="w-16 h-16 rounded-xl object-cover bg-card border-4 border-card transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>
      <div className="p-4 pt-10">
        <h3 className="font-bold text-foreground truncate">{group.name}</h3>
        <p className="text-xs text-muted mb-3">{group.member_count} members</p>
        <p className="text-sm text-muted-light h-10 overflow-hidden text-ellipsis">{group.description || 'No description.'}</p>
        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <div className="flex items-center gap-1">
            {group.is_private ? <Lock size={12} /> : <Globe size={12} />}
            <span>{group.is_private ? 'Private' : 'Public'}</span>
          </div>
        </div>
        {group.is_member ? (
          <Button
            variant="default"
            size="md"
            onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); }}
            className="w-full mt-4"
          >
            View
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}
            className="w-full mt-4"
          >
            Join
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── Skeletons ───────────────────────────────────────────────────────────────
const GroupCardSkeletonCompact: React.FC = () => (
  <div className="bg-card rounded-xl overflow-hidden animate-pulse border border-border">
    <div className="h-20 bg-gradient-to-r from-gray-700 to-gray-600 relative">
      <div className="absolute -bottom-5 left-3">
        <div className="w-10 h-10 rounded-lg bg-gray-500 border-2 border-card" />
      </div>
    </div>
    <div className="p-2.5 pt-6 space-y-2">
      <div className="h-3.5 w-3/4 bg-gray-600 rounded" />
      <div className="h-2.5 w-1/2 bg-gray-700 rounded" />
      <div className="h-2 w-full bg-gray-700 rounded" />
      <div className="h-6 w-full bg-gray-600 rounded mt-2" />
    </div>
  </div>
);

const GroupCardSkeleton: React.FC = () => (
  <div className="bg-card rounded-xl overflow-hidden animate-pulse">
    <div className="h-32 bg-card-secondary" />
    <div className="p-4 pt-10">
      <div className="h-5 w-3/4 bg-card-secondary rounded mb-2" />
      <div className="h-3 w-1/4 bg-card-secondary rounded mb-3" />
      <div className="h-4 w-full bg-card-secondary rounded" />
      <div className="h-4 w-5/6 bg-card-secondary rounded mt-1" />
      <div className="h-9 w-full bg-card-secondary rounded mt-4" />
    </div>
  </div>
);

// ─── Alliance Request Card Mobile ─────────────────────────────────────────
const AllianceRequestCardMobile: React.FC<{ 
  request: PendingAllianceRequest; 
  onAccept: (id: string) => void; 
  onReject: (id: string) => void; 
}> = ({ request, onAccept, onReject }) => {
  return (
    <div className="bg-card rounded-xl p-3 border border-amber-500/30 shadow-theme-sm">
      <div className="flex items-start gap-3">
        <Avatar src={request.avatar || undefined} alt={request.username} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-amber-400" />
            <h3 className="text-sm font-bold text-foreground truncate">{request.name}</h3>
          </div>
          <p className="text-xs text-muted mb-2">@{request.username}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(request.id)}
              className="flex-1 px-2 py-1.5 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" />
              Accept
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="flex-1 px-2 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Alliance Card Mobile ─────────────────────────────────────────────────
const AllianceCardMobile: React.FC<{ 
  alliance: Alliance; 
  onBreak: (id: string) => void; 
}> = ({ alliance, onBreak }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'border-green-500/30 bg-green-500/5';
      case 'PENDING': return 'border-amber-500/30 bg-amber-500/5';
      case 'BROKEN': return 'border-red-500/30 bg-red-500/5';
      case 'BETRAYED': return 'border-purple-500/30 bg-purple-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const getLoyaltyColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-card rounded-xl p-3 border ${getStatusColor(alliance.allianceStatus)} shadow-theme-sm`}>
      <div className="flex flex-col gap-2">
        <Avatar src={alliance.avatar || undefined} alt={alliance.username} size="md" className="mx-auto" />
        <div className="text-center">
          <h3 className="text-sm font-bold text-foreground truncate">{alliance.name}</h3>
          <p className="text-xs text-muted">@{alliance.username}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs">
          <Heart className={`w-3 h-3 ${getLoyaltyColor(alliance.loyaltyScore)}`} />
          <span className={getLoyaltyColor(alliance.loyaltyScore)}>{alliance.loyaltyScore}</span>
        </div>
        <div className="text-center">
          <span className="text-[10px] px-2 py-0.5 rounded bg-card-secondary text-muted">
            {alliance.allianceStatus}
          </span>
        </div>
        {alliance.allianceStatus === 'ACTIVE' && (
          <button
            onClick={() => onBreak(alliance.id)}
            className="w-full px-2 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            Break Alliance
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Alliance Card Desktop ───────────────────────────────────────────────
const AllianceCardDesktop: React.FC<{ 
  alliance: Alliance; 
  onBreak?: (id: string) => void; 
  showActions?: boolean;
}> = ({ alliance, onBreak, showActions = true }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'border-green-500/30 bg-green-500/5';
      case 'PENDING': return 'border-amber-500/30 bg-amber-500/5';
      case 'BROKEN': return 'border-red-500/30 bg-red-500/5';
      case 'BETRAYED': return 'border-purple-500/30 bg-purple-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const getLoyaltyColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(alliance.allianceStatus)} backdrop-blur-sm`}>
      <div className="flex items-start gap-3">
        <Avatar src={alliance.avatar || undefined} alt={alliance.username} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{alliance.name}</h3>
          </div>
          <p className="text-sm text-muted mb-2">@{alliance.username}</p>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Heart className={`w-3 h-3 ${getLoyaltyColor(alliance.loyaltyScore)}`} />
              <span className={getLoyaltyColor(alliance.loyaltyScore)}>
                {alliance.loyaltyScore}
              </span>
            </div>
            <div className="text-muted">
              {alliance.allianceStatus}
            </div>
          </div>
        </div>
        {showActions && alliance.allianceStatus === 'ACTIVE' && onBreak && (
          <button
            onClick={() => onBreak(alliance.id)}
            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            Break
          </button>
        )}
      </div>
    </div>
  );
};

export default Groups;