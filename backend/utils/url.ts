import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';

export const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // If it's already an absolute URL, return it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative path, prepend the base URL
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }

  // If it's just a filename, construct the full URL
  return `${BASE_URL}/uploads/${url}`;
};
