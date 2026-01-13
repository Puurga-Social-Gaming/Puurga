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
      name: ['Alice','Brandon','Chidi','Dana','Ema','Felix','Gina','Hadi'][i % 8],
      avatar: DEFAULT_IMAGES.avatar,
      isFriend: true,
    },
  } as unknown as Status));

  // Only show dummy statuses during loading
  const useDummy = loading;

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
          .map((status) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatus(status)}
              className="flex flex-col items-center min-w-[56px] group"
              aria-label={status.User.name}
              title={status.User.name}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full border-2 ${getStatusRingColor(status)} p-[1px] ${isStatusActive(status) ? 'animate-pulse' : ''} overflow-hidden`}>
                  {/* Show actual content instead of just profile picture */}
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
                
                {/* User avatar overlay for content statuses */}
                {(status.mediaUrl || status.content) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-black overflow-hidden">
                    <Avatar
                      src={status.User.avatar || DEFAULT_IMAGES.avatar}
                      alt={status.User.name}
                      size="sm"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-300 mt-1 truncate w-full text-center group-hover:text-white transition-colors">
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl w-full sm:w-auto sm:min-w-[400px] sm:max-w-md max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Create Status</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <textarea
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="w-full bg-[#222] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                  maxLength={280}
                />
                <div className="text-right text-xs text-gray-500">
                  {newStatus.length}/280
                </div>

                {/* Image Preview */}
                {selectedFile && (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-[#222] text-gray-300 rounded-lg hover:bg-[#333] hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Photo
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateStatus}
                      disabled={!newStatus.trim() && !selectedFile}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm font-medium"
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

      {/* Status Viewing Modal - WhatsApp/Facebook Style */}
      <AnimatePresence>
        {selectedStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black flex flex-col z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0))' }}>
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedStatus.User.avatar || DEFAULT_IMAGES.avatar}
                  alt={`${selectedStatus.User.name}'s profile picture`}
                  size="md"
                  className="w-10 h-10 ring-2 ring-orange-500/30"
                />
                <div>
                  <h3 className="font-semibold text-white">{selectedStatus.User.name}</h3>
                  <p className="text-sm text-gray-300">
                    {new Date(selectedStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStatus(null)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="max-w-lg w-full">
                {selectedStatus.mediaUrl ? (
                  <div className="relative">
                    <img
                      src={selectedStatus.mediaUrl}
                      alt="Status"
                      className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                    />
                    {selectedStatus.content && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl">
                        <p className="text-white text-lg font-medium leading-relaxed">
                          {selectedStatus.content}
                        </p>
                      </div>
                    )}
                  </div>
                ) : selectedStatus.content ? (
                  <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl p-8 shadow-2xl">
                    <p className="text-white text-xl font-medium text-center leading-relaxed">
                      {selectedStatus.content}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <p>No content available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-black/80 backdrop-blur-md" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))' }}>
              <div className="flex items-center justify-center gap-6">
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusBar;