import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import type { ReactionCount } from '../../types';

interface PostReactionsProps {
  postId: string;
  initialReactions: { [key: string]: ReactionCount };
  onReactionChange?: (reactions: { [key: string]: ReactionCount }) => void;
}

const REACTIONS = [
  { emoji: '❤️', name: 'heart', label: 'Love' },
  { emoji: '👍', name: 'thumbsup', label: 'Like' },
  { emoji: '🔥', name: 'fire', label: 'Fire' },
  { emoji: '😂', name: 'joy', label: 'Haha' },
  { emoji: '🎉', name: 'party', label: 'Celebrate' },
  { emoji: '😮', name: 'wow', label: 'Wow' }
];

const PostReactions: React.FC<PostReactionsProps> = ({
  postId,
  initialReactions,
  onReactionChange
}) => {
  const { user } = useUser();
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState<{ [key: string]: ReactionCount }>(initialReactions || {});
  const [isLoading, setIsLoading] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  // Find user's current reaction
  useEffect(() => {
    if (!user) return;

    for (const [type, data] of Object.entries(reactions)) {
      if (data.users.some(u => u.id === user.id)) {
        setUserReaction(type);
        return;
      }
    }
    setUserReaction(null);
  }, [reactions, user]);

  const handleReaction = async (type: string) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.post(`/posts/${postId}/react`, { type });
      setReactions(response.data);
      onReactionChange?.(response.data);
      setShowPicker(false);

      // Update user's reaction
      if (user) {
        for (const [reactionType, data] of Object.entries(response.data as { [key: string]: ReactionCount })) {
          if (data.users.some((u: any) => u.id === user.id)) {
            setUserReaction(reactionType);
            return;
          }
        }
        setUserReaction(null);
      }
    } catch {
      toast.error('Failed to add reaction');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalReactions = () => {
    return Object.values(reactions).reduce((sum, reaction) => sum + reaction.count, 0);
  };

  const getUserReactionEmoji = () => {
    if (!userReaction) return null;
    return REACTIONS.find(r => r.name === userReaction)?.emoji;
  };

  const getUserReactionCount = () => {
    if (!userReaction || !reactions[userReaction]) return 0;
    return reactions[userReaction].count;
  };

  return (
    <div className="relative">
      {/* Main Reaction Button */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPicker(!showPicker)}
          className={`flex items-center gap-1 transition-colors ${userReaction
              ? 'text-orange-500 hover:text-orange-400'
              : 'text-gray-400 hover:text-white'
            }`}
        >
          {userReaction ? (
            <>
              <span className="text-base sm:text-lg">{getUserReactionEmoji()}</span>
              <span className="text-xs sm:text-sm">{getUserReactionCount()}</span>
            </>
          ) : (
            <>
              <SmilePlus size={18} className="sm:w-5 sm:h-5" />
              {getTotalReactions() > 0 && (
                <span className="text-xs sm:text-sm">{getTotalReactions()}</span>
              )}
            </>
          )}
        </motion.button>
      </div>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Backdrop to close picker */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full left-0 mb-2 p-1.5 sm:p-2 bg-[#2d2d2d] rounded-lg shadow-lg z-50 flex gap-0.5 sm:gap-1"
            >
              {REACTIONS.map((reaction) => {
                const reactionData = reactions[reaction.name];
                const count = reactionData?.count || 0;
                const isUserReaction = userReaction === reaction.name;

                return (
                  <motion.button
                    key={reaction.name}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(reaction.name)}
                    className={`p-1.5 sm:p-2 hover:bg-white/5 rounded-full transition-colors relative group ${isUserReaction ? 'bg-orange-500/20' : ''
                      }`}
                    disabled={isLoading}
                  >
                    <span className="text-lg sm:text-xl">{reaction.emoji}</span>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] sm:text-xs rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">
                        {count}
                      </span>
                    )}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {reaction.label}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostReactions;