import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Ghost } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';

interface RedeemUserButtonProps {
  userId: string;
  userName: string;
  isGhost: boolean;
  onRedeemed?: () => void;
}

const RedeemUserButton: React.FC<RedeemUserButtonProps> = ({ 
  userId, 
  userName, 
  isGhost,
  onRedeemed 
}) => {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRedeem = async () => {
    setIsRedeeming(true);
    try {
      const response = await api.post(`/api/redeem/${userId}`);
      toast.success(response.data.message);
      setShowConfirm(false);
      if (onRedeemed) {
        onRedeemed();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to redeem user';
      toast.error(errorMsg);
      
      if (error.response?.data?.required && error.response?.data?.current !== undefined) {
        toast.error(`You need ${error.response.data.required} credits but only have ${error.response.data.current}`);
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  if (!isGhost) {
    return null;
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
      >
        <Ghost size={20} />
        <span>Redeem User</span>
        <Coins size={18} />
      </motion.button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-500/20 p-3 rounded-full">
                <Ghost size={24} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Redeem User</h3>
                <p className="text-gray-400 text-sm">Restore account from ghost mode</p>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
              <p className="text-gray-300 text-sm mb-3">
                You are about to redeem <span className="font-semibold text-white">{userName}</span> from ghost mode.
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Cost:</span>
                <div className="flex items-center gap-1 text-orange-400 font-semibold">
                  <Coins size={16} />
                  <span>100 Credits</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-3 mb-4">
              <p className="text-orange-300 text-xs">
                This will restore their account and clear all purges. They will be able to use the app normally again.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isRedeeming}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isRedeeming ? 'Redeeming...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default RedeemUserButton;
