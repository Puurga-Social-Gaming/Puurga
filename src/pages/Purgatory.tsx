import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ghost, Upload, Users, AlertTriangle, CheckCircle, XCircle, Loader2, History, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSurvival } from '../context/SurvivalContext';
import type { PurgatoryStatus, RedemptionRequest } from '../types/survival';

type PurgatoryTab = 'status' | 'requests' | 'history';

const Purgatory: React.FC = () => {
  const navigate = useNavigate();
  const {
    survivalState,
    getPurgatoryStatus,
    requestRedemption,
    getRedemptionRequests,
    approveRedemptionRequest,
    getPurgatoryHistory,
  } = useSurvival();

  const [activeTab, setActiveTab] = useState<PurgatoryTab>('status');
  const [purgatoryStatus, setPurgatoryStatus] = useState<PurgatoryStatus | null>(null);
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGhosted = survivalState?.purgatory_status === true;

  const loadStatus = useCallback(async () => {
    const status = await getPurgatoryStatus();
    setPurgatoryStatus(status);
  }, [getPurgatoryStatus]);

  const loadRequests = useCallback(async () => {
    const reqs = await getRedemptionRequests();
    setRequests(reqs);
  }, [getRedemptionRequests]);

  const loadHistory = useCallback(async () => {
    const hist = await getPurgatoryHistory();
    setHistory(hist);
  }, [getPurgatoryHistory]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadRequests(), loadHistory()]);
      setLoading(false);
    };
    load();
  }, [loadStatus, loadRequests, loadHistory]);

  const handleRequestRedemption = async () => {
    setRequesting(true);
    setError(null);
    const result = await requestRedemption();
    if (result.success) {
      await loadStatus();
    } else {
      setError(result.error || 'Failed to request redemption');
    }
    setRequesting(false);
  };

  const handleApproveRequest = async (requestId: string) => {
    setApprovingId(requestId);
    const result = await approveRedemptionRequest(requestId);
    if (!result.success) {
      setError(result.error || 'Failed to approve request');
    }
    await loadRequests();
    setApprovingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300">
      {/* Header */}
      <div className="border-b border-gray-900 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-900 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
        >
          <ArrowLeft size={18} />
        </button>
        <Ghost size={20} className="text-gray-500" />
        <h1 className="text-lg font-semibold text-gray-200 tracking-wide uppercase">Purgatory</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-950/30 border border-red-900/40 rounded-lg flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-400">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-900 px-4">
        {(['status', 'requests', 'history'] as PurgatoryTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-gray-400 text-gray-200'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {tab === 'status' && 'My Status'}
            {tab === 'requests' && 'Redemption Requests'}
            {tab === 'history' && 'History'}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <>
            {/* Current Status Card */}
            <div className="bg-[#0a0a0a] border border-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                  <Ghost size={24} className={isGhosted ? 'text-gray-400' : 'text-gray-600'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">
                    {isGhosted ? 'Socially Suspended' : 'Active'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {isGhosted
                      ? `Since ${purgatoryStatus?.purgatory_entered_at ? new Date(purgatoryStatus.purgatory_entered_at).toLocaleDateString() : 'unknown'}`
                      : 'You are not in purgatory'}
                  </p>
                </div>
              </div>

              {isGhosted && (
                <>
                  {/* Redemption Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">Redemption Progress</span>
                      <span className="text-sm font-medium text-gray-300">{purgatoryStatus?.redemption_progress ?? 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${purgatoryStatus?.redemption_progress ?? 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-gray-600 to-gray-400 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-700 mt-1">
                      <span>0%</span>
                      <span>50% self</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Breakdown */}
                  {purgatoryStatus?.progressBreakdown && (
                    <div className="space-y-2 mb-6 p-3 bg-[#0e0e0e] rounded-lg border border-gray-900">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Self-Redemption Breakdown</p>
                      {[
                        { label: 'Time Survived', value: purgatoryStatus.progressBreakdown.timeSurvived, max: 20 },
                        { label: 'Daily Login', value: purgatoryStatus.progressBreakdown.dailyLogin, max: 15 },
                        { label: 'Profile Completion', value: purgatoryStatus.progressBreakdown.profileCompletion, max: 15 },
                        { label: 'Email Verified', value: purgatoryStatus.progressBreakdown.emailVerified, max: 20 },
                        { label: 'Spectating', value: purgatoryStatus.progressBreakdown.spectating, max: 10 },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-600 rounded-full"
                                style={{ width: `${(item.value / item.max) * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-400 w-8 text-right">{item.value}/{item.max}</span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-gray-900 pt-2 mt-2 flex justify-between text-xs">
                        <span className="text-gray-400 font-medium">Total Self-Redemption</span>
                        <span className="text-gray-200 font-medium">{purgatoryStatus.progressBreakdown.total}/50</span>
                      </div>
                    </div>
                  )}

                  {/* Request Redemption Button */}
                  {!purgatoryStatus?.redemption_requested ? (
                    <button
                      onClick={handleRequestRedemption}
                      disabled={requesting}
                      className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-gray-800"
                    >
                      {requesting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {requesting ? 'Submitting...' : 'Request Redemption'}
                    </button>
                  ) : (
                    <div className="p-3 bg-gray-900/30 border border-gray-800 rounded-lg text-center">
                      <CheckCircle size={16} className="text-gray-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Redemption requested. Awaiting supporter approval.</p>
                      {purgatoryStatus?.redemption_request_at && (
                        <p className="text-[10px] text-gray-600 mt-1">
                          Requested {new Date(purgatoryStatus.redemption_request_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {!isGhosted && (
                <div className="text-center py-6">
                  <Shield size={32} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">You are not currently in purgatory.</p>
                  <p className="text-xs text-gray-700 mt-1">This is where socially suspended users seek redemption.</p>
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="bg-[#0a0a0a] border border-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">How Redemption Works</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="text-gray-700 mt-0.5">1.</span>
                  Build up to 50% self-redemption through daily login, time survived, and profile completion.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-700 mt-0.5">2.</span>
                  Request redemption to become visible to potential supporters.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-700 mt-0.5">3.</span>
                  A supporter with 100+ credits must approve your request for full recovery.
                </li>
              </ul>
            </div>
          </>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="bg-[#0a0a0a] border border-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-gray-500" />
              <h2 className="text-sm font-medium text-gray-300">Pending Redemption Requests</h2>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Users size={24} className="text-gray-800 mx-auto mb-2" />
                <p className="text-xs text-gray-600">No pending redemption requests.</p>
                <p className="text-[10px] text-gray-700 mt-1">Users with 100+ credits can support redemptions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="bg-[#0e0e0e] border border-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-xs text-gray-500">
                        {req.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">{req.name}</p>
                        <p className="text-[10px] text-gray-600">@{req.username}</p>
                      </div>
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        disabled={approvingId === req.id}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1 border border-gray-800"
                      >
                        {approvingId === req.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        Approve
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600">
                      <span>Progress: {req.redemptionProgress}%</span>
                      <span>Purges: {req.purgeCount}</span>
                      <span>Days: {req.daysInPurgatory}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-[#0a0a0a] border border-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-gray-500" />
              <h2 className="text-sm font-medium text-gray-300">Purgatory History</h2>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8">
                <History size={24} className="text-gray-800 mx-auto mb-2" />
                <p className="text-xs text-gray-600">No purgatory history recorded.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry, idx) => (
                  <div key={entry.id || idx} className="flex items-center gap-3 p-2 bg-[#0e0e0e] rounded-lg border border-gray-900">
                    <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                      {entry.event_type === 'GHOST_ENTERED' ? (
                        <Ghost size={12} className="text-gray-500" />
                      ) : entry.event_type === 'GHOST_EXITED' ? (
                        <CheckCircle size={12} className="text-gray-500" />
                      ) : (
                        <AlertTriangle size={12} className="text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">
                        {entry.event_type === 'GHOST_ENTERED' && 'Entered purgatory'}
                        {entry.event_type === 'GHOST_EXITED' && 'Exited purgatory (redeemed)'}
                        {entry.event_type === 'PURGE_RECEIVED' && 'Received a purge'}
                        {!['GHOST_ENTERED', 'GHOST_EXITED', 'PURGE_RECEIVED'].includes(entry.event_type) && entry.event_type}
                      </p>
                      <p className="text-[10px] text-gray-700">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Purgatory;
