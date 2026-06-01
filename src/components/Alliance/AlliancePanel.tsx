import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, AlertTriangle, X } from 'lucide-react';
import { useSurvival } from '../../context/SurvivalContext';
import { Alliance, PendingAllianceRequest, AllianceSupportAction } from '../../types/survival';
import AllianceCard from './AllianceCard';
import AllianceRequestCard from './AllianceRequestCard';
import RedemptionSupportCard from './RedemptionSupportCard';
import { toast } from 'react-hot-toast';

const AlliancePanel: React.FC = () => {
  const { 
    getAlliances, 
    getPendingAllianceRequests, 
    acceptAlliance, 
    rejectAlliance,
    breakAlliance,
    supportGhostedAlly,
    getSupportHistory 
  } = useSurvival();
  
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingAllianceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupport, setShowSupport] = useState<string | null>(null);
  const [supportHistory, setSupportHistory] = useState<AllianceSupportAction[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alliancesData, requestsData] = await Promise.all([
        getAlliances(),
        getPendingAllianceRequests(),
      ]);
      setAlliances(alliancesData);
      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Error loading alliances:', error);
      toast.error('Failed to load alliances');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    const result = await acceptAlliance(requestId);
    if (result.success) {
      toast.success('Alliance accepted');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to accept alliance');
    }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectAlliance(requestId);
    if (result.success) {
      toast.success('Alliance rejected');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to reject alliance');
    }
  };

  const handleBreak = async (allianceId: string) => {
    if (!confirm('Are you sure you want to break this alliance? This action cannot be undone.')) {
      return;
    }
    const result = await breakAlliance(allianceId);
    if (result.success) {
      toast.success('Alliance broken');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to break alliance');
    }
  };

  const handleSupport = async (allianceId: string, supportType: 'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE') => {
    const result = await supportGhostedAlly(allianceId, supportType);
    if (result.success) {
      toast.success('Support sent to ally');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to support ally');
    }
  };

  const handleShowSupport = async (allianceId: string) => {
    setShowSupport(allianceId);
    const history = await getSupportHistory(allianceId);
    setSupportHistory(history);
  };

  const activeAlliances = alliances.filter(a => a.allianceStatus === 'ACTIVE');
  const brokenAlliances = alliances.filter(a => a.allianceStatus === 'BROKEN' || a.allianceStatus === 'BETRAYED');
  const ghostedAllies = activeAlliances.filter(a => a.partnerGhosted);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2" />
        Loading alliances...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Pending Alliance Requests</h2>
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <AllianceRequestCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ghosted Allies */}
      {ghostedAllies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Ghosted Allies</h2>
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              {ghostedAllies.length}
            </span>
          </div>
          <div className="space-y-3">
            {ghostedAllies.map((alliance) => (
              <div key={alliance.id}>
                <AllianceCard
                  alliance={alliance}
                  onSupport={() => handleShowSupport(alliance.id)}
                  onBreak={handleBreak}
                />
                <AnimatePresence>
                  {showSupport === alliance.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <RedemptionSupportCard
                        partnerName={alliance.name}
                        supportHistory={supportHistory}
                        onSupport={(type) => handleSupport(alliance.id, type)}
                      />
                      <button
                        onClick={() => setShowSupport(null)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-400"
                      >
                        Close support panel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Alliances */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Active Alliances</h2>
          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
            {activeAlliances.length}/5
          </span>
        </div>
        
        {activeAlliances.length === 0 ? (
          <div className="p-6 text-center text-gray-500 border border-gray-700 rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active alliances</p>
            <p className="text-xs mt-1">Form alliances to survive together</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlliances.map((alliance) => (
              <AllianceCard
                key={alliance.id}
                alliance={alliance}
                onBreak={handleBreak}
              />
            ))}
          </div>
        )}
      </div>

      {/* Broken Alliances */}
      {brokenAlliances.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <X className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Broken Alliances</h2>
          </div>
          <div className="space-y-3">
            {brokenAlliances.map((alliance) => (
              <AllianceCard
                key={alliance.id}
                alliance={alliance}
                showActions={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlliancePanel;
