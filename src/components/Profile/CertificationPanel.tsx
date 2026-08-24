import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Loader2,
  Sparkles,
  Wallet,
  FileCheck2,
  CheckCircle2,
  Clock3,
  XCircle,
  Shield,
  CreditCard,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCredits } from '../../utils/formatCredits';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import CertificationBadges from './CertificationBadges';
import CertificationPaymentModal, { type BuyableCert } from './CertificationPaymentModal';
import { formatCertPrice, type CertificationType } from '../../constants/certifications';
import { formatCdf, formatUsd } from '../../constants/paymentMethods';
import Button from '../ui/Button';

type CatalogItem = CertificationType & {
  eligible: boolean;
  owned: boolean;
  canAfford: boolean;
  pricePoints?: number;
  priceCdf?: number;
  priceUsd?: number;
  enabled?: boolean;
  purchasable?: boolean;
  activeRequest: {
    id: string;
    status: string;
    paid: boolean;
    amount_paid: number;
    payment_method?: string | null;
    amount_cdf?: number;
    created_at: string;
  } | null;
  missing: { points: number; posts: number };
};

type RequestRow = {
  id: string;
  certification_slug: string;
  status: string;
  paid: boolean;
  amount_paid: number;
  created_at: string;
  admin_note?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Under review',
  paid_pending: 'Paid · awaiting review',
  payment_pending: 'Money payment · awaiting confirm',
  approved: 'Approved',
  rejected: 'Declined',
  cancelled: 'Cancelled',
};

const CertificationPanel: React.FC = () => {
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [current, setCurrent] = useState<{
    certification_slug: string | null;
    logo_certified: boolean;
  }>({ certification_slug: null, logo_certified: false });
  const [noteBySlug, setNoteBySlug] = useState<Record<string, string>>({});
  const [migrationHint, setMigrationHint] = useState<string | null>(null);
  const [buyCert, setBuyCert] = useState<BuyableCert | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMigrationHint(null);
      const { data } = await api.get('/certifications/status');
      setPoints(Number(data.points || 0));
      setPostsCount(Number(data.postsCount || 0));
      setCatalog(data.catalog || []);
      setRequests(data.requests || []);
      setCurrent(
        data.current || { certification_slug: null, logo_certified: false }
      );
      updateUser({
        credits: Number(data.points || 0),
        purga_points: Number(data.points || 0),
        certificationSlug: data.current?.certification_slug || null,
        logoCertified: Boolean(data.current?.logo_certified),
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || 'Failed to load certifications';
      const code = err?.response?.data?.code;
      if (code === 'CERT_REQUESTS_MIGRATION_REQUIRED' || err?.response?.status === 503) {
        setMigrationHint(msg);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (slug: string, mode: 'review' | 'pay') => {
    setSubmitting(`${slug}:${mode}`);
    try {
      const { data } = await api.post('/certifications/request', {
        slug,
        mode,
        message: noteBySlug[slug]?.trim() || undefined,
      });
      toast.success(data.message || 'Request submitted');
      if (typeof data.balance === 'number') {
        updateUser({ credits: data.balance, purga_points: data.balance });
      }
      if (data.autoApproved) {
        updateUser({
          certificationSlug:
            slug === 'official'
              ? user?.certificationSlug || null
              : slug,
          logoCertified:
            slug === 'official' ? true : Boolean(user?.logoCertified),
        });
      }
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Request failed');
    } finally {
      setSubmitting(null);
    }
  };

  const cancelRequest = async (id: string) => {
    setSubmitting(`cancel:${id}`);
    try {
      await api.post(`/certifications/cancel/${id}`);
      toast.success('Request cancelled');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not cancel');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-accent" size={28} />
        <p className="text-xs text-muted tracking-wide uppercase">Loading verification…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-7"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, var(--accent, #f59e0b) 0, transparent 45%), radial-gradient(circle at 80% 0%, #fff 0, transparent 35%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              <Shield size={14} />
              Puurga Verification
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Get certified
            </h2>
            <p className="text-sm text-muted max-w-xl leading-relaxed">
              Request a review from Super Admin, or pay with points for priority.
              Eligible paid requests unlock instantly when you meet the criteria.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-sm font-semibold text-foreground">Your badges</span>
              <CertificationBadges
                certificationSlug={current.certification_slug}
                logoCertified={current.logo_certified}
                size="md"
              />
              {!current.certification_slug && !current.logo_certified && (
                <span className="text-xs text-muted">None yet</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[200px]">
            <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Balance</p>
              <p className="text-lg font-bold tabular-nums text-accent">
                {formatCredits(points)}
              </p>
              <p className="text-[10px] text-muted">pts</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Posts</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {postsCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted">published</p>
            </div>
          </div>
        </div>

        {migrationHint && (
          <div className="relative mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {migrationHint}
          </div>
        )}
      </motion.section>

      {/* Catalog */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Sparkles size={16} className="text-accent" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Certification catalog
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {catalog.map((cert, idx) => {
            const busyReview = submitting === `${cert.slug}:review`;
            const busyPay = submitting === `${cert.slug}:pay`;
            const open = cert.activeRequest;
            const isMeritOnly =
              cert.purchasable === false || cert.slug === 'official' || cert.kind === 'logo';
            const progressPts = Math.min(
              100,
              Math.round((points / Math.max(cert.minPoints || 1, 1)) * 100)
            );
            const progressPosts = Math.min(
              100,
              Math.round((postsCount / Math.max(cert.minPosts || 1, 1)) * 100)
            );

            return (
              <motion.article
                key={cert.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`rounded-2xl border bg-card p-4 sm:p-5 ${
                  cert.owned
                    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                    : open
                      ? 'border-accent/35'
                      : 'border-border'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {cert.kind === 'logo' ? (
                            <CertificationBadges logoCertified size="md" />
                          ) : (
                            <CertificationBadges certificationSlug={cert.slug} size="md" />
                          )}
                          <h4 className="text-base font-bold text-foreground">{cert.title}</h4>
                          {cert.owned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Owned
                            </span>
                          )}
                          {isMeritOnly && !cert.owned && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 bg-foreground/5 border border-border px-2 py-0.5 rounded-full">
                              Loyalty · not for sale
                            </span>
                          )}
                          {cert.eligible && !cert.owned && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                              Eligible
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-1.5 leading-relaxed">
                          {cert.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isMeritOnly ? (
                          <>
                            <p className="text-sm font-extrabold text-foreground">Merit</p>
                            <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
                              Earned by loyalty
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-extrabold tabular-nums text-foreground">
                              {formatCertPrice(cert.pricePoints ?? cert.price)}
                            </p>
                            {(cert.priceCdf ?? 0) > 0 && (
                              <p className="text-xs font-semibold text-accent tabular-nums mt-0.5">
                                {formatCdf(cert.priceCdf || 0)}
                              </p>
                            )}
                            {(cert.priceUsd ?? 0) > 0 && (
                              <p className="text-[10px] text-muted tabular-nums">
                                {formatUsd(cert.priceUsd || 0)}
                              </p>
                            )}
                            <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
                              Premium check
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-muted mb-1">
                          <span>Points</span>
                          <span className="tabular-nums">
                            {formatCredits(points)} / {formatCredits(cert.minPoints || 0)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-background overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${progressPts}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-muted mb-1">
                          <span>Posts</span>
                          <span className="tabular-nums">
                            {postsCount} / {cert.minPosts || 0}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-background overflow-hidden">
                          <div
                            className="h-full rounded-full bg-foreground/40 transition-all"
                            style={{ width: `${progressPosts}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {!cert.owned && !open && (
                      <textarea
                        value={noteBySlug[cert.slug] || ''}
                        onChange={(e) =>
                          setNoteBySlug((prev) => ({
                            ...prev,
                            [cert.slug]: e.target.value.slice(0, 280),
                          }))
                        }
                        placeholder="Optional note for Super Admin…"
                        rows={2}
                        className="w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    )}

                    {open && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Clock3 size={13} className="text-accent" />
                        <span>{STATUS_LABEL[open.status] || open.status}</span>
                        {open.paid && (
                          <span className="text-accent font-semibold">
                            · Paid {formatCertPrice(open.amount_paid)}
                          </span>
                        )}
                        {!open.paid && (
                          <button
                            type="button"
                            onClick={() => cancelRequest(open.id)}
                            disabled={submitting === `cancel:${open.id}`}
                            className="text-red-400 hover:text-red-300 underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Cancel request
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full lg:w-44 shrink-0">
                    {cert.owned ? (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-center text-xs font-semibold text-emerald-400">
                        Badge active on your profile
                      </div>
                    ) : open ? (
                      <div className="rounded-xl border border-border bg-background/50 px-3 py-3 text-center text-xs text-muted">
                        Waiting for Super Admin
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full gap-1.5 justify-center"
                          disabled={!!submitting}
                          onClick={() => submit(cert.slug, 'review')}
                        >
                          {busyReview ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileCheck2 size={14} />
                          )}
                          {isMeritOnly ? 'Request loyalty review' : 'Request review'}
                        </Button>
                        {!isMeritOnly && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full gap-1.5 justify-center"
                              disabled={!!submitting || !cert.canAfford}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Pay ${formatCertPrice(cert.pricePoints ?? cert.price)} for ${cert.title}?` +
                                      (cert.eligible
                                        ? '\nYou are eligible — badge unlocks instantly after payment.'
                                        : '\nPayment will be held until Super Admin confirms eligibility.')
                                  )
                                ) {
                                  return;
                                }
                                submit(cert.slug, 'pay');
                              }}
                            >
                              {busyPay ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Wallet size={14} />
                              )}
                              Pay {formatCertPrice(cert.pricePoints ?? cert.price)}
                            </Button>
                            {(cert.priceCdf ?? 0) > 0 && (
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full gap-1.5 justify-center"
                                disabled={!!submitting}
                                onClick={() =>
                                  setBuyCert({
                                    slug: cert.slug,
                                    title: cert.title,
                                    kind: cert.kind,
                                    pricePoints: cert.pricePoints ?? cert.price,
                                    priceCdf: cert.priceCdf || 0,
                                    priceUsd: cert.priceUsd || 0,
                                  })
                                }
                              >
                                <CreditCard size={14} />
                                Buy · {formatCdf(cert.priceCdf || 0)}
                              </Button>
                            )}
                            {!cert.canAfford && (
                              <p className="text-[10px] text-center text-muted">
                                Need{' '}
                                {formatCredits((cert.pricePoints ?? cert.price) - points)} more
                                pts
                                {(cert.priceCdf ?? 0) > 0 ? ' — or pay with money' : ''}
                              </p>
                            )}
                          </>
                        )}
                        {isMeritOnly && (
                          <p className="text-[10px] text-center text-muted leading-snug">
                            Awarded for loyalty. Super Admin reviews your activity — no payment.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* History */}
      {requests.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BadgeCheck size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-foreground">Your requests</h3>
          </div>
          <ul className="divide-y divide-border/60">
            {requests.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex items-center gap-2">
                  {r.certification_slug === 'official' ? (
                    <CertificationBadges logoCertified size="sm" />
                  ) : (
                    <CertificationBadges
                      certificationSlug={r.certification_slug}
                      size="sm"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate capitalize">
                      {r.certification_slug}
                    </p>
                    <p className="text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                      {r.paid ? ` · paid ${formatCertPrice(r.amount_paid)}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                    r.status === 'approved'
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : r.status === 'rejected'
                        ? 'text-red-400 border-red-500/30 bg-red-500/10'
                        : 'text-accent border-accent/30 bg-accent/10'
                  }`}
                >
                  {r.status === 'rejected' ? (
                    <XCircle size={11} />
                  ) : r.status === 'approved' ? (
                    <CheckCircle2 size={11} />
                  ) : (
                    <Clock3 size={11} />
                  )}
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {buyCert && (
        <CertificationPaymentModal
          cert={buyCert}
          onClose={() => setBuyCert(null)}
          onSuccess={() => {
            void load();
          }}
        />
      )}
    </div>
  );
};

export default CertificationPanel;
