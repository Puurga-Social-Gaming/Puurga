import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ghost, AlertTriangle, Coins } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';

interface GhostModeOverlayProps {
  purgeCount: number;
  ghostedAt: string;
  onRedeemed?: () => void;
}

const GhostModeOverlay: React.FC<GhostModeOverlayProps> = ({ purgeCount, ghostedAt, onRedeemed }) => {
  const [redemptionCode, setRedemptionCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedemption = async () => {
    if (!redemptionCode.trim()) {
      toast.error('Please enter a redemption code');
      return;
    }

    setIsRedeeming(true);
    try {
      // This would be called by another user to redeem this account
      toast.error('Redemption must be initiated by another user with credits');
    } catch (error) {
      toast.error('Failed to process redemption');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm">
      {/* Black and white filter overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black opacity-90" />
      
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black border-2 border-gray-700 rounded-2xl p-8 shadow-2xl"
        >
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

          {/* Redemption Code Input (for display only) */}
          <div className="space-y-3">
            <input
              type="text"
              value={redemptionCode}
              onChange={(e) => setRedemptionCode(e.target.value)}
              placeholder="Waiting for redemption..."
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-500 text-center cursor-not-allowed"
            />
            
            <button
              disabled
              className="w-full bg-gray-800 text-gray-600 py-3 rounded-lg font-semibold cursor-not-allowed"
            >
              Waiting for Redemption
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-xs mt-6">
            Ghosted on {new Date(ghostedAt).toLocaleDateString()}
          </p>
        </motion.div>
      </div>

      {/* Grayscale filter for entire screen */}
      <style>{`
        body {
          filter: grayscale(100%);
        }
      `}</style>
    </div>
  );
};

export default GhostModeOverlay;
