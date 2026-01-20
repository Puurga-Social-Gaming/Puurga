import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, TrendingUp, Plus } from 'lucide-react';
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

type TabType = 'my-groups' | 'discover';
type ViewType = 'grid' | 'list';

const Groups: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [_loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-[#0a0a0a] p-6"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Groups</h1>
            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              Create Group
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="bg-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="h-32 bg-[#2d2d2d] relative">
                  <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                    <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Users size={32} className="text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Loading...</h3>
                      <p className="text-sm text-gray-400">Loading...</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-400 text-sm mb-4">Loading...</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="text-orange-500" size={16} />
                      <span className="text-sm text-white">Loading...</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 py-2 bg-[#2d2d2d] text-white rounded-lg hover:bg-orange-500 transition-colors">
                    Join Group
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background p-4 sm:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <button 
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Create Group
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group: Group) => (
            <div 
              key={group.id} 
              className="bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              {/* Group Header Image */}
              <div 
                className="h-32 bg-cover bg-center relative"
                style={{
                  backgroundImage: group.cover_image_url ? `url(${group.cover_image_url})` : undefined,
                  backgroundColor: '#2d2d2d'
                }}
              >
                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                  <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                    {group.profile_image_url ? (
                      <img src={group.profile_image_url} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={32} className="text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{group.name}</h3>
                    <p className="text-sm text-gray-400">{group.member_count} members</p>
                  </div>
                </div>
              </div>

              {/* Group Info */}
              <div className="p-4">
                <p className="text-gray-400 text-sm mb-4">{group.description || 'No description available'}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="text-orange-500" size={16} />
                    <span className="text-sm text-white">{group.credits} Credits</span>
                  </div>
                  {group.is_private && (
                    <span className="text-xs bg-[#2d2d2d] text-gray-400 px-2 py-1 rounded-full">
                      Private
                    </span>
                  )}
                </div>

                {/* Join/View Button */}
                {group.is_member ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/groups/${group.id}`);
                    }}
                    className="w-full mt-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    View Group
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinGroup(group.id);
                    }}
                    className="w-full mt-4 py-2 bg-[#2d2d2d] text-white rounded-lg hover:bg-orange-500 transition-colors"
                  >
                    Join Group
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {groups.length === 0 && (
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