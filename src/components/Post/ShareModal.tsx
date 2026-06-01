import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Users, MessageCircle, MessageSquare, BookOpen, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAcceptedFriends } from '../../services/friendService';
import { postService } from '../../services/posts';
import Avatar from '../Avatar';
import { useUser } from '../../context/UserContext';
import Button from '../ui/Button';

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  postAuthor: string;
  postAuthorAvatar?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  postId,
  postContent,
  postAuthor
}) => {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [shareText, setShareText] = useState('');
  const [isReposting, setIsReposting] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/post/${postId}?ref=puurga_share`;

  const truncatedContent = postContent.length > 150 
    ? postContent.substring(0, 150) + '...' 
    : postContent;

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      setShareText('');
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const data = await getAcceptedFriends();
      setFriends(data.friends || data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    }
  };

  const handleShare = async () => {
    setIsReposting(true);
    try {
      const finalContent = shareText.trim() 
        ? `${shareText}\n\nShared from @${postAuthor}:\n"${truncatedContent}"` 
        : `Shared from @${postAuthor}:\n"${truncatedContent}"`;

      await postService.createPost({ content: finalContent });
      toast.success('Shared successfully!');
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share post');
    } finally {
      setIsReposting(false);
    }
  };

  const handleShareToFriend = async (friend: Friend) => {
    try {
      const finalContent = `Check out this post by @${postAuthor}!\n\n"${truncatedContent}"\n\n.@${friend.username}`;
      await postService.createPost({ content: finalContent });
      toast.success(`Shared with ${friend.display_name}!`);
    } catch (error) {
      console.error('Error sharing to friend:', error);
      toast.error('Failed to share with friend');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleExternalShare = (platform: string) => {
    const textToShare = `Check out this post by ${postAuthor} on Puurga!`;
    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}&url=${encodeURIComponent(shareUrl)}&hashtags=Puurga`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(textToShare + ' ' + shareUrl)}`;
        break;
      case 'messenger':
        url = `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center overflow-hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card text-card-foreground rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border z-10 max-h-[90dvh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="w-10" />
              <h2 className="text-[17px] font-bold">Share</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-card-hover hover:bg-card-hover/80 transition-colors"
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
              {/* User Input Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar 
                    src={user?.avatar || undefined} 
                    alt={user?.name || 'User'} 
                    size="md"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-[15px]">{user?.name || 'Loading...'}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="px-2 py-0.5 rounded-md bg-card-hover text-[11px] font-semibold flex items-center gap-1">
                        <Lock size={10} />
                        Only me
                      </div>
                    </div>
                  </div>
                </div>

                <textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  placeholder="Add a message..."
                  className="w-full bg-transparent text-[17px] outline-none border-none resize-none placeholder-muted min-h-[60px]"
                />
              </div>

              <div className="h-[1px] w-full bg-border" />

              {/* Quick Share - Friends */}
              {friends.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-[14px] mb-3 tracking-wide text-muted uppercase">Share with friends</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      {friends.slice(0, 10).map((friend) => (
                        <div 
                          key={friend.id} 
                          onClick={() => handleShareToFriend(friend)}
                          className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                        >
                          <Avatar 
                            src={friend.avatar_url || undefined} 
                            alt={friend.display_name} 
                            size="lg"
                            className="mb-1 w-12 h-12 ring-2 ring-transparent group-hover:ring-accent transition-all" 
                          />
                          <span className="text-[11px] leading-tight text-center text-muted font-medium group-hover:text-foreground max-w-[64px] truncate">
                            {friend.display_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[1px] w-full bg-border" />
                </>
              )}

              {/* External Share Options */}
              <div>
                <h3 className="font-semibold text-[14px] mb-3 tracking-wide text-muted uppercase">Share to</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  <div 
                    onClick={() => handleExternalShare('messenger')}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-card-hover group-hover:bg-card-hover/80 flex items-center justify-center mb-1 transition-colors">
                      <MessageSquare size={20} className="fill-foreground" />
                    </div>
                    <span className="text-[11px] font-medium text-muted group-hover:text-foreground">Messenger</span>
                  </div>

                  <div 
                    onClick={() => handleExternalShare('whatsapp')}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-card-hover group-hover:bg-card-hover/80 flex items-center justify-center mb-1 transition-colors">
                      <MessageCircle size={20} className="text-foreground fill-foreground" />
                    </div>
                    <span className="text-[11px] font-medium text-muted group-hover:text-foreground">WhatsApp</span>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0 opacity-60">
                    <div className="w-12 h-12 rounded-full bg-card-hover flex items-center justify-center mb-1">
                      <BookOpen size={20} className="text-foreground" />
                    </div>
                    <span className="text-[11px] font-medium text-muted">Story</span>
                  </div>

                  <div 
                    onClick={handleCopyLink}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent/20 group-hover:bg-accent/30 flex items-center justify-center mb-1 transition-colors">
                      <Link2 size={20} className="text-accent" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground">Copy Link</span>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0 opacity-60">
                    <div className="w-12 h-12 rounded-full bg-card-hover flex items-center justify-center mb-1">
                      <Users size={20} className="text-foreground fill-foreground" />
                    </div>
                    <span className="text-[11px] font-medium text-muted">Groups</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Share Button */}
            <div className="px-4 py-3 border-t border-border shrink-0 bg-card pb-[max(env(safe-area-inset-bottom),1rem)]">
              <Button
                variant="primary"
                onClick={handleShare}
                isLoading={isReposting}
                className="w-full text-[16px] font-bold h-12 rounded-xl"
              >
                Share Now
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareModal;