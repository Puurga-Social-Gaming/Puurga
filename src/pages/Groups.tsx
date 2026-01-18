import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Plus, Search, Grid3X3, List, Lock, Globe, Crown } from 'lucide-react';
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

type TabType = 'my-groups' | 'discover';
type ViewType = 'grid' | 'list';

const Groups: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my-groups');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter groups based on tab and search
  const filteredGroups = useMemo(() => {
    let result = groups;
    
    // Filter by tab
    if (activeTab === 'my-groups') {
      result = result.filter(g => g.is_member);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [groups, activeTab, searchQuery]);

  const myGroupsCount = useMemo(() => groups.filter(g => g.is_member).length, [groups]);
  const discoverCount = useMemo(() => groups.filter(g => !g.is_member).length, [groups]);

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
      // Refresh groups to update member count
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
    // Refresh groups list after creating a new group
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error refreshing groups:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">Loading groups...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <button 
            onClick={handleCreateGroup}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={18} />
            Create Group
          </button>
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-[#1a1a1a] rounded-xl p-1">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'my-groups'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My Groups ({myGroupsCount})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'discover'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Discover ({discoverCount})
            </button>
          </div>

          {/* Search and View Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex bg-[#1a1a1a] rounded-lg p-1">
              <button
                onClick={() => setViewType('grid')}
                className={`p-2 rounded transition-colors ${viewType === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Grid view"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-2 rounded transition-colors ${viewType === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Groups Grid/List */}
        <AnimatePresence mode="wait">
          {viewType === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredGroups.map((group: Group) => (
                <motion.div 
                  key={group.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div 
                    className="h-28 bg-cover bg-center relative"
                    style={{
                      backgroundImage: group.cover_image_url ? `url(${group.cover_image_url})` : undefined,
                      backgroundColor: '#2d2d2d'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {group.is_private ? (
                        <span className="flex items-center gap-1 text-xs bg-black/50 text-gray-300 px-2 py-1 rounded-full">
                          <Lock size={10} /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-black/50 text-gray-300 px-2 py-1 rounded-full">
                          <Globe size={10} /> Public
                        </span>
                      )}
                      {group.user_role === 'admin' && (
                        <span className="flex items-center gap-1 text-xs bg-orange-500/80 text-white px-2 py-1 rounded-full">
                          <Crown size={10} /> Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 -mt-10 mb-3 relative">
                      <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-2 border-[#1a1a1a]">
                        {group.profile_image_url ? (
                          <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users size={24} className="text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-6">
                        <h3 className="text-white font-semibold truncate">{group.name}</h3>
                        <p className="text-xs text-gray-400">{group.member_count} members</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{group.description || 'No description'}</p>
                    {group.is_member ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/groups/${group.id}`);
                        }}
                        className="w-full py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors font-medium"
                      >
                        Open Chat
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group.id);
                        }}
                        className="w-full py-2 bg-[#2d2d2d] text-white text-sm rounded-lg hover:bg-orange-500 transition-colors font-medium"
                      >
                        Join Group
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {filteredGroups.map((group: Group) => (
                <motion.div 
                  key={group.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-[#1a1a1a] rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all flex items-center gap-4"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div className="w-14 h-14 rounded-xl bg-[#2d2d2d] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {group.profile_image_url ? (
                      <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={24} className="text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{group.name}</h3>
                      {group.is_private && <Lock size={12} className="text-gray-400" />}
                      {group.user_role === 'admin' && <Crown size={12} className="text-orange-500" />}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{group.description || 'No description'}</p>
                    <p className="text-xs text-gray-500">{group.member_count} members</p>
                  </div>
                  {group.is_member ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/groups/${group.id}`);
                      }}
                      className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors font-medium"
                    >
                      Open
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinGroup(group.id);
                      }}
                      className="px-4 py-2 bg-[#2d2d2d] text-white text-sm rounded-lg hover:bg-orange-500 transition-colors font-medium"
                    >
                      Join
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <Users size={64} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Groups Found</h3>
            <p className="text-gray-400 mb-6">Be the first to create a group and start building your community!</p>
            <button 
              onClick={handleCreateGroup}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus size={20} className="inline mr-2" />
              Create First Group
            </button>
          </div>
        )}

        {/* Trending Groups */}
        {groups.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="text-orange-500" size={20} />
              <h2 className="text-lg font-bold text-white">Trending Groups</h2>
            </div>
            <div className="space-y-4">
              {groups.slice(0, 3).map((group: Group) => (
                <div key={group.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2d2d2d] flex items-center justify-center overflow-hidden">
                      {group.profile_image_url ? (
                        <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={20} className="text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{group.name}</p>
                      <p className="text-sm text-gray-400">{group.member_count} members</p>
                    </div>
                  </div>
                  {group.is_member ? (
                    <button 
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="px-4 py-1 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors text-sm"
                    >
                      View
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleJoinGroup(group.id)}
                      className="px-4 py-1 bg-[#2d2d2d] text-white rounded-full hover:bg-orange-500 transition-colors text-sm"
                    >
                      Join
                    </button>
                  )}
                </div>
              ))}
            </div>
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