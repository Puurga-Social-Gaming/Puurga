import React, { useEffect, useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import Avatar from '../Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

interface StatusUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  isFriend?: boolean;
}

interface Status {
  id: string | number;
  content?: string;
  mediaUrl?: string;
  type: 'text' | 'media';
  createdAt: string;
  expiresAt: string;
  User: StatusUser;
  isViewed?: boolean;
}

// Map API response to Status interface
function mapApiStatus(data: Record<string, unknown>): Status {
  const userObj = (data.User as Record<string, unknown>) || {};
  return {
    id: data.id as string | number,
    content: data.content as string | undefined,
    mediaUrl: data.mediaUrl as string | undefined,
    type: (data.type as 'text' | 'media') || 'text',
    createdAt: data.createdAt as string,
    expiresAt: data.expiresAt as string,
    isViewed: data.isViewed as boolean | undefined,
    User: {
      id: (userObj.id as string) || '',
      name: (userObj.name as string) || (userObj.full_name as string) || '',
      username: (userObj.username as string) || '',
      avatar: (userObj.avatar as string) || (userObj.avatar_url as string) || '',
      isFriend: userObj.isFriend as boolean | undefined,
    },
  };
}

const StatusBar = () => {
  useUser();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/statuses');
      const rawData = Array.isArray(response.data) ? response.data : [];
      const mappedStatuses = rawData.map((item: Record<string, unknown>) => mapApiStatus(item));
      setStatuses(mappedStatuses);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCreateStatus = async () => {
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      if (newStatus) {
        formData.append('content', newStatus);
      }

      console.log('Creating status with:', {
        hasFile: !!selectedFile,
        hasContent: !!newStatus,
        content: newStatus
      });

      await api.post('statuses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Status created successfully');
      setIsCreating(false);
      setNewStatus('');
      setSelectedFile(null);
      fetchStatuses();
    } catch (error: any) {
      console.error('Error creating status:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      toast.error(`Failed to create status: ${error.response?.data?.error || error.message}`);
    }
  };

  const isStatusActive = (status: Status) => {
    const expiryTime = new Date(status.expiresAt).getTime();
    const now = new Date().getTime();
    return now < expiryTime;
  };

  const getStatusRingColor = (status: Status) => {
    if (!isStatusActive(status)) return 'border-gray-600';
    if (status.isViewed) return 'border-gray-400';
    return 'border-orange-500';
  };

  // Build dummy statuses for preview when loading, errored, or empty
  const dummyStatuses: Status[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `dummy-${i}`,
    userId: `u-${i}`,
    content: '',
    mediaUrl: '',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isViewed: i === 0,
    type: 'text',
    User: {
      id: `u-${i}`,
      name: ['Alice', 'Brandon', 'Chidi', 'Dana', 'Ema', 'Felix', 'Gina', 'Hadi'][i % 8],
      avatar: DEFAULT_IMAGES.avatar,
      isFriend: true,
    },
  } as unknown as Status));

  // Only show dummy statuses during loading
  const useDummy = loading;

  return (
    <div className="mb-2">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add Status Button */}
        <button
          onClick={() => setIsCreating(true)}
          className="flex flex-col items-center min-w-[56px]"
          aria-label="Add Status"
        >
          <div className="relative w-12 h-12 rounded-full border border-border flex items-center justify-center hover:border-accent transition-colors bg-card">
            <Plus size={20} className="text-accent" />
          </div>
          <span className="text-xs text-muted mt-1">Add</span>
        </button>

        {/* Status Circles */}
        {(useDummy ? dummyStatuses : statuses)
          .map((status) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatus(status)}
              className="flex flex-col items-center min-w-[56px] group"
              aria-label={status.User.name}
              title={status.User.name}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full border-2 ${getStatusRingColor(status)} p-[1px] ${isStatusActive(status) ? 'animate-pulse' : ''} overflow-hidden bg-card`}>
                  {status.mediaUrl ? (
                    <img
                      src={status.mediaUrl}
                      alt={`${status.User.name}'s status`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : status.content ? (
                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center p-1">
                      <div className="text-white text-[8px] font-medium text-center leading-tight overflow-hidden">
                        {status.content.length > 20 ? status.content.substring(0, 20) + '...' : status.content}
                      </div>
                    </div>
                  ) : (
                    <Avatar
                      src={status.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={`${status.User.name}'s profile picture`}
                      size="md"
                      className="w-full h-full"
                    />
                  )}
                </div>

                {(status.mediaUrl || status.content) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background overflow-hidden">
                    <Avatar
                      src={status.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={status.User.name}
                      size="sm"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted mt-1 truncate w-full text-center group-hover:text-foreground transition-colors">
                {status.User.name.split(' ')[0]}
              </span>
            </button>
          ))}
      </div>

      {/* Status Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreating(false)} // Close when clicking backdrop
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking content
              className="bg-card rounded-2xl w-full max-w-md shadow-theme-xl border border-border overflow-hidden relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Create Status</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-4">
                  {/* User Avatar - Context for who is posting */}
                  <div className="flex-shrink-0">
                    {/* We assume useUser provides authorized user. StatusBar has no direct user access in props but hook is called. 
                          We should probably get user from context. StatusBar line 51 calls useUser() but doesn't destructure user. */}
                  </div>

                  <textarea
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    placeholder="What's happening?"
                    className="flex-1 bg-transparent border-none text-foreground placeholder-muted focus:ring-0 resize-none text-lg p-0"
                    rows={3}
                    maxLength={280}
                  />
                </div>

                {/* Image Preview */}
                {selectedFile && (
                  <div className="relative rounded-xl overflow-hidden shadow-sm">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full max-h-60 object-cover"
                    />
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-accent hover:bg-accent/10 rounded-full transition-colors"
                      title="Add Photo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${newStatus.length > 250 ? 'text-red-500' : 'text-muted'}`}>
                      {newStatus.length}/280
                    </span>
                    <button
                      onClick={handleCreateStatus}
                      disabled={!newStatus.trim() && !selectedFile}
                      className="px-6 py-2 bg-accent text-white rounded-full hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-theme-button font-medium"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Viewing Modal - Theme Aware */}
      <AnimatePresence>
        {selectedStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl"
            onClick={() => setSelectedStatus(null)}
          >
            {/* Centered Content Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-theme-xl overflow-hidden border border-border relative flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedStatus.User.avatar || DEFAULT_IMAGES.avatar}
                    alt={selectedStatus.User.name}
                    size="md"
                    className="ring-2 ring-accent"
                  />
                  <div>
                    <h3 className="font-bold text-foreground">{selectedStatus.User.name}</h3>
                    <p className="text-xs text-muted">
                      {new Date(selectedStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto bg-background-secondary flex items-center justify-center min-h-[300px]">
                {selectedStatus.mediaUrl ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-1 flex items-center justify-center bg-black">
                      <img
                        src={selectedStatus.mediaUrl}
                        alt="Status"
                        className="max-w-full max-h-[70vh] object-contain"
                      />
                    </div>
                    {selectedStatus.content && (
                      <div className="p-4 bg-card border-t border-border">
                        <p className="text-foreground text-center font-medium">
                          {selectedStatus.content}
                        </p>
                      </div>
                    )}
                  </div>
                ) : selectedStatus.content ? (
                  <div className="w-full h-full min-h-[400px] flex items-center justify-center p-8 bg-gradient-to-br from-orange-500 to-pink-500 text-center">
                    <p className="text-white text-2xl font-bold drop-shadow-md">
                      {selectedStatus.content}
                    </p>
                  </div>
                ) : (
                  <div className="text-muted">No content</div>
                )}
              </div>

              {/* Footer / Actions (Placeholder for now as in original) */}
              <div className="p-4 border-t border-border bg-card flex justify-center gap-6">
                {/* Interactions reused from original but simplified/themed */}
                <button className="p-2 text-muted hover:text-accent transition-colors"><span className="sr-only">Like</span>❤️</button>
                <button className="p-2 text-muted hover:text-accent transition-colors"><span className="sr-only">Reply</span>💬</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusBar;