import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, AlertTriangle, Coins, X } from 'lucide-react';
import FlyingGhost from './FlyingGhost';
import SpiderWebOverlay from './SpiderWebOverlay';
import FloatingParticles from './FloatingParticles';
import ExtraGhosts from './ExtraGhosts';

interface GhostModeOverlayProps {
  purgeCount: number;
  ghostedAt: string;
  onRedeemed?: () => void;
}

const GhostModeOverlay: React.FC<GhostModeOverlayProps> = ({ purgeCount, ghostedAt }) => {
  const [dismissed, setDismissed] = useState(false);

  const ghostSvgs = [
    '/images/ghosts/ghost1.svg',
    '/images/ghosts/ghost2.svg',
    '/images/ghosts/ghost3.svg',
    '/images/ghosts/ghost4.svg',
    '/images/ghosts/ghost5.svg'
  ];

  return (
    <>
      <div className={`fixed inset-0 z-[9999] transition-all duration-500 pointer-events-none`}>
        {/* Background Visuals - Always present but transparent when dismissed */}
        <div className="absolute inset-0 transition-opacity duration-500 opacity-100">
          <div className={`absolute inset-0 bg-black/${dismissed ? '45' : '70'}`} />
          <div className={`absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.06),transparent_55%)] ${dismissed ? 'opacity-45' : 'opacity-65'}`} />
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: dismissed ? 'grayscale(0.95) brightness(0.9) contrast(1.08)' : 'grayscale(1) brightness(0.82) contrast(1.12)'
            }}
          />
          <div className={`ghost-grain absolute inset-0 mix-blend-overlay ${dismissed ? 'opacity-18' : 'opacity-28'}`} />
          <div className={`ghost-vignette absolute inset-0 ${dismissed ? 'opacity-55' : 'opacity-8'}`} />
          <div className={`ghost-flicker absolute inset-0 bg-black/10 ${dismissed ? 'opacity-40' : 'opacity-100'}`} />
        </div>

        {/* Spiderwebs - gothic overlay */}
        <SpiderWebOverlay />

        {/* Flying Ghosts - Always visible throughout ghost mode */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <FlyingGhost id={1} ghostImage={ghostSvgs[0]} size="xlarge" initialY={90} />
          <FlyingGhost id={2} ghostImage={ghostSvgs[1]} size="large" initialY={180} />
          <FlyingGhost id={3} ghostImage={ghostSvgs[2]} size="large" initialY={320} />
          <FlyingGhost id={4} ghostImage={ghostSvgs[3]} size="medium" initialY={420} />
          <FlyingGhost id={5} ghostImage={ghostSvgs[4]} size="medium" initialY={540} />

          <FlyingGhost id={6} ghostImage={ghostSvgs[0]} size="small" initialY={140} />
          <FlyingGhost id={7} ghostImage={ghostSvgs[1]} size="small" initialY={260} />
          <FlyingGhost id={8} ghostImage={ghostSvgs[2]} size="small" initialY={380} />
          <FlyingGhost id={9} ghostImage={ghostSvgs[3]} size="small" initialY={480} />

          <FlyingGhost id={10} ghostImage={ghostSvgs[Math.floor(Math.random() * ghostSvgs.length)]} size="medium" initialY={220} />
          <FlyingGhost id={11} ghostImage={ghostSvgs[Math.floor(Math.random() * ghostSvgs.length)]} size="large" initialY={460} />
        </div>

        {/* Extra Ghosts (emoji fallbacks) - add more variety */}
        <ExtraGhosts count={12} />

        {/* Floating Particles (dust motes) */}
        <FloatingParticles count={60} />

        {/* Modal Content - Only visible when NOT dismissed */}
        <AnimatePresence>
          {!dismissed && (
            <div className="relative h-full w-full flex items-center justify-center p-4 pointer-events-auto z-30">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="max-w-md w-full bg-gradient-to-br from-[#0b0b0b] to-black border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/60 relative"
              >
                {/* Close/Dismiss Button */}
                <button
                  onClick={() => setDismissed(true)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
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
                    className="bg-white/5 border border-white/10 p-6 rounded-full"
                  >
                    <Ghost size={64} className="text-gray-200" />
                  </motion.div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black tracking-tighter uppercase italic text-center text-white mb-2">
                  Ghost Mode
                </h1>

                {/* Warning */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <AlertTriangle size={20} className="text-gray-400" />
                  <p className="text-gray-400 text-sm">Account Frozen</p>
                </div>

                {/* Message */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                  <p className="text-gray-200/80 text-center text-sm leading-relaxed">
                    Your account has been <span className="text-white font-semibold">frozen</span> after receiving{' '}
                    <span className="text-red-300 font-bold">{purgeCount} purges</span> from other users.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">Purge Count</p>
                    <p className="text-white text-xl font-black">{purgeCount}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p className="text-white text-xl font-black">Ghosted</p>
                  </div>
                </div>

                {/* Restrictions */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                  <h3 className="text-white font-semibold mb-2 text-sm">Restrictions:</h3>
                  <ul className="text-gray-200/80 text-xs space-y-1">
                    <li>Cannot create posts</li>
                    <li>Cannot comment or react</li>
                    <li>Cannot send messages</li>
                    <li>Cannot interact with content</li>
                    <li>Navigation only mode</li>
                  </ul>
                </div>

                {/* Redemption Info */}
                <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-500/20 rounded-xl p-4 mb-6">
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
                  className="w-full bg-white/10 hover:bg-white/15 text-white py-3 rounded-xl font-black uppercase tracking-widest transition-colors mb-4"
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

        <style>{`
          .ghost-grain {
            background-image:
              repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 2px),
              repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px);
            animation: ghostGrain 8s steps(10) infinite;
          }
          .ghost-vignette {
            background: radial-gradient(circle at 50% 40%, transparent 42%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.80) 100%);
          }
          .ghost-flicker { animation: ghostFlicker 6.5s infinite; }
          @keyframes ghostFlicker {
            0%, 100% { opacity: 0.18; }
            10% { opacity: 0.08; }
            20% { opacity: 0.22; }
            33% { opacity: 0.12; }
            45% { opacity: 0.28; }
            60% { opacity: 0.10; }
            75% { opacity: 0.24; }
            88% { opacity: 0.14; }
          }
          @keyframes ghostGrain {
            0% { transform: translate3d(0,0,0); }
            20% { transform: translate3d(-1%, 1%, 0); }
            40% { transform: translate3d(1%, -1%, 0); }
            60% { transform: translate3d(-1%, -1%, 0); }
            80% { transform: translate3d(1%, 1%, 0); }
            100% { transform: translate3d(0,0,0); }
          }
        `}</style>
      </div>
    </>
  );
};

export default GhostModeOverlay;
