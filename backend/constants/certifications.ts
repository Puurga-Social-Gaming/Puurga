/**
 * Shared certification catalog (backend + docs). Keep in sync with src/constants/certifications.ts
 */
export type CertificationSlug = 'blue' | 'gold' | 'business' | 'elite';

export interface CertificationType {
  slug: CertificationSlug | 'official';
  title: string;
  shortTitle: string;
  color: string;
  price: number;
  kind: 'check' | 'logo';
  description: string;
  minPoints?: number;
  minPosts?: number;
  /** If false, badge is loyalty/merit only — never sold */
  purchasable?: boolean;
}

export const CERTIFICATION_TYPES: CertificationType[] = [
  {
    slug: 'blue',
    title: 'Verified Blue',
    shortTitle: 'Blue',
    color: '#1D9BF0',
    price: 500,
    kind: 'check',
    description: 'Classic verified check — trusted creators.',
    minPoints: 500,
    minPosts: 5,
    purchasable: true,
  },
  {
    slug: 'gold',
    title: 'Gold Verified',
    shortTitle: 'Gold',
    color: '#EAB308',
    price: 1500,
    kind: 'check',
    description: 'Premium gold badge for high engagement.',
    minPoints: 2000,
    minPosts: 15,
    purchasable: true,
  },
  {
    slug: 'business',
    title: 'Business',
    shortTitle: 'Business',
    color: '#8B98A5',
    price: 2500,
    kind: 'check',
    description: 'Grey business verification for brands & orgs.',
    minPoints: 3000,
    minPosts: 20,
    purchasable: true,
  },
  {
    slug: 'elite',
    title: 'Elite',
    shortTitle: 'Elite',
    color: '#A855F7',
    price: 4000,
    kind: 'check',
    description: 'Purple elite status for top competitors.',
    minPoints: 5000,
    minPosts: 40,
    purchasable: true,
  },
  {
    slug: 'official',
    title: 'Puurga Official',
    shortTitle: 'Official',
    color: '#F59E0B',
    price: 0,
    kind: 'logo',
    description:
      'Official Puurga logo beside the name — earned by loyalty & merit. Not for sale. Can stack with a premium check.',
    minPoints: 8000,
    minPosts: 50,
    purchasable: false,
  },
];

export const PREMIUM_CHECK_SLUGS = ['blue', 'gold', 'business', 'elite'] as const;

export function isPurchasableCertification(slug?: string | null): boolean {
  const cert = getCertification(slug);
  if (!cert) return false;
  return cert.purchasable !== false && cert.slug !== 'official';
}

export function getCertification(slug?: string | null): CertificationType | null {
  if (!slug) return null;
  return CERTIFICATION_TYPES.find((c) => c.slug === slug) || null;
}
