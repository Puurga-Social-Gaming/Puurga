/**
 * DRC Mobile Money networks + certification money helpers
 */

export const RDC_MOBILE_MONEY_NETWORKS = [
  {
    id: 'airtel',
    label: 'Airtel Money',
    shortLabel: 'Airtel',
    prefixes: ['097', '098', '099'],
    color: '#ED1C24',
  },
  {
    id: 'vodacom',
    label: 'M-Pesa (Vodacom)',
    shortLabel: 'M-Pesa',
    prefixes: ['081', '082', '083'],
    color: '#E60000',
  },
  {
    id: 'orange',
    label: 'Orange Money',
    shortLabel: 'Orange',
    prefixes: ['084', '085', '089'],
    color: '#FF7900',
  },
  {
    id: 'africell',
    label: 'Africell Money',
    shortLabel: 'Africell',
    prefixes: ['090', '091'],
    color: '#00A651',
  },
] as const;

export type RdcMobileNetworkId = (typeof RDC_MOBILE_MONEY_NETWORKS)[number]['id'];

export const DEFAULT_CERT_MONEY_PRICES: Record<
  string,
  { price_points: number; price_cdf: number; price_usd: number }
> = {
  blue: { price_points: 500, price_cdf: 5000, price_usd: 2 },
  gold: { price_points: 1500, price_cdf: 15000, price_usd: 6 },
  business: { price_points: 2500, price_cdf: 25000, price_usd: 10 },
  elite: { price_points: 4000, price_cdf: 40000, price_usd: 15 },
  // Official is loyalty/merit only — never sold
  official: { price_points: 0, price_cdf: 0, price_usd: 0 },
};

export function formatCdf(amount: number): string {
  return `${Number(amount || 0).toLocaleString('fr-CD')} CDF`;
}

export function formatUsd(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function normalizeRdcPhone(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('0')) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(0, 10);
  if (digits.length === 12 && digits.startsWith('243')) return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  if (digits.length >= 9 && digits.length <= 12) {
    const local = digits.startsWith('243') ? `0${digits.slice(3)}` : digits;
    return local.length >= 9 ? local.slice(0, 10) : null;
  }
  return null;
}

export function detectCardBrand(number: string): string {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return 'mastercard';
  return 'card';
}
