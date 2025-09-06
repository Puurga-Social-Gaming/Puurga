import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
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
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState<{ [key: string]: ReactionCount }>(initialReactions || {});
  const [isLoading, setIsLoading] = useState(false);

  const handleReaction = async (type: string) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.post(`/api/posts/${postId}/react`, { type });
      setReactions(response.data);
      onReactionChange?.(response.data);
      setShowPicker(false);
    } catch {
      toast.error('Failed to add reaction');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalReactions = () => {
    return Object.values(reactions).reduce((sum, reaction) => sum + reaction.count, 0);
  };

  const getTopReactions = () => {
    return Object.entries(reactions)
      .map(([type, data]) => ({
        type,
        count: data.count,
        users: data.users
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  return (
    <div className="relative">
      {/* Quick Reaction Bar */}
      <div className="flex items-center gap-2">
        {getTopReactions().map((reaction) => (
          <motion.button
            key={reaction.type}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleReaction(reaction.type)}
            className="p-1 hover:bg-white/5 rounded-full transition-colors relative group"
          >
            <span className="text-lg">{REACTIONS.find(r => r.name === reaction.type)?.emoji}</span>
            <span className="text-xs text-gray-400 ml-1">{reaction.count}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2d2d2d] rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {reaction.users.slice(0, 3).map(user => user.name).join(', ')}
              {reaction.users.length > 3 && ` and ${reaction.users.length - 3} others`}
            </div>
          </motion.button>
        ))}

        {/* Add Reaction Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPicker(true)}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <SmilePlus size={20} />
        </motion.button>

        {/* Total Reactions Count */}
        {getTotalReactions() > 0 && (
          <span className="text-sm text-gray-400">
            {getTotalReactions()}
          </span>
        )}
      </div>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full left-0 mb-2 p-2 bg-[#2d2d2d] rounded-lg shadow-lg z-50 flex gap-1"
          >
            {REACTIONS.map((reaction) => (
              <motion.button
                key={reaction.name}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(reaction.name)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors relative group"
                disabled={isLoading}
              >
                <span className="text-xl">{reaction.emoji}</span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {reaction.label}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostReactions; 