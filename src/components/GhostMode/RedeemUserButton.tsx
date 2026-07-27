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
      const response = await api.post(`/redeem/${userId}`);
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
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-theme-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-500/15 p-3 rounded-full border border-amber-500/25">
                <Ghost size={24} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-lg">Redeem User</h3>
                <p className="text-muted text-sm">Restore account from ghost mode</p>
              </div>
            </div>

            <div className="bg-background border border-border rounded-xl p-4 mb-4">
              <p className="text-muted text-sm mb-3">
                You are about to redeem <span className="font-semibold text-foreground">{userName}</span> from ghost mode.
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Cost:</span>
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Coins size={16} />
                  <span>100 Credits</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 mb-4">
              <p className="text-amber-700 dark:text-amber-300 text-xs">
                This will restore their account and clear all purges. They will be able to use the app normally again.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isRedeeming}
                className="flex-1 px-4 py-2.5 bg-card-hover text-foreground border border-border rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="flex-1 px-4 py-2.5 bg-foreground text-background rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50"
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
