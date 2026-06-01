/**
 * Link Parser Utility
 * Detects and parses URLs, hashtags, and mentions in text
 */

export interface ParsedLink {
  url: string;
  displayUrl: string;
  type: 'url' | 'youtube' | 'image' | 'video';
  metadata?: LinkMetadata;
}

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface ParsedHashtag {
  tag: string;
  index: number;
}

export interface ParsedMention {
  username: string;
  index: number;
}

export interface ParsedContent {
  text: string;
  links: ParsedLink[];
  hashtags: ParsedHashtag[];
  mentions: ParsedMention[];
}

/**
 * Detect if a URL is a YouTube link
 */
export const isYouTubeUrl = (url: string): boolean => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
  return youtubeRegex.test(url);
};

/**
 * Extract YouTube video ID from URL
 */
export const getYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

/**
 * Get YouTube thumbnail URL
 */
export const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Detect if a URL is an image
 */
export const isImageUrl = (url: string): boolean => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
  return imageExtensions.test(url);
};

/**
 * Detect if a URL is a video
 */
export const isVideoUrl = (url: string): boolean => {
  const videoExtensions = /\.(mp4|webm|mov|avi|mkv|flv|wmv|ogv)(\?.*)?$/i;
  return videoExtensions.test(url);
};

/**
 * Extract URLs from text
 */
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
};

/**
 * Extract hashtags from text
 */
export const extractHashtags = (text: string): ParsedHashtag[] => {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: ParsedHashtag[] = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push({
      tag: match[1],
      index: match.index,
    });
  }

  return hashtags;
};

/**
 * Extract mentions from text
 */
export const extractMentions = (text: string): ParsedMention[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: ParsedMention[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      index: match.index,
    });
  }

  return mentions;
};

/**
 * Parse content for links, hashtags, and mentions
 */
export const parseContent = (text: string): ParsedContent => {
  const urls = extractUrls(text);
  const hashtags = extractHashtags(text);
  const mentions = extractMentions(text);

  const links: ParsedLink[] = urls.map(url => {
    let type: ParsedLink['type'] = 'url';

    if (isYouTubeUrl(url)) {
      type = 'youtube';
    } else if (isImageUrl(url)) {
      type = 'image';
    } else if (isVideoUrl(url)) {
      type = 'video';
    }

    // Shorten display URL
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;

    return {
      url,
      displayUrl,
      type,
    };
  });

  return {
    text,
    links,
    hashtags,
    mentions,
  };
};

/**
 * Format display URL for preview
 */
export const formatDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url.length > 50 ? url.substring(0, 47) + '...' : url;
  }
};