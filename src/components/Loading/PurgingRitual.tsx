import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurgingRitualProps {
  message?: string;
  messages?: string[];
}

const PurgingRitual: React.FC<PurgingRitualProps> = ({ 
  message, 
  messages = ['Purging Noise', 'Filtering Truth', 'Removing Corruption'] 
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showMessage, setShowMessage] = useState(true);


  // Rotate messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowMessage(false);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setShowMessage(true);
      }, 500);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  // Generate particle positions
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 4,
  }));

  // Generate scan lines
  const scanLines = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
  }));

  const displayMessage = message || messages[currentMessageIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] bg-[#0D0D0D] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
            initial={{ 
              scale: 0, 
              opacity: 0,
              backgroundColor: '#A3A3A3'
            }}
            animate={{
              scale: [0, 1, 0.5, 0],
              opacity: [0, 0.8, 0.4, 0],
              x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Horizontal scan lines */}
        {scanLines.map((line) => (
          <motion.div
            key={line.id}
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ top: `${20 + line.id * 15}%` }}
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 3,
              delay: line.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}

        {/* Rotating purge rings */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 -translate-x-1/2 -translate-y-1/2"
          style={{ border: '1px solid rgba(163, 163, 163, 0.2)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2"
          style={{ border: '1px solid rgba(163, 163, 163, 0.3)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2"
          style={{ border: '1px solid rgba(163, 163, 163, 0.4)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />

        {/* Central core pulse */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Loading message */}
      <div className="relative z-10 text-center">
        <AnimatePresence mode="wait">
          {showMessage && (
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <h2 className="text-white text-2xl font-light tracking-wider uppercase">
                {displayMessage}
              </h2>
              
              {/* Minimal progress indicator */}
              <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-4 bg-white/40"
                    animate={{
                      opacity: [0.4, 1, 0.4],
                      height: ['16px', '24px', '16px'],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fog-like blur overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 30%, rgba(13, 13, 13, 0.4) 100%)',
        }}
      />
    </motion.div>
  );
};

export default PurgingRitual;
