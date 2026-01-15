import React, { useState } from 'react';
import { 
  Settings, 
  UserPlus, 
  UserMinus, 
  Volume2, 
  VolumeX, 
  Shield, 
  Trash2, 
  Upload,
  X,
  Crown,
  Users as UsersIcon
} from 'lucide-react';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  muted?: boolean;
  muted_until?: string | null;
  joined_at: string;
  profile: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface GroupAdminPanelProps {
  groupId: string;
  members: Member[];
  isAdmin: boolean;
  isModerator: boolean;
  onUpdate: () => void;
  onDeleteGroup: () => void;
}

const GroupAdminPanel: React.FC<GroupAdminPanelProps> = ({
  groupId,
  members,
  isAdmin,
  isModerator,
  onUpdate,
  onDeleteGroup
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [profileImageRef] = useState(React.useRef<HTMLInputElement>(null));
  const [coverImageRef] = useState(React.useRef<HTMLInputElement>(null));

  const handleMuteMember = async (memberId: string, duration: number | null = null) => {
    try {
      await api.post(`/api/groups/${groupId}/members/${memberId}/mute`, { duration });
      toast.success('Member muted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mute member');
    }
  };

  const handleUnmuteMember = async (memberId: string) => {
    try {
      await api.post(`/api/groups/${groupId}/members/${memberId}/unmute`);
      toast.success('Member unmuted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unmute member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await api.delete(`/api/groups/${groupId}/members/${memberId}`);
      toast.success('Member removed successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'moderator' | 'member') => {
    try {
      await api.put(`/api/groups/${groupId}/members/${memberId}/role`, { role: newRole });
      toast.success(`Member role updated to ${newRole}`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    try {
      // First, find user by username
      const usersResponse = await api.get(`/api/users/search?q=${inviteUsername}`);
      const user = usersResponse.data.find((u: any) => 
        u.username.toLowerCase() === inviteUsername.toLowerCase()
      );

      if (!user) {
        toast.error('User not found');
        return;
      }

      await api.post(`/api/groups/${groupId}/invite`, { invitedUserId: user.id });
      toast.success('Member invited successfully');
      setInviteUsername('');
      setShowInviteModal(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to invite member');
    }
  };

  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    const formData = new FormData();
    formData.append(type === 'profile' ? 'profileImage' : 'coverImage', file);

    try {
      const endpoint = type === 'profile' 
        ? `/api/groups/${groupId}/profile-image`
        : `/api/groups/${groupId}/cover-image`;
      
      await api.put(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`${type === 'profile' ? 'Group icon' : 'Cover image'} updated successfully`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/api/groups/${groupId}`);
      toast.success('Group deleted successfully');
      onDeleteGroup();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete group');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'moderator': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={14} />;
      case 'moderator': return <Shield size={14} />;
      default: return <UsersIcon size={14} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Controls Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-white">Admin Controls</h3>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
          >
            <Trash2 size={16} />
            Delete Group
          </button>
        )}
      </div>

      {/* Image Upload Controls */}
      {isAdmin && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-white mb-3">Group Images</h4>
          <div className="flex gap-3">
            <button
              onClick={() => profileImageRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              <Upload size={16} />
              Change Icon
            </button>
            <button
              onClick={() => coverImageRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              <Upload size={16} />
              Change Cover
            </button>
          </div>
          <input
            ref={profileImageRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
            className="hidden"
          />
          <input
            ref={coverImageRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
            className="hidden"
          />
        </div>
      )}

      {/* Invite Members */}
      {(isAdmin || isModerator) && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm w-full justify-center"
          >
            <UserPlus size={16} />
            Invite Members
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-4">Members ({members.length})</h4>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {member.profile.avatar_url ? (
                    <img src={member.profile.avatar_url} alt={member.profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold">{member.profile.full_name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{member.profile.full_name}</p>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getRoleBadgeColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      {member.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">@{member.profile.username}</p>
                  {member.muted && (
                    <p className="text-xs text-red-400 mt-1">🔇 Muted</p>
                  )}
                </div>
              </div>

              {(isAdmin || (isModerator && member.role === 'member')) && (
                <div className="flex items-center gap-2">
                  {/* Mute/Unmute */}
                  {member.muted ? (
                    <button
                      onClick={() => handleUnmuteMember(member.user_id)}
                      className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Unmute"
                    >
                      <Volume2 size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMuteMember(member.user_id, 60)}
                      className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      title="Mute for 1 hour"
                    >
                      <VolumeX size={16} />
                    </button>
                  )}

                  {/* Change Role (Admin only) */}
                  {isAdmin && member.role !== 'admin' && (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.user_id, e.target.value as any)}
                      className="px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-orange-500"
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}

                  {/* Remove (Admin only) */}
                  {isAdmin && member.role !== 'admin' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Delete Group?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone. All messages and member data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Invite Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleInviteMember()}
              />
              <button
                onClick={handleInviteMember}
                className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
              >
                Send Invite
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupAdminPanel;
