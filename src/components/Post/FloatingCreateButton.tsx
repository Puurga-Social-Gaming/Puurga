import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PuurgaLogo from '../Icons/PuurgaLogo';
import CreatePost from './CreatePost';
import type { Post } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface FloatingCreateButtonProps {
  onPostCreated: (post: Post) => void;
}

const FloatingCreateButton: React.FC<FloatingCreateButtonProps> = ({ onPostCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();

  const handlePostCreated = (post: Post) => {
    onPostCreated(post);
    setIsOpen(false);
  };

  // Determine shadow based on theme
  const shadowStyle = theme === 'dark' 
    ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)';

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          theme === 'dark' 
            ? 'bg-gray-800 hover:bg-gray-700' 
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
        style={{
          boxShadow: shadowStyle
        }}
        aria-label="Create post"
      >
        <PuurgaLogo size={28} className="text-orange-500" />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-24 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:w-full lg:max-w-2xl bg-background rounded-2xl shadow-2xl z-[70] max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
                <h2 className="text-lg font-semibold text-foreground">Share your thoughts</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Create Post Component */}
              <div className="p-4">
                <CreatePost onPostCreated={handlePostCreated} autoExpand={true} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCreateButton;

