import { requireSupabaseAdmin } from '../config/supabase';
import {
  CERTIFICATION_TYPES,
  isPurchasableCertification,
  type CertificationType,
} from '../constants/certifications';
import { DEFAULT_CERT_MONEY_PRICES } from '../constants/paymentMethods';

export type PricingRow = {
  slug: string;
  price_points: number;
  price_cdf: number;
  price_usd: number;
  enabled: boolean;
};

function normalizePricingRow(row: PricingRow): PricingRow {
  // Puurga Official is loyalty/merit only — never sold
  if (row.slug === 'official' || !isPurchasableCertification(row.slug)) {
    return { ...row, price_points: 0, price_cdf: 0, price_usd: 0 };
  }
  return row;
}

export async function loadCertificationPricing(): Promise<PricingRow[]> {
  const supabaseAdmin = requireSupabaseAdmin();
  const defaults: PricingRow[] = CERTIFICATION_TYPES.map((c: CertificationType) => {
    const d = DEFAULT_CERT_MONEY_PRICES[c.slug] || {
      price_points: c.price,
      price_cdf: c.price * 10,
      price_usd: Number((c.price / 250).toFixed(2)),
    };
    return {
      slug: c.slug,
      price_points: d.price_points,
      price_cdf: d.price_cdf,
      price_usd: d.price_usd,
      enabled: true,
    };
  });

  const { data, error } = await supabaseAdmin.from('certification_pricing').select('*');

  if (error) {
    if (/certification_pricing|42P01|42703/i.test(error.message || '')) {
      return defaults.map(normalizePricingRow);
    }
    throw error;
  }

  const bySlug = new Map((data || []).map((r: any) => [r.slug, r]));
  return defaults.map((d: PricingRow) => {
    const row = bySlug.get(d.slug);
    if (!row) return normalizePricingRow(d);
    return normalizePricingRow({
      slug: d.slug,
      price_points: Number(row.price_points ?? d.price_points),
      price_cdf: Number(row.price_cdf ?? d.price_cdf),
      price_usd: Number(row.price_usd ?? d.price_usd),
      enabled: row.enabled !== false,
    });
  });
}

export async function upsertCertificationPricing(
  rows: Array<{
    slug: string;
    price_points: number;
    price_cdf: number;
    price_usd: number;
    enabled?: boolean;
  }>,
  adminId: string
) {
  const supabaseAdmin = requireSupabaseAdmin();
  const payload = rows.map((r) => {
    const free = r.slug === 'official' || !isPurchasableCertification(r.slug);
    return {
      slug: r.slug,
      price_points: free ? 0 : Math.max(0, Math.round(Number(r.price_points) || 0)),
      price_cdf: free ? 0 : Math.max(0, Math.round(Number(r.price_cdf) || 0)),
      price_usd: free ? 0 : Math.max(0, Number(Number(r.price_usd || 0).toFixed(2))),
      enabled: r.enabled !== false,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    };
  });

  const { data, error } = await supabaseAdmin
    .from('certification_pricing')
    .upsert(payload, { onConflict: 'slug' })
    .select('*');

  if (error) {
    if (/certification_pricing|42P01/i.test(error.message || '')) {
      const err: any = new Error(
        'Pricing table missing. Run migration 20260725_certification_pricing_payments.sql'
      );
      err.code = 'CERT_PRICING_MIGRATION_REQUIRED';
      throw err;
    }
    throw error;
  }

  return data || [];
}
