import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Facebook, Twitter, Linkedin, Link2, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ShareButtonProps {
  postId: string;
  postContent: string;
  postAuthor: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ postId, postContent, postAuthor }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Generate share URL with Puurga branding
  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/post/${postId}?ref=puurga_share`;
  };

  // Generate share text with Puurga branding
  const getShareText = () => {
    const truncatedContent = postContent.length > 100 
      ? postContent.substring(0, 100) + '...' 
      : postContent;
    return `Check out this post by ${postAuthor} on Puurga! 🔥\n\n"${truncatedContent}"\n\n`;
  };

  const handleCopyLink = () => {
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
    setShowShareMenu(false);
  };

  const handleShareFacebook = () => {
    const shareUrl = getShareUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareTwitter = () => {
    const shareUrl = getShareUrl();
    const shareText = getShareText();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=Puurga`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareLinkedIn = () => {
    const shareUrl = getShareUrl();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    const shareUrl = getShareUrl();
    const shareText = getShareText();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${postAuthor} on Puurga`,
          text: getShareText(),
          url: getShareUrl(),
        });
        setShowShareMenu(false);
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center gap-1 text-gray-400 hover:text-green-500 transition-colors"
      >
        <Share2 size={18} className="sm:w-5 sm:h-5" />
      </motion.button>

      <AnimatePresence>
        {showShareMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowShareMenu(false)}
            />
            
            {/* Share Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full right-0 mb-2 w-56 bg-[#2d2d2d] rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-gray-700">
                <p className="text-sm text-gray-400 font-medium">Share via</p>
              </div>
              
              <div className="p-1">
                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Link2 size={18} />
                  <span className="text-sm">Copy Link</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={handleShareFacebook}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Facebook size={18} />
                  <span className="text-sm">Facebook</span>
                </button>

                {/* Twitter */}
                <button
                  onClick={handleShareTwitter}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Twitter size={18} />
                  <span className="text-sm">Twitter</span>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={handleShareLinkedIn}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Linkedin size={18} />
                  <span className="text-sm">LinkedIn</span>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <MessageCircle size={18} />
                  <span className="text-sm">WhatsApp</span>
                </button>

                {/* Native Share (if available) */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Share2 size={18} />
                    <span className="text-sm">More Options</span>
                  </button>
                )}
              </div>

              {/* Puurga Branding */}
              <div className="p-2 border-t border-gray-700 bg-orange-500/10">
                <p className="text-xs text-orange-400 text-center">
                  🔥 Shared via Puurga
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareButton;
