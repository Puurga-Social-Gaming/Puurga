/** Parse / serialize post media_url (JSON array preferred; legacy comma-joined supported). */
export function parseMediaUrls(mediaUrl: string | string[] | null | undefined): string[] {
  if (!mediaUrl) return [];
  if (Array.isArray(mediaUrl)) {
    return mediaUrl.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
  }

  const raw = String(mediaUrl).trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  if (/https?:\/\//i.test(raw) && raw.includes(',http')) {
    return raw
      .split(/,(?=https?:\/\/)/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (raw.includes(',') && !/^https?:\/\//i.test(raw)) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return [raw];
}

export function serializeMediaUrls(urls: string[]): string | null {
  const clean = urls.map((u) => u.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return JSON.stringify(clean);
}
