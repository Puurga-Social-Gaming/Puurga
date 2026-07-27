import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import ProfileLink from '../Profile/ProfileLink';
import {
  Loader2,
  Users,
  FileText,
  MessageSquare,
  Ghost,
  Gamepad2,
  Globe2,
  UsersRound,
  Activity,
  Layers,
} from 'lucide-react';
import api from '../../lib/axios';

type Range = '7d' | '30d' | '90d';

const CHART_COLORS = [
  '#c9a227',
  '#10b981',
  '#38bdf8',
  '#f97316',
  '#e11d48',
  '#84cc16',
  '#14b8a6',
  '#a3a3a3',
];

const tooltipStyle = {
  background: 'rgb(var(--card))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 12,
  fontSize: 12,
  color: 'rgb(var(--fg))',
};

function useChartTheme() {
  const [theme, setTheme] = useState({
    tick: 'rgb(115 115 115)',
    grid: 'rgb(var(--border) / 0.7)',
    legend: 'rgb(var(--muted))',
  });

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const muted = styles.getPropertyValue('--muted').trim() || '115 115 115';
      const border = styles.getPropertyValue('--border').trim() || '38 38 38';
      setTheme({
        tick: `rgb(${muted})`,
        grid: `rgb(${border} / 0.65)`,
        legend: `rgb(${muted})`,
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  return theme;
}

interface AnalyticsPayload {
  range: string;
  generatedAt?: string;
  overview: Record<string, number>;
  series: Array<{
    date: string;
    label: string;
    users: number;
    posts: number;
    comments: number;
    messages: number;
    purges: number;
    reactions: number;
  }>;
  demographics: {
    byCountry: { name: string; value: number }[];
    byGender: { name: string; value: number }[];
    byLanguage: { name: string; value: number }[];
    byRelationship: { name: string; value: number }[];
    byRole: { name: string; value: number }[];
  };
  engagement: {
    avgCommentsPerPost: number;
    avgReactionsPerPost: number;
    purgeRate: number;
    postsInRange: number;
    commentsInRange: number;
    reactionsInRange: number;
    purgesInRange: number;
  };
  topPosters: Array<{
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    posts_count: number;
  }>;
  games: {
    sessions: number;
    challenges: number;
    matches: number;
    queueSize: number;
    byGame: { name: string; value: number }[];
    challengeStatus: { name: string; value: number }[];
  };
  pageActivity: Array<{ page: string; metric: string; value: number }>;
}

const Metric: React.FC<{
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
}> = ({ label, value, icon: Icon, accent = 'text-accent' }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <Icon size={15} className={accent} />
    </div>
    <p className="text-2xl font-black tracking-tight text-foreground tabular-nums">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
  </div>
);

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
      {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const EmptyChart = () => (
  <div className="h-48 flex items-center justify-center text-xs text-muted">No data yet</div>
);

const SuperAdminAnalytics: React.FC = () => {
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const chartTheme = useChartTheme();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/admin/analytics', { params: { range } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const ov = data?.overview;
  const tick = { fill: chartTheme.tick, fontSize: 10 };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1">
            Live intelligence
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Platform Analytics
          </h2>
          <p className="text-xs text-muted mt-1">
            Dynamic demographics, engagement, games & page activity
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-background-secondary p-1">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                range === r
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-accent" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-500">
          Failed to load analytics
        </div>
      ) : (
        <>
          <div className="sa-metric-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="Citizens" value={ov?.totalUsers || 0} icon={Users} />
            <Metric label="Posts" value={ov?.totalPosts || 0} icon={FileText} accent="text-sky-500" />
            <Metric label="Comments" value={ov?.totalComments || 0} icon={MessageSquare} accent="text-emerald-500" />
            <Metric label="Purges" value={ov?.totalPurges || 0} icon={Ghost} accent="text-rose-500" />
            <Metric label="Messages" value={ov?.totalMessages || 0} icon={MessageSquare} accent="text-teal-500" />
            <Metric label="Groups" value={ov?.totalGroups || 0} icon={Layers} accent="text-lime-600" />
            <Metric label="Game sessions" value={ov?.gameSessions || 0} icon={Gamepad2} accent="text-orange-500" />
            <Metric label="New users" value={ov?.newUsersInRange || 0} icon={Activity} accent="text-accent" />
          </div>

          <ChartCard title="Activity over time" subtitle={`Users, posts, comments, messages & purges · ${range}`}>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series}>
                  <defs>
                    <linearGradient id="saPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9a227" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#c9a227" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="saComments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.legend }} />
                  <Area type="monotone" dataKey="posts" name="Posts" stroke="#c9a227" fill="url(#saPosts)" strokeWidth={2} />
                  <Area type="monotone" dataKey="comments" name="Comments" stroke="#10b981" fill="url(#saComments)" strokeWidth={2} />
                  <Area type="monotone" dataKey="messages" name="Messages" stroke="#38bdf8" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="purges" name="Purges" stroke="#e11d48" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="users" name="New users" stroke="#f97316" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="By country / location" subtitle="From profile country or location">
              {data.demographics.byCountry.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.demographics.byCountry}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {data.demographics.byCountry.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="By gender" subtitle="Profile gender (Not set if unset)">
              {data.demographics.byGender.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.demographics.byGender} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
                      <XAxis type="number" tick={tick} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={70} tick={tick} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Users" radius={[0, 6, 6, 0]} fill="#c9a227" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Language & relationship">
              <div className="space-y-4">
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.demographics.byLanguage.slice(0, 6)}>
                      <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.demographics.byRelationship.slice(0, 6)}>
                      <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Engagement" subtitle="Posts, comments, reactions & purge pressure">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-background-secondary border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Avg comments / post</p>
                  <p className="text-xl font-black text-emerald-500 tabular-nums">{data.engagement.avgCommentsPerPost}</p>
                </div>
                <div className="rounded-xl bg-background-secondary border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Avg reactions / post</p>
                  <p className="text-xl font-black text-sky-500 tabular-nums">{data.engagement.avgReactionsPerPost}</p>
                </div>
                <div className="rounded-xl bg-background-secondary border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Purge rate</p>
                  <p className="text-xl font-black text-rose-500 tabular-nums">{data.engagement.purgeRate}%</p>
                </div>
                <div className="rounded-xl bg-background-secondary border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Posts in range</p>
                  <p className="text-xl font-black text-accent tabular-nums">{data.engagement.postsInRange}</p>
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Posts', value: data.engagement.postsInRange },
                      { name: 'Comments', value: data.engagement.commentsInRange },
                      { name: 'Reactions', value: data.engagement.reactionsInRange },
                      { name: 'Purges', value: data.engagement.purgesInRange },
                    ]}
                  >
                    <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="name" tick={tick} axisLine={false} />
                    <YAxis tick={tick} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {CHART_COLORS.slice(0, 4).map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Games & challenges" subtitle="Sessions, matchmaking, challenge mix">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl border border-border bg-background-secondary px-3 py-2">
                  <p className="text-[10px] text-muted uppercase">Sessions</p>
                  <p className="font-black text-foreground">{data.games.sessions}</p>
                </div>
                <div className="rounded-xl border border-border bg-background-secondary px-3 py-2">
                  <p className="text-[10px] text-muted uppercase">Challenges</p>
                  <p className="font-black text-foreground">{data.games.challenges}</p>
                </div>
                <div className="rounded-xl border border-border bg-background-secondary px-3 py-2">
                  <p className="text-[10px] text-muted uppercase">Matches</p>
                  <p className="font-black text-foreground">{data.games.matches}</p>
                </div>
                <div className="rounded-xl border border-border bg-background-secondary px-3 py-2">
                  <p className="text-[10px] text-muted uppercase">Queue</p>
                  <p className="font-black text-foreground">{data.games.queueSize}</p>
                </div>
              </div>
              {data.games.byGame.length === 0 && data.games.challengeStatus.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.games.byGame.length ? data.games.byGame : data.games.challengeStatus}>
                      <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                      <XAxis dataKey="name" tick={{ ...tick, fontSize: 9 }} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={tick} axisLine={false} width={24} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Page / feature activity" subtitle="Live counts across the app">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pageActivity} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
                    <XAxis type="number" tick={tick} axisLine={false} />
                    <YAxis type="category" dataKey="page" width={100} tick={tick} axisLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any, _n, item: any) => [`${value} ${item?.payload?.metric || ''}`, 'Count']}
                    />
                    <Bar dataKey="value" fill="#c9a227" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Top posters" subtitle="Highest post counts">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.topPosters.length === 0 ? (
                  <EmptyChart />
                ) : (
                  data.topPosters.map((u, i) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background-secondary/60 px-3 py-2.5"
                    >
                      <span className="w-5 text-[11px] font-black text-accent tabular-nums">{i + 1}</span>
                      <ProfileLink username={u.username} className="rounded-full shrink-0">
                        <img
                          src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=1a1a1a&color=c9a227`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-border"
                        />
                      </ProfileLink>
                      <div className="min-w-0 flex-1">
                        <ProfileLink username={u.username} className="text-sm font-semibold text-foreground truncate hover:text-accent block">
                          {u.full_name || u.username}
                        </ProfileLink>
                        <ProfileLink username={u.username} className="text-[11px] text-muted truncate hover:text-accent/80 block">
                          @{u.username}
                        </ProfileLink>
                      </div>
                      <span className="text-xs font-bold text-accent tabular-nums">{u.posts_count} posts</span>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted px-1">
            <Globe2 size={12} />
            <UsersRound size={12} />
            <span>
              Generated {new Date(data.generatedAt || Date.now()).toLocaleString()} · apply migration
              `20260716_profile_demographics.sql` for dedicated gender/country columns
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminAnalytics;
