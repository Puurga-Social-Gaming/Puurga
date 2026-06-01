import React, { useState, useEffect } from 'react';
import { ExternalLink, Youtube, Play, ImageIcon, Loader2 } from 'lucide-react';
import { getYouTubeThumbnail, formatDisplayUrl, isVideoUrl, isImageUrl } from '../../utils/linkParser';
import api from '../../lib/axios';

interface LinkPreviewProps {
  url: string;
  compact?: boolean;
}

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string | null;
  siteName?: string;
}

const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
};

const LinkPreview: React.FC<LinkPreviewProps> = ({ url, compact = false }) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isVideo = isVideoUrl(url) && !isYouTube;
  const isImage = isImageUrl(url);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      setError(false);

      try {
        if (isYouTube) {
          const thumbnail = getYouTubeThumbnail(url);
          const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
          let videoTitle = 'YouTube Video';
          try {
            const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (oembedRes.ok) {
              const oembed = await oembedRes.json();
              videoTitle = oembed.title || videoTitle;
            }
          } catch {}
          setMetadata({
            title: videoTitle,
            image: thumbnail ?? null,
            siteName: 'YouTube',
          });
          setLoading(false);
          return;
        }

        try {
          const response = await api.post('/links/preview', { url });
          setMetadata(response.data);
        } catch {
          const hostname = new URL(url).hostname;
          setMetadata({
            title: formatDisplayUrl(url),
            siteName: hostname,
          });
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  const hostname = (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } })();

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover hover:underline text-sm font-medium transition-colors"
      >
        <ExternalLink size={12} />
        {formatDisplayUrl(url)}
      </a>
    );
  }

  if (loading) {
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-card animate-pulse">
        <div className="h-44 bg-gray-800/50" />
        <div className="p-4 space-y-3">
          <div className="h-3 w-16 bg-gray-700/50 rounded" />
          <div className="h-4 w-3/4 bg-gray-700/50 rounded" />
          <div className="h-3 w-full bg-gray-700/50 rounded" />
          <div className="h-3 w-2/3 bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block border border-border rounded-xl overflow-hidden bg-card hover:border-accent/30 hover:bg-card-hover transition-all duration-200"
      >
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
            <ExternalLink size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted uppercase tracking-wide mb-0.5">{hostname}</div>
            <div className="text-sm text-foreground font-medium truncate">{formatDisplayUrl(url)}</div>
          </div>
        </div>
      </a>
    );
  }

  const showImage = metadata?.image && !imageError;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border border-border rounded-xl overflow-hidden bg-card hover:border-accent/30 hover:shadow-theme-md transition-all duration-200"
    >
      {isImage ? (
        <div className="relative">
          <img
            src={url}
            alt={metadata?.title || 'Image'}
            className="w-full max-h-96 object-contain bg-black/40"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-[10px] flex items-center gap-1">
            <ImageIcon size={12} />
            Image
          </div>
        </div>
      ) : showImage ? (
        <div className="relative h-44 sm:h-48 bg-gray-900 overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-muted" size={20} />
            </div>
          )}
          <img
            src={metadata.image!}
            alt={metadata.title || 'Link preview'}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          {isYouTube && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110">
                <Youtube size={28} className="text-red-600 ml-0.5" />
              </div>
            </div>
          )}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110">
                <Play size={26} className="text-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : isVideo ? (
        <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110">
            <Play size={26} className="text-white ml-0.5" />
          </div>
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {getFaviconUrl(url) && (
                <img
                  src={getFaviconUrl(url)}
                  alt=""
                  className="w-4 h-4 rounded flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="text-[11px] text-muted uppercase tracking-wider font-medium">
                {metadata?.siteName || hostname}
              </div>
            </div>
            <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">
              {metadata?.title || formatDisplayUrl(url)}
            </h4>
            {metadata?.description && (
              <p className="text-xs text-muted leading-relaxed line-clamp-2">
                {metadata.description}
              </p>
            )}
          </div>
          <ExternalLink size={15} className="text-muted/50 flex-shrink-0 mt-1 group-hover:text-accent transition-colors" />
        </div>
      </div>
    </a>
  );
};

export default LinkPreview;