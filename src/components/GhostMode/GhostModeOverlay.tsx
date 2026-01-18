import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Coins, X } from 'lucide-react';

interface GhostModeOverlayProps {
  purgeCount: number;
  ghostedAt: string;
  onRedeemed?: () => void;
}

const GhostModeOverlay: React.FC<GhostModeOverlayProps> = ({ purgeCount }) => {
  const [showNotification, setShowNotification] = useState(true);
  const [ghosts, setGhosts] = useState<Array<{
    id: number;
    size: number;
    startX: number;
    startY: number;
    duration: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    // Generate random floating ghosts
    const generateGhosts = () => {
      const ghostCount = 8;
      const newGhosts = Array.from({ length: ghostCount }, (_, i) => ({
        id: i,
        size: Math.random() * 120 + 80, // 80-200px (increased from 40-100px)
        startX: Math.random() * 100, // 0-100%
        startY: Math.random() * 100, // 0-100%
        duration: Math.random() * 20 + 15, // 15-35s
        delay: Math.random() * 10, // 0-10s delay
      }));
      setGhosts(newGhosts);
    };

    generateGhosts();
  }, []);

  return (
    <>
      {/* Blocking overlay - only allows left nav interaction */}
      <div 
        className="fixed inset-0 z-[9999] pointer-events-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.5) 0%, rgba(20, 15, 25, 0.6) 100%)',
          backdropFilter: 'blur(0.5px)'
        }}
      >
        {/* Allow clicks only on left navigation (assuming it's within first 280px) */}
        <div 
          className="absolute left-0 top-0 bottom-0 pointer-events-none"
          style={{ width: '280px' }}
        />
      </div>

      {/* Floating animated ghosts */}
      <div className="fixed inset-0 z-[9997] pointer-events-none overflow-hidden">
        {ghosts.map((ghost) => (
          <motion.div
            key={ghost.id}
            className="absolute"
            initial={{
              left: `${ghost.startX}%`,
              top: `${ghost.startY}%`,
              opacity: 0,
            }}
            animate={{
              left: [`${ghost.startX}%`, `${(ghost.startX + 30) % 100}%`, `${(ghost.startX - 20) % 100}%`],
              top: [`${ghost.startY}%`, `${(ghost.startY - 40) % 100}%`, `${(ghost.startY + 20) % 100}%`],
              opacity: [0, 0.85, 0.7, 0.9, 0],
              rotate: [0, 10, -10, 5, 0],
            }}
            transition={{
              duration: ghost.duration,
              delay: ghost.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: `${ghost.size}px`,
              height: `${ghost.size}px`,
            }}
          >
            <svg
              viewBox="0 0 100 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(180, 180, 200, 0.4)) blur(0.5px)',
              }}
            >
              {/* Wispy ghost form - ethereal and creepy */}
              <defs>
                <filter id={`ghostBlur${ghost.id}`}>
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
                </filter>
                <radialGradient id={`ghostGradient${ghost.id}`}>
                  <stop offset="0%" stopColor="rgba(240, 240, 250, 0.85)" />
                  <stop offset="50%" stopColor="rgba(220, 220, 240, 0.65)" />
                  <stop offset="100%" stopColor="rgba(200, 200, 230, 0.1)" />
                </radialGradient>
              </defs>
              
              {/* Main ghostly form - irregular and wispy */}
              <path
                d="M50 20 Q35 15, 25 30 Q20 45, 22 60 Q18 75, 20 90 Q15 105, 18 120 Q20 135, 25 145 L30 140 Q35 145, 40 138 Q45 142, 50 135 Q55 140, 60 137 Q65 143, 70 140 L75 145 Q78 130, 80 115 Q85 100, 82 85 Q85 70, 80 55 Q78 40, 70 28 Q60 18, 50 20 Z"
                fill={`url(#ghostGradient${ghost.id})`}
                opacity="0.9"
                filter={`url(#ghostBlur${ghost.id})`}
              />
              
              {/* Wispy trails */}
              <ellipse cx="30" cy="80" rx="8" ry="25" fill="rgba(230, 230, 245, 0.25)" opacity="0.6" filter={`url(#ghostBlur${ghost.id})`} />
              <ellipse cx="70" cy="75" rx="7" ry="22" fill="rgba(230, 230, 245, 0.2)" opacity="0.5" filter={`url(#ghostBlur${ghost.id})`} />
              
              {/* Dark hollow eyes - more haunting */}
              <ellipse cx="38" cy="55" rx="4" ry="7" fill="rgba(20, 20, 40, 0.9)" />
              <ellipse cx="62" cy="55" rx="4" ry="7" fill="rgba(20, 20, 40, 0.9)" />
              
              {/* Faint glow around eyes */}
              <ellipse cx="38" cy="55" rx="8" ry="10" fill="rgba(200, 200, 230, 0.15)" filter={`url(#ghostBlur${ghost.id})`} />
              <ellipse cx="62" cy="55" rx="8" ry="10" fill="rgba(200, 200, 230, 0.15)" filter={`url(#ghostBlur${ghost.id})`} />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Spiderwebs in corners */}
      <div className="fixed inset-0 z-[9996] pointer-events-none">
        {/* Top-left spiderweb */}
        <svg
          className="absolute top-0 left-0 w-48 h-48 opacity-40"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M0 0 L80 60" stroke="rgba(200, 200, 220, 0.6)" strokeWidth="1" />
          <path d="M0 20 L75 65" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" />
          <path d="M0 40 L70 70" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" />
          <path d="M20 0 L80 55" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" />
          <path d="M40 0 L85 50" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" />
          <ellipse cx="80" cy="60" rx="25" ry="20" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" fill="none" />
          <ellipse cx="80" cy="60" rx="15" ry="12" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" fill="none" />
          <ellipse cx="80" cy="60" rx="5" ry="4" stroke="rgba(200, 200, 220, 0.3)" strokeWidth="0.5" fill="none" />
        </svg>

        {/* Top-right spiderweb */}
        <svg
          className="absolute top-0 right-0 w-48 h-48 opacity-40"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M200 0 L120 60" stroke="rgba(200, 200, 220, 0.6)" strokeWidth="1" />
          <path d="M200 20 L125 65" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" />
          <path d="M200 40 L130 70" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" />
          <path d="M180 0 L120 55" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" />
          <path d="M160 0 L115 50" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" />
          <ellipse cx="120" cy="60" rx="25" ry="20" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" fill="none" />
          <ellipse cx="120" cy="60" rx="15" ry="12" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" fill="none" />
        </svg>

        {/* Bottom-left spiderweb */}
        <svg
          className="absolute bottom-0 left-0 w-40 h-40 opacity-30"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M0 200 L70 140" stroke="rgba(200, 200, 220, 0.5)" strokeWidth="0.8" />
          <path d="M0 180 L65 145" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" />
          <path d="M20 200 L70 145" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" />
          <ellipse cx="70" cy="140" rx="20" ry="15" stroke="rgba(200, 200, 220, 0.4)" strokeWidth="0.6" fill="none" />
        </svg>
      </div>

      {/* Dismissible notification popup */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10001] max-w-md w-full mx-4"
          >
            <div className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-black border-2 border-purple-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="bg-purple-900/50 p-2 rounded-full">
                    <Ghost size={24} className="text-purple-300" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-purple-200 mb-1">👻 Ghost Mode Active</h3>
                  <p className="text-sm text-gray-300 mb-2">
                    You've been ghosted after receiving <span className="text-red-400 font-bold">{purgeCount} purges</span>. 
                    You can only use navigation. Cannot interact with content.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-purple-300/70">
                    <Coins size={14} className="text-orange-400" />
                    <span>Ask a friend with 100+ credits to redeem you</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="flex-shrink-0 text-purple-300 hover:text-purple-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark gloomy filter */}
      <style>{`
        body {
          filter: grayscale(100%) brightness(0.75) contrast(1.05);
          background: #0a0a0f !important;
        }
      `}</style>
    </>
  );
};

export default GhostModeOverlay;
