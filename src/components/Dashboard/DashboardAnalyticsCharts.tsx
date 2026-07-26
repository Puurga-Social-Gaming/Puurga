import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import api from '../../lib/axios';

type Range = '7d' | '30d';

interface Point {
  date: string;
  label: string;
  credits: number;
  posts: number;
  messages: number;
  purges: number;
}

const DashboardAnalyticsCharts: React.FC = () => {
  const [range, setRange] = useState<Range>('7d');
  const [series, setSeries] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/dashboard/analytics', { params: { range } })
      .then((res) => {
        if (!cancelled) setSeries(res.data.series || []);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/50 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">Analytics</h2>
          <p className="text-xs text-muted mt-0.5">Activity over time</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-background/60">
          {(['7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                range === r ? 'bg-accent text-black' : 'text-muted hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : series.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">No analytics data yet</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-52 sm:h-60 w-full min-w-0">
            <p className="text-[11px] text-muted mb-2 uppercase tracking-wide">Credits delta</p>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={32} />
                <Tooltip />
                <Line type="monotone" dataKey="credits" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-52 sm:h-60 w-full min-w-0">
            <p className="text-[11px] text-muted mb-2 uppercase tracking-wide">Engagement</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="posts" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="messages" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purges" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAnalyticsCharts;
