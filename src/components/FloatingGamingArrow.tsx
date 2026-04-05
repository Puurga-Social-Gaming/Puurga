import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingGamingArrow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = React.useState(false);

  const shouldShow = 
    location.pathname !== '/puurga-games' && 
    !location.pathname.startsWith('/login') &&
    !location.pathname.startsWith('/register') &&
    !location.pathname.startsWith('/forgot-password') &&
    !location.pathname.startsWith('/reset-password');

  const handleClick = () => {
    navigate('/puurga-games');
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className="lg:hidden fixed right-3 top-1/2 -translate-y-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 backdrop-blur-md"
        style={{
          boxShadow: isHovered 
            ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 255, 255, 0.05)' 
            : '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
        aria-label="Go to Arena"
      >
        <Gamepad2 
          size={18} 
          className="text-white/80"
        />
        <span className="text-xs font-medium text-white/90 uppercase tracking-wider hidden sm:inline">
          Arena
        </span>
        <ChevronRight 
          size={14} 
          className="text-white/60"
        />
      </motion.button>
    </AnimatePresence>
  );
};

export default FloatingGamingArrow;

