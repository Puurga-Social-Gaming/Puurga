import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, Globe, TrendingUp, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/api';
import toast from 'react-hot-toast';
import CreateGroupModal from '../components/CreateGroupModal';

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
  const [filter, setFilter] = useState<'all' | 'my-groups' | 'public' | 'private'>('all');

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
      className="min-h-screen bg-background p-4 sm:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Groups</h1>
          <button
            onClick={handleCreateGroup}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium flex-shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create Group</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Filter Pills — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {(['all', 'my-groups', 'public', 'private'] as const).map((f) => (
            <FilterButton
              key={f}
              label={f === 'my-groups' ? 'My Groups' : f.charAt(0).toUpperCase() + f.slice(1)}
              isActive={filter === f}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>

        {loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="md:hidden space-y-2">
              {[...Array(5)].map((_, i) => <GroupCardSkeletonCompact key={i} />)}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <GroupCardSkeleton key={i} />)}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9">
              {filteredGroups.length > 0 ? (
                <>
                  {/* ── MOBILE: 2-column card grid ── */}
                  <div className="grid grid-cols-2 gap-3 md:hidden">
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

                  {/* ── DESKTOP: original card grid ── */}
                  <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredGroups.map((group) => (
                      <GroupCard key={group.id} group={group} onJoin={handleJoinGroup} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-card rounded-xl">
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

            {/* Sidebar — hidden on mobile, visible on desktop */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-accent" size={20} />
                  <h2 className="text-lg font-bold text-foreground">Trending</h2>
                </div>
                <div className="space-y-3">
                  {trendingGroups.map(group => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
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
            </div>
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
      isActive ? 'bg-gray-700 text-white' : 'bg-card text-foreground hover:bg-card-hover'
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
      className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] border border-gray-700"
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
            className="w-10 h-10 rounded-lg object-cover bg-gray-700 border-2 border-gray-800 shadow-md"
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
        <h3 className="text-sm font-bold text-white truncate leading-tight">{group.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <Users size={10} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">{group.member_count.toLocaleString()} members</span>
        </div>
        {group.description && (
          <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-tight">{group.description}</p>
        )}
        
        {/* Action Button */}
        <div className="mt-2.5" onClick={e => e.stopPropagation()}>
          {group.is_member ? (
            <button
              onClick={() => navigate(`/groups/${group.id}`)}
              className="w-full py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              View
            </button>
          ) : (
            <button
              onClick={() => onJoin(group.id)}
              className="w-full py-1.5 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Desktop Card (unchanged) ────────────────────────────────────────────────
const GroupCard: React.FC<{ group: Group; onJoin: (id: string) => void }> = ({ group, onJoin }) => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-card rounded-xl overflow-hidden cursor-pointer shadow-theme-sm hover:shadow-theme-md transition-all duration-300 group"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <div
        className="h-32 bg-cover bg-center relative"
        style={{ backgroundImage: group.cover_image_url ? `url(${group.cover_image_url})` : 'none', backgroundColor: 'var(--card-secondary)' }}
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
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); }}
            className="w-full mt-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-semibold"
          >
            View
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}
            className="w-full mt-4 py-2 bg-card-secondary text-foreground rounded-lg hover:bg-accent hover:text-white transition-colors text-sm font-semibold"
          >
            Join
          </button>
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

export default Groups;