import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface WelcomeScreenProps {
  username: string;
  onComplete?: () => void;
  minDisplayTime?: number;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  username, 
  onComplete,
  minDisplayTime = 3500 
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, minDisplayTime / 50);

    // Auto-complete after minimum display time
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, minDisplayTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [minDisplayTime, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0f0a0f] to-[#0a0a0a] flex flex-col items-center justify-center z-[10002]"
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center justify-center"
        >
          <PuurgaLogo size={56} className="text-orange-500 animate-pulse" />
          <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 text-center space-y-3"
        >
          <p className="text-gray-400 text-lg font-medium">
            Welcome back
          </p>
          <p className="text-orange-500 text-3xl font-bold tracking-wider">
            {username}
          </p>
        </motion.div>

        {/* Loading progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 w-64 mx-auto"
        >
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-gray-500 text-xs text-center mt-2">
            Loading your feed...
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WelcomeScreen;