import dotenv from 'dotenv';

dotenv.config();

export const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // Convert localhost URLs to relative paths (for local dev compatibility)
  if (url.startsWith('http://localhost:3005/') || url.startsWith('https://localhost:3005/')) {
    return url.replace(/^https?:\/\/localhost:3005/, '');
  }

  // If it's already an absolute URL (Supabase or external), return it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's already a relative path starting with /, return as is
  if (url.startsWith('/')) {
    return url;
  }

  // If it's just a filename, construct relative path
  // This works for both local dev (via proxy) and production (via nginx)
  return `/uploads/${url}`;
};
