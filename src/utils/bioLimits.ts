/** Max biography length in characters (letters). */
export const BIO_MAX_LENGTH = 300;

/** Remaining chars when counter turns yellow. */
export const BIO_WARN_REMAINING = 25;

/** Remaining chars when counter turns red. */
export const BIO_DANGER_REMAINING = 10;

export function clampBio(value: string, max = BIO_MAX_LENGTH): string {
  return value.slice(0, max);
}

/** Display bio truncated with ellipsis when over the limit (legacy long bios). */
export function formatBioForDisplay(bio: string | null | undefined, max = BIO_MAX_LENGTH): string {
  const text = (bio || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function bioRemaining(length: number, max = BIO_MAX_LENGTH): number {
  return Math.max(0, max - length);
}

export function bioCounterClass(remaining: number): string {
  if (remaining < BIO_DANGER_REMAINING) return 'text-red-500 font-semibold';
  if (remaining <= BIO_WARN_REMAINING) return 'text-amber-500 font-medium';
  return 'text-muted';
}
