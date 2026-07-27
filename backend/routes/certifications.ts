import express from 'express';
import { supabaseAdmin } from '../config/supabase';
import { supabaseAuth, AuthRequest } from '../middleware/supabaseAuth';
import {
  CERTIFICATION_TYPES,
  getCertification,
  PREMIUM_CHECK_SLUGS,
  isPurchasableCertification,
} from '../constants/certifications';
import {
  RDC_MOBILE_MONEY_NETWORKS,
  normalizeRdcPhone,
  detectCardBrand,
} from '../constants/paymentMethods';
import { CreditService } from '../services/creditService';
import { NotificationService } from '../services/notificationService';
import { loadCertificationPricing } from '../services/certificationPricing';

const router = express.Router();

router.use(supabaseAuth);

const ACTIVE_STATUSES = ['pending', 'paid_pending', 'payment_pending'] as const;

function isActiveStatus(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

function isEligible(
  cert: { minPoints?: number; minPosts?: number },
  points: number,
  posts: number
) {
  const ptsOk = !cert.minPoints || points >= cert.minPoints;
  const postsOk = !cert.minPosts || posts >= cert.minPosts;
  return ptsOk && postsOk;
}

async function getUserStats(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, username, full_name, avatar_url, purga_points, credits, posts_count, certification_slug, logo_certified'
    )
    .eq('id', userId)
    .single();

  if (!profile) return null;

  let postsCount = Number(profile.posts_count || 0);
  if (!postsCount) {
    const { count } = await supabaseAdmin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    postsCount = count || 0;
  }

  const points = Number(profile.purga_points ?? profile.credits ?? 0);
  return { profile, points, postsCount };
}

async function applyCertification(
  userId: string,
  slug: string,
  adminId?: string | null
) {
  const cert = getCertification(slug);
  if (!cert) throw new Error('Invalid certification');

  const update: Record<string, unknown> = {
    certified_at: new Date().toISOString(),
    certified_by: adminId || null,
  };

  if (cert.kind === 'logo' || slug === 'official') {
    update.logo_certified = true;
  } else {
    update.certification_slug = slug;
  }

  const { error } = await supabaseAdmin.from('profiles').update(update).eq('id', userId);
  if (error) {
    if (/certification_slug|logo_certified|certified_at|42703/i.test(error.message || '')) {
      const err: any = new Error('CERT_MIGRATION_REQUIRED');
      err.code = 'CERT_MIGRATION_REQUIRED';
      throw err;
    }
    throw error;
  }
}

/**
 * GET /api/certifications/status
 */
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const stats = await getUserStats(userId);
    if (!stats) return res.status(404).json({ error: 'Profile not found' });

    const { profile, points, postsCount } = stats;

    const { data: reqRows, error: reqErr } = await supabaseAdmin
      .from('certification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (reqErr && /certification_requests|42P01|42703/i.test(reqErr.message || '')) {
      return res.status(503).json({
        error:
          'Certification requests table missing. Run migration 20260725_certification_requests.sql',
        code: 'CERT_REQUESTS_MIGRATION_REQUIRED',
      });
    }
    if (reqErr) throw reqErr;
    const requests = reqRows || [];

    const activeBySlug = new Map(
      requests
        .filter((r) => isActiveStatus(r.status))
        .map((r) => [r.certification_slug, r])
    );

    const pricing = await loadCertificationPricing();
    const pricingBySlug = new Map(pricing.map((p) => [p.slug, p]));

    const catalog = CERTIFICATION_TYPES.map((cert) => {
      const priceRow = pricingBySlug.get(cert.slug);
      const pricePoints = priceRow?.price_points ?? cert.price;
      const priceCdf = priceRow?.price_cdf ?? 0;
      const priceUsd = priceRow?.price_usd ?? 0;
      const enabled = priceRow?.enabled !== false;
      const eligible = isEligible(cert, points, postsCount);
      const owned =
        cert.kind === 'logo'
          ? Boolean(profile.logo_certified)
          : profile.certification_slug === cert.slug;
      const activeRequest = activeBySlug.get(cert.slug) || null;
      const canAfford = points >= pricePoints;

      return {
        ...cert,
        price: pricePoints,
        pricePoints,
        priceCdf,
        priceUsd,
        purchasable: isPurchasableCertification(cert.slug),
        enabled,
        eligible,
        owned,
        canAfford,
        activeRequest: activeRequest
          ? {
              id: activeRequest.id,
              status: activeRequest.status,
              paid: activeRequest.paid,
              amount_paid: activeRequest.amount_paid,
              payment_method: activeRequest.payment_method || null,
              amount_cdf: activeRequest.amount_cdf || 0,
              created_at: activeRequest.created_at,
            }
          : null,
        missing: {
          points: Math.max(0, (cert.minPoints || 0) - points),
          posts: Math.max(0, (cert.minPosts || 0) - postsCount),
        },
      };
    });

    res.json({
      points,
      postsCount,
      current: {
        certification_slug: profile.certification_slug || null,
        logo_certified: Boolean(profile.logo_certified),
      },
      catalog,
      requests,
      paymentMethods: {
        visa: true,
        mobileMoney: RDC_MOBILE_MONEY_NETWORKS,
      },
    });
  } catch (error: any) {
    console.error('certifications/status', error);
    res.status(500).json({ error: error.message || 'Failed to load certification status' });
  }
});

/**
 * POST /api/certifications/request
 * body: { slug, mode: 'review' | 'pay', message? }
 */
router.post('/request', async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const slug = String(req.body?.slug || '').trim();
    const mode = String(req.body?.mode || 'review').trim() as 'review' | 'pay';
    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : null;

    const cert = getCertification(slug);
    if (!cert) return res.status(400).json({ error: 'Invalid certification' });
    if (mode !== 'review' && mode !== 'pay') {
      return res.status(400).json({ error: 'mode must be review or pay' });
    }

    const stats = await getUserStats(userId);
    if (!stats) return res.status(404).json({ error: 'Profile not found' });
    const { profile, points, postsCount } = stats;

    const alreadyOwned =
      cert.kind === 'logo'
        ? Boolean(profile.logo_certified)
        : profile.certification_slug === cert.slug;
    if (alreadyOwned) {
      return res.status(400).json({ error: 'You already have this certification' });
    }

    if (cert.kind === 'check' && profile.certification_slug) {
      const order = PREMIUM_CHECK_SLUGS as readonly string[];
      const currentIdx = order.indexOf(profile.certification_slug);
      const nextIdx = order.indexOf(slug);
      if (currentIdx >= 0 && nextIdx >= 0 && nextIdx < currentIdx) {
        return res.status(400).json({
          error:
            'You already hold a higher premium check. Choose Elite or keep your current badge.',
        });
      }
    }

    const { data: existing } = await supabaseAdmin
      .from('certification_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('certification_slug', slug)
      .in('status', [...ACTIVE_STATUSES])
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: 'You already have an open request for this certification',
        requestId: existing.id,
      });
    }

    const pricing = await loadCertificationPricing();
    const priceRow = pricing.find((p) => p.slug === slug);
    if (priceRow && priceRow.enabled === false) {
      return res.status(400).json({ error: 'This certification is currently unavailable' });
    }
    const pricePoints = priceRow?.price_points ?? cert.price;

    const eligible = isEligible(cert, points, postsCount);
    let paid = false;
    let amountPaid = 0;
    let status: 'pending' | 'paid_pending' | 'approved' = 'pending';
    let newBalance = points;

    if (mode === 'pay') {
      if (!isPurchasableCertification(slug)) {
        return res.status(400).json({
          error: 'Puurga Official is earned by loyalty — it cannot be purchased.',
        });
      }
      if (points < pricePoints) {
        return res.status(402).json({
          error: `Insufficient points. Need ${pricePoints.toLocaleString()} pts.`,
          required: pricePoints,
          balance: points,
        });
      }

      const deduct = await CreditService.deductCredits(
        userId,
        pricePoints,
        'certification',
        `Certification purchase: ${cert.title}`
      );
      if (!deduct.success) {
        return res.status(402).json({
          error: 'Payment failed — insufficient points',
          balance: deduct.newBalance,
        });
      }
      paid = true;
      amountPaid = pricePoints;
      newBalance = deduct.newBalance;
      status = eligible ? 'approved' : 'paid_pending';
    }

    if (status === 'approved') {
      try {
        await applyCertification(userId, slug, null);
      } catch (e: any) {
        if (paid && amountPaid > 0) {
          await CreditService.awardCredits(
            userId,
            amountPaid,
            'refund',
            `Refund: failed to apply ${cert.title}`
          );
        }
        if (e?.code === 'CERT_MIGRATION_REQUIRED') {
          return res.status(503).json({
            error:
              'Certification columns missing. Run migration 20260725_user_certifications.sql',
            code: 'CERT_MIGRATION_REQUIRED',
          });
        }
        throw e;
      }
    }

    const { data: created, error: insertErr } = await supabaseAdmin
      .from('certification_requests')
      .insert({
        user_id: userId,
        certification_slug: slug,
        status,
        paid,
        amount_paid: amountPaid,
        payment_method: mode === 'pay' ? 'points' : 'review',
        message,
        reviewed_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertErr) {
      if (/certification_requests|42P01/i.test(insertErr.message || '')) {
        if (paid && amountPaid > 0) {
          await CreditService.awardCredits(
            userId,
            amountPaid,
            'refund',
            `Refund: requests table missing (${cert.title})`
          );
        }
        return res.status(503).json({
          error:
            'Certification requests table missing. Run migration 20260725_certification_requests.sql',
          code: 'CERT_REQUESTS_MIGRATION_REQUIRED',
        });
      }
      if (paid && amountPaid > 0) {
        await CreditService.awardCredits(
          userId,
          amountPaid,
          'refund',
          `Refund: duplicate request (${cert.title})`
        );
      }
      throw insertErr;
    }

    if (status === 'approved') {
      await NotificationService.create({
        type: 'verification',
        receiverId: userId,
        title: 'Certification granted',
        message: `Your ${cert.title} badge is now live.`,
        metadata: { certification_slug: slug, auto: true, paid },
      }).catch(() => null);
    }

    res.status(201).json({
      request: created,
      autoApproved: status === 'approved',
      eligible,
      balance: newBalance,
      message:
        status === 'approved'
          ? `${cert.title} unlocked — your badge is live.`
          : paid
            ? 'Payment received. Super Admin will confirm your eligibility shortly.'
            : 'Request submitted. Super Admin will review your eligibility.',
    });
  } catch (error: any) {
    console.error('certifications/request', error);
    res.status(500).json({ error: error.message || 'Failed to submit request' });
  }
});

/**
 * POST /api/certifications/purchase-money
 * body: {
 *   slug,
 *   method: 'visa' | 'mobile_money',
 *   network?: airtel|vodacom|orange|africell,
 *   phone?: string,
 *   cardholderName?: string,
 *   cardNumber?: string, // only last4 stored
 *   cardExpiry?: string,
 *   message?: string
 * }
 * Creates a payment_pending order for Super Admin to confirm money received.
 * Full card PAN / CVV are never stored.
 */
router.post('/purchase-money', async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const slug = String(req.body?.slug || '').trim();
    const method = String(req.body?.method || '').trim() as 'visa' | 'mobile_money';
    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : null;

    const cert = getCertification(slug);
    if (!cert) return res.status(400).json({ error: 'Invalid certification' });
    if (!isPurchasableCertification(slug)) {
      return res.status(400).json({
        error: 'Puurga Official is earned by loyalty — it cannot be purchased with money.',
      });
    }
    if (method !== 'visa' && method !== 'mobile_money') {
      return res.status(400).json({ error: 'method must be visa or mobile_money' });
    }

    const pricing = await loadCertificationPricing();
    const priceRow = pricing.find((p) => p.slug === slug);
    if (priceRow && priceRow.enabled === false) {
      return res.status(400).json({ error: 'This certification is currently unavailable' });
    }
    const amountCdf = Number(priceRow?.price_cdf ?? 0);
    const amountUsd = Number(priceRow?.price_usd ?? 0);
    if (amountCdf <= 0) {
      return res.status(400).json({ error: 'Money price not configured. Contact Super Admin.' });
    }

    const stats = await getUserStats(userId);
    if (!stats) return res.status(404).json({ error: 'Profile not found' });
    const { profile } = stats;

    const alreadyOwned =
      cert.kind === 'logo'
        ? Boolean(profile.logo_certified)
        : profile.certification_slug === cert.slug;
    if (alreadyOwned) {
      return res.status(400).json({ error: 'You already have this certification' });
    }

    const { data: existing } = await supabaseAdmin
      .from('certification_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('certification_slug', slug)
      .in('status', [...ACTIVE_STATUSES])
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: 'You already have an open request for this certification',
        requestId: existing.id,
      });
    }

    let payment_network: string | null = null;
    let payment_phone: string | null = null;
    let cardholder_name: string | null = null;
    let card_last4: string | null = null;
    let card_brand: string | null = null;

    if (method === 'mobile_money') {
      const network = String(req.body?.network || '').trim();
      const allowed = RDC_MOBILE_MONEY_NETWORKS.map((n) => n.id);
      if (!allowed.includes(network as any)) {
        return res.status(400).json({
          error: 'Choose a RDC network: Airtel Money, M-Pesa, Orange Money or Africell Money',
        });
      }
      const phone = normalizeRdcPhone(String(req.body?.phone || ''));
      if (!phone) {
        return res.status(400).json({ error: 'Enter a valid DRC phone number (ex: 097xxxxxxx)' });
      }
      payment_network = network;
      payment_phone = phone;
    } else {
      const cardholderName = String(req.body?.cardholderName || '').trim();
      const cardNumber = String(req.body?.cardNumber || '').replace(/\D/g, '');
      const cardExpiry = String(req.body?.cardExpiry || '').trim();
      if (cardholderName.length < 2) {
        return res.status(400).json({ error: 'Cardholder name is required' });
      }
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        return res.status(400).json({ error: 'Enter a valid card number' });
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        return res.status(400).json({ error: 'Expiry must be MM/YY' });
      }
      // Never persist full PAN or CVV
      cardholder_name = cardholderName.slice(0, 80);
      card_last4 = cardNumber.slice(-4);
      card_brand = detectCardBrand(cardNumber);
    }

    const payment_reference = `CERT-${slug.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const { data: created, error: insertErr } = await supabaseAdmin
      .from('certification_requests')
      .insert({
        user_id: userId,
        certification_slug: slug,
        status: 'payment_pending',
        paid: true,
        amount_paid: 0,
        payment_method: method,
        payment_network,
        payment_phone,
        amount_cdf: amountCdf,
        amount_usd: amountUsd,
        currency: 'CDF',
        cardholder_name,
        card_last4,
        card_brand,
        payment_reference,
        payment_status: 'submitted',
        message,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertErr) {
      if (/certification_requests|payment_method|amount_cdf|42P01|42703/i.test(insertErr.message || '')) {
        return res.status(503).json({
          error:
            'Payment columns missing. Run migration 20260725_certification_pricing_payments.sql',
          code: 'CERT_PRICING_MIGRATION_REQUIRED',
        });
      }
      throw insertErr;
    }

    await NotificationService.create({
      type: 'verification',
      receiverId: userId,
      title: 'Payment submitted',
      message: `Your ${cert.title} order (${payment_reference}) is awaiting confirmation.`,
      metadata: { certification_slug: slug, payment_reference, method },
    }).catch(() => null);

    res.status(201).json({
      request: created,
      payment_reference,
      amount_cdf: amountCdf,
      amount_usd: amountUsd,
      message:
        method === 'mobile_money'
          ? `Order created. Complete ${amountCdf.toLocaleString()} CDF via Mobile Money. Super Admin will confirm and activate your badge.`
          : `Card order created (${card_brand?.toUpperCase()} •••• ${card_last4}). Super Admin will confirm payment and activate your badge.`,
    });
  } catch (error: any) {
    console.error('certifications/purchase-money', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

/**
 * POST /api/certifications/cancel/:id
 */
router.post('/cancel/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: row, error } = await supabaseAdmin
      .from('certification_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !row) return res.status(404).json({ error: 'Request not found' });
    if (!isActiveStatus(row.status)) {
      return res.status(400).json({ error: 'Only open requests can be cancelled' });
    }
    if (row.paid) {
      return res.status(400).json({
        error: 'Paid requests cannot be cancelled. Wait for Super Admin review.',
      });
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('certification_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updErr) throw updErr;
    res.json({ request: updated });
  } catch (error: any) {
    console.error('certifications/cancel', error);
    res.status(500).json({ error: error.message || 'Failed to cancel request' });
  }
});

export default router;

export async function listCertificationRequests(status?: string) {
  let query = supabaseAdmin
    .from('certification_requests')
    .select(
      '*, profiles:user_id(id, username, full_name, avatar_url, purga_points, posts_count, certification_slug, logo_certified)'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  } else {
    query = query.in('status', ['pending', 'paid_pending', 'payment_pending']);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function reviewCertificationRequest(opts: {
  requestId: string;
  adminId: string;
  action: 'approve' | 'reject';
  adminNote?: string;
}) {
  const { requestId, adminId, action, adminNote } = opts;

  const { data: row, error } = await supabaseAdmin
    .from('certification_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error || !row) {
    const err: any = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  if (!isActiveStatus(row.status)) {
    const err: any = new Error('Request is no longer open');
    err.status = 400;
    throw err;
  }

  const cert = getCertification(row.certification_slug);
  if (!cert) {
    const err: any = new Error('Invalid certification on request');
    err.status = 400;
    throw err;
  }

  if (action === 'approve') {
    await applyCertification(row.user_id, row.certification_slug, adminId);

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('certification_requests')
      .update({
        status: 'approved',
        admin_note: adminNote || null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (updErr) throw updErr;

    await NotificationService.create({
      type: 'verification',
      receiverId: row.user_id,
      title: 'Certification approved',
      message: `Your ${cert.title} badge has been approved.`,
      metadata: { certification_slug: row.certification_slug, requestId },
    }).catch(() => null);

    return updated;
  }

  // reject — refund points only when paid with points
  if (
    row.paid &&
    Number(row.amount_paid) > 0 &&
    (row.payment_method === 'points' || !row.payment_method)
  ) {
    await CreditService.awardCredits(
      row.user_id,
      Number(row.amount_paid),
      'refund',
      `Refund: rejected certification (${cert.title})`
    );
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('certification_requests')
    .update({
      status: 'rejected',
      admin_note: adminNote || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (updErr) throw updErr;

  await NotificationService.create({
    type: 'verification',
    receiverId: row.user_id,
    title: 'Certification declined',
    message: adminNote
      ? `Your ${cert.title} request was declined: ${adminNote}`
      : `Your ${cert.title} request was declined.`,
    metadata: {
      certification_slug: row.certification_slug,
      requestId,
      refunded: Boolean(row.paid),
    },
  }).catch(() => null);

  return updated;
}
