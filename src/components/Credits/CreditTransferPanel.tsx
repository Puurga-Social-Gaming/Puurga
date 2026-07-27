import React, { useEffect, useState } from 'react';
import { Loader2, Send, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

interface FriendOption {
  id: string;
  username: string;
  full_name?: string;
  name?: string;
}

interface CreditPackage {
  id: string;
  slug: string;
  title: string;
  description: string;
  cost: number;
  reward_label: string;
}

const CreditTransferPanel: React.FC = () => {
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/friends/accepted').catch(() => ({ data: [] })),
      api.get('/credits/packages').catch(() => ({ data: [] })),
      api.get('/credits/transfers').catch(() => ({ data: [] })),
    ]).then(([friendsRes, pkgRes, txRes]) => {
      setFriends(
        (friendsRes.data || []).map((f: any) => ({
          id: f.id,
          username: f.username,
          full_name: f.full_name || f.name,
          name: f.name || f.full_name,
        }))
      );
      setPackages(pkgRes.data || []);
      setTransfers(txRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const sendTransfer = async () => {
    if (!toUserId || amount < 1) return;
    setSending(true);
    try {
      await api.post('/credits/transfer', { toUserId, amount, note });
      toast.success(`Sent ${amount} points`);
      setNote('');
      const txRes = await api.get('/credits/transfers');
      setTransfers(txRes.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const redeemPackage = async (slug: string) => {
    try {
      const res = await api.post(`/credits/packages/${slug}/redeem`);
      toast.success(res.data.reward || 'Package unlocked');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Redeem failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Send size={14} /> Send Purga Points
        </h4>
        <select
          value={toUserId}
          onChange={(e) => setToUserId(e.target.value)}
          className="w-full text-sm rounded-lg border border-border bg-background-secondary px-3 py-2 text-foreground"
        >
          <option value="">Select a friend…</option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>
              {f.full_name || f.name || f.username} (@{f.username})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-24 text-sm rounded-lg border border-border bg-background-secondary px-3 py-2 text-foreground"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 text-sm rounded-lg border border-border bg-background-secondary px-3 py-2 text-foreground"
          />
        </div>
        <button
          type="button"
          disabled={!toUserId || sending}
          onClick={sendTransfer}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>

      {packages.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package size={14} /> In-app packages
          </h4>
          <ul className="space-y-2">
            {packages.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium">{p.title}</p>
                  <p className="text-xs text-muted mt-0.5">{p.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => redeemPackage(p.slug)}
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-background"
                >
                  {p.cost} pts
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="text-xs text-muted space-y-1">
          <p className="font-medium text-foreground">Recent transfers</p>
          {transfers.slice(0, 8).map((t) => (
            <p key={t.id}>
              {t.amount} pts · {new Date(t.created_at).toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreditTransferPanel;
