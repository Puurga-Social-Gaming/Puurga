import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import api from '../../lib/axios';
import { useWebSocket } from '../../hooks/useWebSocket';
import { format } from 'date-fns';

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'penalty' | string;
  source: string;
  description: string | null;
  created_at: string;
}

const SOURCE_OPTIONS = [
  '',
  'post',
  'like',
  'comment',
  'game',
  'login',
  'daily_bonus',
  'recovery_bonus',
  'inactivity',
  'redeem_user',
  'redeem_friend',
  'refund',
];

interface CreditTransactionHistoryProps {
  compact?: boolean;
}

const CreditTransactionHistory: React.FC<CreditTransactionHistoryProps> = ({ compact = false }) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: pageNum,
          limit: compact ? 8 : 20,
        };
        if (typeFilter) params.type = typeFilter;
        if (sourceFilter) params.source = sourceFilter;

        const res = await api.get('/credits/transactions', { params });
        const rows: CreditTransaction[] = res.data.transactions || [];
        setTransactions((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(Boolean(res.data.hasMore));
        setPage(pageNum);
      } catch (error) {
        console.error('Failed to load credit transactions:', error);
        if (!append) setTransactions([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [compact, typeFilter, sourceFilter]
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  useWebSocket({
    onCreditUpdate: () => {
      void load(1, false);
    },
  });

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-muted" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg bg-background-secondary border border-border text-foreground"
        >
          <option value="">All types</option>
          <option value="earn">Earned</option>
          <option value="penalty">Spent / Penalty</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg bg-background-secondary border border-border text-foreground"
        >
          <option value="">All sources</option>
          {SOURCE_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">No credit transactions yet</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {transactions.map((tx) => {
            const isEarn = tx.type === 'earn' || tx.amount > 0;
            return (
              <li key={tx.id} className="flex items-start justify-between gap-3 py-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`mt-0.5 p-1.5 rounded-lg ${
                      isEarn ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
                    }`}
                  >
                    {isEarn ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {tx.description || tx.source.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {tx.source.replace(/_/g, ' ')} ·{' '}
                      {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    isEarn ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {isEarn ? '+' : ''}
                  {tx.amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => load(page + 1, true)}
          disabled={loadingMore}
          className="w-full text-xs py-2 rounded-lg border border-border text-muted hover:text-foreground hover:bg-card transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
};

export default CreditTransactionHistory;
