/** Parse post media_url whether stored as JSON array or legacy comma-joined URLs. */
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
        return parsed.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  // Prefer splitting only between absolute URLs (avoids breaking query strings)
  if (/https?:\/\//i.test(raw) && raw.includes(',http')) {
    return raw
      .split(/,(?=https?:\/\/)/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Single URL or simple comma list (legacy local filenames)
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

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.quicktime'];

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const path = new URL(url, 'https://local.invalid').pathname.toLowerCase();
    if (VIDEO_EXTS.some((ext) => path.endsWith(ext))) return true;
  } catch {
    // ignore
  }
  const lower = url.toLowerCase();
  return VIDEO_EXTS.some((ext) => lower.includes(ext));
}

export function fileExtensionForUpload(file: File): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
  };
  if (mimeMap[file.type]) return mimeMap[file.type];
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const subtype = file.type.split('/')[1];
  if (subtype && /^[a-z0-9.+-]{2,12}$/i.test(subtype)) {
    return subtype.replace('quicktime', 'mov').split('+')[0];
  }
  return 'bin';
}
