import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingGamingArrow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = React.useState(false);

  // Don't show on gaming page itself or on login/register pages
  const shouldShow = 
    location.pathname !== '/puurga-games' && 
    !location.pathname.startsWith('/login') &&
    !location.pathname.startsWith('/register') &&
    !location.pathname.startsWith('/forgot-password') &&
    !location.pathname.startsWith('/reset-password');

  const handleClick = () => {
    // Navigate with transition
    navigate('/puurga-games');
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className="lg:hidden fixed right-4 top-1/2 -translate-y-1/2 z-[100] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-black/20 hover:bg-orange-500/30 border-2 border-orange-500/40 hover:border-orange-500"
        style={{
          boxShadow: isHovered 
            ? '0 0 25px rgba(255, 107, 0, 0.8), 0 0 50px rgba(255, 107, 0, 0.6), 0 0 75px rgba(255, 107, 0, 0.4), inset 0 0 20px rgba(255, 107, 0, 0.2)' 
            : '0 0 10px rgba(255, 107, 0, 0.2)',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Go to Games"
      >
        <ChevronLeft 
          size={28} 
          className="text-orange-500 transition-all duration-300"
          style={{
            filter: isHovered 
              ? 'drop-shadow(0 0 12px rgba(255, 107, 0, 1)) drop-shadow(0 0 6px rgba(255, 107, 0, 0.8))' 
              : 'drop-shadow(0 0 4px rgba(255, 107, 0, 0.5))'
          }}
        />
      </motion.button>
    </AnimatePresence>
  );
};

export default FloatingGamingArrow;

