import React, { useEffect, useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/api';
import { useUser, User } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import Avatar from '../Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

interface Status {
  id: number;
  content?: string;
  mediaUrl?: string;
  type: 'text' | 'media';
  createdAt: string;
  expiresAt: string;
  User: User;
  isViewed?: boolean;
}

const StatusBar = () => {
  const { user } = useUser();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await api.get<Status[]>('/statuses');
      setStatuses(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching statuses:', error);
      setError('Failed to load statuses');
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

      await api.post('/statuses', formData);
      toast.success('Status created successfully');
      setIsCreating(false);
      setNewStatus('');
      setSelectedFile(null);
      fetchStatuses();
    } catch (error) {
      console.error('Error creating status:', error);
      toast.error('Failed to create status');
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
      name: ['Alice','Brandon','Chidi','Dana','Ema','Felix','Gina','Hadi'][i % 8],
      avatar: DEFAULT_IMAGES.avatar,
      isFriend: true,
    },
  } as unknown as Status));

  const useDummy = !!error || loading || statuses.length === 0;

  return (
    <div className="mb-2">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {/* Add Status Button */}
        <button
          onClick={() => setIsCreating(true)}
          className="flex flex-col items-center min-w-[56px]"
          aria-label="Add Status"
        >
          <div className="relative w-12 h-12 rounded-full border border-[color:var(--neo-border)] flex items-center justify-center hover:border-orange-500/50 transition-colors">
            <Plus size={20} className="text-orange-500" />
          </div>
          <span className="text-xs text-gray-300 mt-1">Add</span>
        </button>

        {/* Status Circles */}
        {(useDummy ? dummyStatuses : statuses)
          .filter(status => status.User.isFriend || status.User.id === user?.id)
          .map((status) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatus(status)}
              className="flex flex-col items-center min-w-[56px]"
              aria-label={status.User.name}
              title={status.User.name}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full border-2 ${getStatusRingColor(status)} p-[2px] ${isStatusActive(status) ? 'animate-pulse' : ''}`}>
                  <Avatar
                    src={status.User.avatar || DEFAULT_IMAGES.avatar}
                    alt={`${status.User.name}'s profile picture`}
                    size="md"
                    className="w-full h-full"
                  />
                </div>
                {status.type === 'media' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-black" />
                )}
              </div>
              <span className="text-xs text-gray-300 mt-1 truncate w-full text-center">
                {status.User.name}
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
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Create Status</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <textarea
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-[#222] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={4}
                />

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#222] text-white rounded-lg hover:bg-[#333] transition-colors"
                  >
                    Add Photo
                  </button>
                  {selectedFile && (
                    <span className="ml-2 text-gray-400">
                      Selected: {selectedFile.name}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStatus}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Post Status
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Viewing Modal */}
      <AnimatePresence>
        {selectedStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedStatus.User.avatar || DEFAULT_IMAGES.avatar}
                    alt={`${selectedStatus.User.name}'s profile picture`}
                    size="md"
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="font-bold text-white">{selectedStatus.User.name}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(selectedStatus.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {selectedStatus.mediaUrl && (
                  <img
                    src={selectedStatus.mediaUrl}
                    alt="Status"
                    className="w-full rounded-lg"
                  />
                )}
                {selectedStatus.content && (
                  <p className="text-white text-lg">{selectedStatus.content}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusBar; 