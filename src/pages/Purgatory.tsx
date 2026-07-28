import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Ghost,
  Upload,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSurvival } from '../context/SurvivalContext';
import type { PurgatoryStatus, RedemptionRequest } from '../types/survival';
import ProfileLink from '../components/Profile/ProfileLink';

type PurgatoryTab = 'status' | 'requests' | 'history';

const TABS: { id: PurgatoryTab; label: string }[] = [
  { id: 'status', label: 'My Status' },
  { id: 'requests', label: 'Requests' },
  { id: 'history', label: 'History' },
];

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
      <div className="flex items-center justify-center min-h-[50vh] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-background text-foreground pb-8"
    >
      {/* Header */}
      <div className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-10 -mx-[var(--page-shell-pad-x,20px)] px-[var(--page-shell-pad-x,20px)]">
        <div className="flex items-center gap-3 py-3.5">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')}
            className="p-2 hover:bg-card-hover rounded-xl transition-colors text-muted hover:text-foreground border border-transparent hover:border-border"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-theme-sm">
            <Ghost size={18} className="text-muted" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Purgatory</h1>
            <p className="text-[11px] text-muted">Social suspension & redemption</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-2 text-sm text-red-500">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-500/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 p-1 rounded-xl bg-card border border-border shadow-theme-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium tracking-wide rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-foreground text-background shadow-theme-sm'
                : 'text-muted hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {/* STATUS */}
        {activeTab === 'status' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-theme-sm">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                    isGhosted
                      ? 'bg-muted/10 border-border'
                      : 'bg-emerald-500/10 border-emerald-500/25'
                  }`}
                >
                  {isGhosted ? (
                    <Ghost size={26} className="text-muted" />
                  ) : (
                    <Shield size={26} className="text-emerald-500" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {isGhosted ? 'Socially Suspended' : 'Active'}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {isGhosted
                      ? `Since ${
                          purgatoryStatus?.purgatory_entered_at
                            ? new Date(purgatoryStatus.purgatory_entered_at).toLocaleDateString()
                            : 'unknown'
                        }`
                      : 'You are not in purgatory'}
                  </p>
                </div>
                <span
                  className={`ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    isGhosted
                      ? 'bg-card-hover text-muted border-border'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  }`}
                >
                  {isGhosted ? 'Ghosted' : 'Safe'}
                </span>
              </div>

              {isGhosted && (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted font-medium">Redemption Progress</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {purgatoryStatus?.redemption_progress ?? 0}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-background rounded-full overflow-hidden border border-border">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${purgatoryStatus?.redemption_progress ?? 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-foreground/80 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted mt-1.5">
                      <span>0%</span>
                      <span>50% self</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {purgatoryStatus?.progressBreakdown && (
                    <div className="space-y-2.5 mb-6 p-4 bg-background rounded-xl border border-border">
                      <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1">
                        Self-Redemption Breakdown
                      </p>
                      {[
                        { label: 'Time Survived', value: purgatoryStatus.progressBreakdown.timeSurvived, max: 20 },
                        { label: 'Daily Login', value: purgatoryStatus.progressBreakdown.dailyLogin, max: 15 },
                        { label: 'Profile Completion', value: purgatoryStatus.progressBreakdown.profileCompletion, max: 15 },
                        { label: 'Email Verified', value: purgatoryStatus.progressBreakdown.emailVerified, max: 20 },
                        { label: 'Spectating', value: purgatoryStatus.progressBreakdown.spectating, max: 10 },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-xs gap-3">
                          <span className="text-muted shrink-0">{item.label}</span>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <div className="w-24 h-1.5 bg-card rounded-full overflow-hidden border border-border">
                              <div
                                className="h-full bg-foreground/60 rounded-full"
                                style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                              />
                            </div>
                            <span className="text-foreground/80 w-10 text-right tabular-nums text-[11px]">
                              {item.value}/{item.max}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2.5 mt-1 flex justify-between text-xs">
                        <span className="text-muted font-medium">Total Self-Redemption</span>
                        <span className="text-foreground font-semibold tabular-nums">
                          {purgatoryStatus.progressBreakdown.total}/50
                        </span>
                      </div>
                    </div>
                  )}

                  {!purgatoryStatus?.redemption_requested ? (
                    <button
                      type="button"
                      onClick={handleRequestRedemption}
                      disabled={requesting}
                      className="w-full py-3 bg-foreground hover:opacity-90 text-background rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-theme-sm"
                    >
                      {requesting ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Upload size={15} />
                      )}
                      {requesting ? 'Submitting…' : 'Request Redemption'}
                    </button>
                  ) : (
                    <div className="p-4 bg-background border border-border rounded-xl text-center">
                      <CheckCircle size={18} className="text-emerald-500 mx-auto mb-1.5" />
                      <p className="text-xs text-foreground font-medium">
                        Redemption requested. Awaiting supporter approval.
                      </p>
                      {purgatoryStatus?.redemption_request_at && (
                        <p className="text-[10px] text-muted mt-1">
                          Requested {new Date(purgatoryStatus.redemption_request_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {!isGhosted && (
                <div className="text-center py-8 px-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <Shield size={28} className="text-emerald-500" />
                  </div>
                  <p className="text-sm text-foreground font-medium">You are not currently in purgatory.</p>
                  <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
                    This is where socially suspended users seek redemption from the community.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-theme-sm">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-3">
                How Redemption Works
              </p>
              <ul className="space-y-3">
                {[
                  'Build up to 50% self-redemption through daily login, time survived, and profile completion.',
                  'Request redemption to become visible to potential supporters.',
                  'A supporter with 100+ credits must approve your request for full recovery.',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-muted leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-semibold text-foreground">
                      {i + 1}
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* REQUESTS */}
        {activeTab === 'requests' && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-theme-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-muted" />
              <h2 className="text-sm font-semibold text-foreground">Pending Redemption Requests</h2>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-muted" />
                </div>
                <p className="text-xs text-muted font-medium">No pending redemption requests.</p>
                <p className="text-[10px] text-muted-light mt-1">
                  Users with 100+ credits can support redemptions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-background border border-border rounded-xl p-3.5 hover:border-highlight transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <ProfileLink username={req.username} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-xs font-semibold text-muted shrink-0">
                        {req.name?.charAt(0)?.toUpperCase() || '?'}
                      </ProfileLink>
                      <div className="flex-1 min-w-0">
                        <ProfileLink username={req.username} className="text-sm font-medium text-foreground truncate hover:text-accent block">
                          {req.name}
                        </ProfileLink>
                        <ProfileLink username={req.username} className="text-[11px] text-muted hover:text-accent block">
                          @{req.username}
                        </ProfileLink>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req.id)}
                        disabled={approvingId === req.id}
                        className="px-3 py-2 bg-foreground text-background hover:opacity-90 rounded-xl text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-theme-sm"
                      >
                        {approvingId === req.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        Approve
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-muted">
                      <span className="px-2 py-1 rounded-lg bg-card border border-border text-center">
                        Progress: {req.redemptionProgress}%
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-card border border-border text-center">
                        Purges: {req.purgeCount}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-card border border-border text-center">
                        Days: {req.daysInPurgatory}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-theme-sm">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-muted" />
              <h2 className="text-sm font-semibold text-foreground">Purgatory History</h2>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mx-auto mb-3">
                  <History size={22} className="text-muted" />
                </div>
                <p className="text-xs text-muted font-medium">No purgatory history recorded.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border"
                  >
                    <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                      {entry.event_type === 'GHOST_ENTERED' ? (
                        <Ghost size={13} className="text-muted" />
                      ) : entry.event_type === 'GHOST_EXITED' ? (
                        <CheckCircle size={13} className="text-emerald-500" />
                      ) : (
                        <AlertTriangle size={13} className="text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium">
                        {entry.event_type === 'GHOST_ENTERED' && 'Entered purgatory'}
                        {entry.event_type === 'GHOST_EXITED' && 'Exited purgatory (redeemed)'}
                        {entry.event_type === 'PURGE_RECEIVED' && 'Received a purge'}
                        {!['GHOST_ENTERED', 'GHOST_EXITED', 'PURGE_RECEIVED'].includes(entry.event_type) &&
                          entry.event_type}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
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
    </motion.div>
  );
};

export default Purgatory;
