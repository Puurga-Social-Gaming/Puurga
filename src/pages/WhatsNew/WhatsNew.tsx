import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, Wrench, RefreshCw, TrendingUp, ArrowRight, History
} from 'lucide-react';
import api from '../../lib/axios';

interface ChangelogEntry {
  id: string;
  kind: 'added' | 'fixed' | 'changed' | 'improved';
  version: string | null;
  title: string;
  message: string | null;
  route: string | null;
  created_at: string;
}

const KIND_META: Record<string, { icon: React.ReactNode; label: string; chip: string }> = {
  added: { icon: <Sparkles size={13} />, label: 'Added', chip: 'bg-green-500/15 text-green-400' },
  fixed: { icon: <Wrench size={13} />, label: 'Fixed', chip: 'bg-red-500/15 text-red-400' },
  changed: { icon: <RefreshCw size={13} />, label: 'Changed', chip: 'bg-blue-500/15 text-blue-400' },
  improved: { icon: <TrendingUp size={13} />, label: 'Improved', chip: 'bg-violet-500/15 text-violet-400' },
};

const WhatsNew: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/changelog');
        if (!cancelled) setEntries(res.data?.entries || []);
      } catch (error) {
        console.error('Error loading changelog:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <div className="w-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border -mx-[var(--page-shell-pad-x,20px)] px-[var(--page-shell-pad-x,20px)]">
        <div className="py-3 sm:py-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-theme-sm">
            <Sparkles size={16} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground">{t('whatsNew.title')}</h1>
            <p className="text-xs text-muted">{t('whatsNew.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="py-3 sm:py-4">
        {loading ? (
          <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-12 text-center text-muted">
            {t('common.loading')}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-12 text-center text-muted">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background">
              <History size={20} className="text-muted-light" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t('whatsNew.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const meta = KIND_META[entry.kind] || KIND_META.changed;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border/60 bg-card/50 p-3.5 transition-colors hover:bg-card/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        {entry.version && (
                          <span className="rounded-md bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted border border-border/60">
                            v{entry.version}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-light">{formatDate(entry.created_at)}</span>
                      </div>
                      <h2 className="text-[14px] font-semibold text-foreground mt-1.5 leading-snug">{entry.title}</h2>
                      {entry.message && (
                        <p className="text-[12.5px] text-muted leading-relaxed mt-1">{entry.message}</p>
                      )}
                    </div>
                    {entry.route && (
                      <button
                        onClick={() => navigate(entry.route!)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
                      >
                        {t('whatsNew.tryIt')}
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsNew;
