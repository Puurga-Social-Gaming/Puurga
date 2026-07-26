import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

interface ShareButtonProps {
  postId: string;
  postContent: string;
  postAuthor: string;
  postAuthorAvatar?: string;
  postImages?: string[];
}

const ShareButton: React.FC<ShareButtonProps> = ({ 
  postId, 
  postContent, 
  postAuthor,
  postAuthorAvatar,
  postImages = [],
}) => {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareModal(true)}
        className="flex items-center gap-1 text-muted hover:text-accent transition-colors"
      >
        <Share2 size={15} />
      </button>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={postId}
        postContent={postContent}
        postAuthor={postAuthor}
        postAuthorAvatar={postAuthorAvatar}
        postImages={postImages}
      />
    </div>
  );
};

export default ShareButton;
