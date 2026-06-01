import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil } from 'lucide-react';
import CreatePost from './CreatePost';
import { useSurvival } from '../../context/SurvivalContext';
import type { Post } from '../../types';

interface FloatingCreateButtonProps {
  onPostCreated: (post: Post) => void;
}

const FloatingCreateButton: React.FC<FloatingCreateButtonProps> = ({ onPostCreated }) => {
  const { survivalState } = useSurvival();
  const isGhosted = survivalState?.purgatory_status === true;
  const [isOpen, setIsOpen] = useState(false);

  if (isGhosted) return null;

  const handlePostCreated = (post: Post) => {
    onPostCreated(post);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        drag
        dragConstraints={{
          left: 0,
          right: window.innerWidth - 100,
          top: 0,
          bottom: window.innerHeight - 100,
        }}
        dragElastic={0.1}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-4 lg:bottom-10 lg:right-10 z-[100] w-14 h-14 flex items-center justify-center rounded-full bg-white/20 text-white/90 shadow-lg backdrop-blur-md transition-all border border-white/25 hover:bg-white/30 hover:rotate-12"
        aria-label="Create post"
        style={{ touchAction: 'none' }}
      >
        <Pencil size={24} />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[95dvh] flex flex-col border-t sm:border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-background px-4 py-4 flex items-center justify-between rounded-t-2xl z-20 shrink-0">
                <div className="w-10"></div>
                <h2 className="text-[18px] font-bold text-foreground">Create New Post</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-card hover:bg-card-hover text-muted hover:text-foreground rounded-full transition-colors active:scale-90"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Create Post Component */}
              <div className="px-4 pb-6 flex-1 overflow-y-auto scrollbar-hide">
                <CreatePost onPostCreated={handlePostCreated} autoExpand={true} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCreateButton;

