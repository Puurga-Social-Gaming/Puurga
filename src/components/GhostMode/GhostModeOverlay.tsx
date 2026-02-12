import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, AlertTriangle, Coins, X } from 'lucide-react';

interface GhostModeOverlayProps {
  purgeCount: number;
  ghostedAt: string;
  onRedeemed?: () => void;
}

const FlyingGhost: React.FC<{ delay: number; duration: number; startX: string; startY: string }> = ({ delay, duration, startX, startY }) => (
  <motion.div
    initial={{ x: startX, y: startY, opacity: 0, scale: 0.5 }}
    animate={{
      x: ["-10vw", "110vw"],
      y: [startY, `calc(${startY} - 20vh)`, `calc(${startY} + 20vh)`],
      opacity: [0, 0.8, 0],
      scale: [0.5, 1.2, 0.5],
      rotate: [0, 45, -45, 0]
    }}
    transition={{
      duration: duration,
      delay: delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className="absolute pointer-events-none z-0"
  >
    <Ghost size={48} className="text-gray-500/30 blur-sm" />
  </motion.div>
);

const GhostModeOverlay: React.FC<GhostModeOverlayProps> = ({ purgeCount, ghostedAt }) => {
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      <div className={`fixed inset-0 z-[9999] transition-all duration-500 pointer-events-none`}>
        {/* Background Visuals - Always present but transparent when dismissed */}
        <div className={`absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity duration-500 ${dismissed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`} />

        {/* Flying Ghosts - Always visible, flying around */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FlyingGhost delay={0} duration={15} startX="-10vw" startY="20vh" />
          <FlyingGhost delay={5} duration={18} startX="-10vw" startY="50vh" />
          <FlyingGhost delay={2} duration={20} startX="-10vw" startY="80vh" />
          <FlyingGhost delay={8} duration={12} startX="-10vw" startY="30vh" />
          <FlyingGhost delay={12} duration={25} startX="-10vw" startY="60vh" />
        </div>

        {/* Modal Content - Only visible when NOT dismissed */}
        <AnimatePresence>
          {!dismissed && (
            <div className="relative h-full w-full flex items-center justify-center p-4 pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black border-2 border-gray-700 rounded-2xl p-8 shadow-2xl relative"
              >
                {/* Close/Dismiss Button */}
                <button
                  onClick={() => setDismissed(true)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                  aria-label="Dismiss Instructions"
                >
                  <X size={24} />
                </button>

                {/* Ghost Icon */}
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="bg-gray-800 p-6 rounded-full"
                  >
                    <Ghost size={64} className="text-gray-400" />
                  </motion.div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-center text-gray-300 mb-2">
                  Ghost Mode
                </h1>

                {/* Warning */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <AlertTriangle size={20} className="text-gray-500" />
                  <p className="text-gray-500 text-sm">Account Frozen</p>
                </div>

                {/* Message */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
                  <p className="text-gray-400 text-center text-sm leading-relaxed">
                    Your account has been <span className="text-gray-300 font-semibold">frozen</span> after receiving{' '}
                    <span className="text-red-400 font-bold">{purgeCount} purges</span> from other users.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Purge Count</p>
                    <p className="text-gray-300 text-xl font-bold">{purgeCount}</p>
                  </div>
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Status</p>
                    <p className="text-gray-300 text-xl font-bold">Ghosted</p>
                  </div>
                </div>

                {/* Restrictions */}
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 mb-6">
                  <h3 className="text-gray-300 font-semibold mb-2 text-sm">Restrictions:</h3>
                  <ul className="text-gray-400 text-xs space-y-1">
                    <li>• Cannot create posts</li>
                    <li>• Cannot comment or react</li>
                    <li>• Cannot send messages</li>
                    <li>• Cannot interact with content</li>
                    <li>• Navigation only mode</li>
                  </ul>
                </div>

                {/* Redemption Info */}
                <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-800/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins size={20} className="text-orange-400" />
                    <h3 className="text-gray-300 font-semibold text-sm">How to Get Redeemed:</h3>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Another user with <span className="text-orange-400 font-semibold">100+ credits</span> can redeem your account.
                    Ask a friend to visit your profile and use their credits to restore your account.
                  </p>
                </div>

                {/* Enter Ghost World Button */}
                <button
                  onClick={() => setDismissed(true)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-lg font-semibold transition-colors mb-4"
                >
                  Enter Ghost World (View Only)
                </button>

                {/* Footer */}
                <p className="text-center text-gray-600 text-xs">
                  Ghosted on {new Date(ghostedAt).toLocaleDateString()}
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dark gloomy filter - Always Active */}
        <style>{`
          body {
            filter: grayscale(100%) brightness(0.75) contrast(1.05);
            background: #0a0a0f !important;
          }
        `}</style>
      </div>
    </>
  );
};

export default GhostModeOverlay;
