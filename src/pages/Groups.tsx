import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Plus, Search, Globe, Lock, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [_loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private' | 'joined'>('all');

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

  const handleCreateGroup = () => {
    setIsCreateModalOpen(true);
  };

  const handleGroupCreated = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error refreshing groups:', error);
    }
  };

  // Filter Logic
  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'public') return !group.is_private;
    if (activeTab === 'private') return group.is_private;
    if (activeTab === 'joined') return group.is_member;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background p-4 sm:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Community Groups</h1>
            <p className="text-muted text-sm mt-1">Discover, join, and engage with like-minded people.</p>
          </div>
          <button
            onClick={handleCreateGroup}
            className="px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-all shadow-theme-button flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            Create Group
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-theme-sm space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input
              type="text"
              placeholder="Search for groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Groups', icon: Users },
              { id: 'public', label: 'Public', icon: Globe },
              { id: 'private', label: 'Private', icon: Lock },
              { id: 'joined', label: 'My Groups', icon: UserCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'bg-background hover:bg-card-hover text-muted hover:text-foreground border border-transparent'
                  }
                `}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGroups.map((group: Group) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={group.id}
                className="group bg-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-theme-md transition-all border border-border flex flex-col h-full"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                {/* Cover Image Area */}
                <div
                  className="h-32 bg-cover bg-center relative bg-muted"
                  style={{
                    backgroundImage: group.cover_image_url ? `url(${group.cover_image_url})` : undefined,
                  }}
                >
                  {!group.cover_image_url && <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5" />}
                  <div className="absolute top-3 right-3">
                    {group.is_private ? (
                      <div className="bg-black/50 backdrop-blur-md text-white p-1.5 rounded-full" title="Private Group">
                        <Lock size={14} />
                      </div>
                    ) : (
                      <div className="bg-white/20 backdrop-blur-md text-white p-1.5 rounded-full" title="Public Group">
                        <Globe size={14} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Header Content Overlap */}
                <div className="px-5 -mt-10 relative z-10 flex justify-between items-end">
                  <div className="w-20 h-20 rounded-2xl bg-card p-1 shadow-lg">
                    <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center border border-border">
                      {group.profile_image_url ? (
                        <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={32} className="text-accent/50" />
                      )}
                    </div>
                  </div>
                  {group.is_member && (
                    <span className="mb-2 px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20 flex items-center gap-1">
                      <UserCheck size={12} /> Member
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 pt-3 flex-1 flex flex-col">
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-accent transition-colors">{group.name}</h3>
                    <div className="flex items-center text-xs text-muted mt-1 gap-3">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {group.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield size={12} /> {group.credits} Credits
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm mt-3 line-clamp-2 flex-1">
                    {group.description || 'No description available for this group.'}
                  </p>

                  {/* Footer Action */}
                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {/* Avatars placeholder or member previews could go here */}
                      <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold ring-2 ring-card z-10">
                        {group.name.charAt(0)}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] ring-2 ring-card">
                        +
                      </div>
                    </div>

                    {group.is_member ? (
                      <button className="text-sm font-medium text-accent hover:underline">
                        Enter Group
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group.id);
                        }}
                        className="px-4 py-1.5 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                      >
                        Join Now
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-muted" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No groups found</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              We couldn't find any groups matching your criteria. Try adjusting your search or filters.
            </p>
            {activeTab !== 'all' && (
              <button
                onClick={() => { setActiveTab('all'); setSearchTerm(''); }}
                className="mt-6 text-accent hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </motion.div>
  );
};

export default Groups;