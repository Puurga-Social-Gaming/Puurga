/**
 * DRC Mobile Money + money price helpers (frontend)
 */

export const RDC_MOBILE_MONEY_NETWORKS = [
  {
    id: 'airtel' as const,
    label: 'Airtel Money',
    shortLabel: 'Airtel',
    color: '#ED1C24',
  },
  {
    id: 'vodacom' as const,
    label: 'M-Pesa (Vodacom)',
    shortLabel: 'M-Pesa',
    color: '#E60000',
  },
  {
    id: 'orange' as const,
    label: 'Orange Money',
    shortLabel: 'Orange',
    color: '#FF7900',
  },
  {
    id: 'africell' as const,
    label: 'Africell Money',
    shortLabel: 'Africell',
    color: '#00A651',
  },
];

export type RdcMobileNetworkId = (typeof RDC_MOBILE_MONEY_NETWORKS)[number]['id'];

export function formatCdf(amount: number): string {
  return `${Number(amount || 0).toLocaleString('fr-CD')} CDF`;
}

export function formatUsd(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function detectCardBrand(number: string): string {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return 'mastercard';
  return 'card';
}
