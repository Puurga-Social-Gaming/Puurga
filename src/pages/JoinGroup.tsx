import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

interface GroupPreview {
  id: string;
  name: string;
  description: string;
  profile_image_url?: string;
  cover_image_url?: string;
  is_private: boolean;
  member_count: number;
  members: {
    id: string;
    role: string;
    user_id: string;
    profile?: {
      username: string;
      full_name: string;
      avatar_url?: string;
    };
  }[];
}

const JoinGroup: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inviteCode) {
      fetchGroupByInviteCode();
    }
  }, [inviteCode]);

  const fetchGroupByInviteCode = async () => {
    try {
      const response = await api.get(`/groups/invite/${inviteCode}`);
      setGroup(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) return;

    setJoining(true);
    try {
      await api.post('/groups/join', { invite_code: inviteCode });
      toast.success('Successfully joined group!');
      navigate(`/groups/${group?.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Users size={64} className="text-gray-600 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Invalid Invite Link</h1>
        <p className="text-gray-400 text-center mb-6">
          This invite link may be expired or invalid.
        </p>
        <Button onClick={() => navigate('/groups')}>
          <ArrowLeft size={18} />
          Back to Groups
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Cover Image */}
      <div
        className="relative h-48 bg-cover bg-center"
        style={{
          backgroundImage: group.cover_image_url
            ? `url(${group.cover_image_url})`
            : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          backgroundColor: group.cover_image_url ? undefined : 'var(--accent)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />

        <div className="absolute top-4 left-4">
          <button
            onClick={() => navigate('/groups')}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-6 -mt-20 relative z-10">
        <div className="bg-card rounded-2xl p-6 max-w-md mx-auto border border-border shadow-sm">
          {/* Group Profile */}
          <div className="flex flex-col items-center -mt-20 mb-6">
            <div className="w-24 h-24 rounded-full bg-background border-4 border-card overflow-hidden mb-4">
              {group.profile_image_url ? (
                <img
                  src={group.profile_image_url}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-foreground">
                  {group.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground text-center">{group.name}</h1>
            <p className="text-muted text-center mt-1">
              {group.is_private ? '🔒 Private Group' : '🌐 Public Group'}
            </p>
          </div>

          {/* Description */}
          {group.description && (
            <div className="mb-6">
              <p className="text-gray-300 text-center">{group.description}</p>
            </div>
          )}

          {/* Member Count */}
          <div className="mb-6 flex items-center justify-center gap-4 text-sm text-gray-400">
            <span>{group.member_count} members</span>
          </div>

          {/* Members Preview */}
          {group.members.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2 text-center">MEMBERS</p>
              <div className="flex justify-center -space-x-2">
                {group.members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-background border-2 border-card overflow-hidden"
                    title={member.profile?.username}
                  >
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-foreground">
                        {member.profile?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                ))}
                {group.members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-accent border-2 border-card flex items-center justify-center text-xs text-foreground font-medium">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            isLoading={joining}
            className="w-full py-3"
          >
            <UserPlus size={20} />
            Join Group
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default JoinGroup;