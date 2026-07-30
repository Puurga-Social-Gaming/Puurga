import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import SupabaseImage from '../UI/SupabaseImage';
import SupabaseVideo from '../UI/SupabaseVideo';
import { isVideoUrl } from '../../utils/mediaUrls';

interface PostMediaGalleryProps {
  media: string[];
  playingVideoId: string | null;
  onVideoClick: (url: string) => void;
  /** @deprecated Gallery opens its own viewer; kept for API compatibility */
  onMediaClick?: (url: string, isVideo: boolean) => void;
}

const MediaTile: React.FC<{
  url: string;
  index: number;
  className?: string;
  imgClassName?: string;
  /** When false, media sizes intrinsically (profile-style single image) */
  fill?: boolean;
  playingVideoId: string | null;
  onVideoClick: (url: string) => void;
  onOpen: (index: number) => void;
  overlay?: React.ReactNode;
}> = ({
  url,
  index,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  fill = true,
  playingVideoId,
  onVideoClick,
  onOpen,
  overlay,
}) => {
  const video = isVideoUrl(url);
  const frameClass = fill ? 'absolute inset-0' : 'relative block w-full';

  return (
    <div className={`relative overflow-hidden bg-background/50 ${className}`}>
      {video ? (
        <div
          className={`${frameClass} cursor-pointer`}
          onClick={() => onOpen(index)}
          onDoubleClick={() => onVideoClick(url)}
        >
          <SupabaseVideo
            src={url}
            controls={playingVideoId === url}
            muted={playingVideoId !== url}
            playsInline
            autoPlay={playingVideoId === url}
            className={imgClassName}
          />
          {playingVideoId !== url && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(index)}
          className={`${frameClass} cursor-pointer`}
          aria-label={`Open image ${index + 1}`}
        >
          <SupabaseImage
            src={url}
            alt={`Post image ${index + 1}`}
            className={`${imgClassName} transition-opacity hover:opacity-95`}
          />
        </button>
      )}
      {overlay}
    </div>
  );
};

/** Fullscreen swipe / browse viewer */
export const PostMediaViewer: React.FC<{
  media: string[];
  startIndex: number;
  onClose: () => void;
}> = ({ media, startIndex, onClose }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(startIndex);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Wait a frame so layout has width
    const id = requestAnimationFrame(() => {
      const slide = el.children[startIndex] as HTMLElement | undefined;
      if (slide) {
        el.scrollLeft = slide.offsetLeft;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [startIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const el = scrollerRef.current;
      if (!el) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const slides = Array.from(el.children) as HTMLElement[];
        const scrollMid = el.scrollLeft + el.clientWidth / 2;
        let current = 0;
        let bestDist = Infinity;
        slides.forEach((slide, index) => {
          const mid = slide.offsetLeft + slide.clientWidth / 2;
          const dist = Math.abs(mid - scrollMid);
          if (dist < bestDist) {
            bestDist = dist;
            current = index;
          }
        });
        const next =
          e.key === 'ArrowRight'
            ? Math.min(media.length - 1, current + 1)
            : Math.max(0, current - 1);
        const slide = slides[next];
        if (slide) {
          el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
          setActive(next);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [media.length, onClose]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const slides = Array.from(el.children) as HTMLElement[];
      if (!slides.length) return;
      const scrollMid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((slide, index) => {
        const mid = slide.offsetLeft + slide.clientWidth / 2;
        const dist = Math.abs(mid - scrollMid);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      setActive(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (!slide) return;
    el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    setActive(index);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black/35 backdrop-blur-[1px] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0 z-10 drop-shadow-md">
        <span className="text-sm font-semibold tabular-nums">
          {active + 1} / {media.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-black/25 hover:bg-black/45 transition-colors"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollerRef}
          className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {media.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="w-full min-w-full h-full shrink-0 snap-center flex items-center justify-center px-3 box-border bg-transparent"
              onClick={onClose}
            >
              {isVideoUrl(url) ? (
                <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
                  <SupabaseVideo
                    src={url}
                    controls
                    muted={false}
                    playsInline
                    className="max-w-full max-h-full rounded-lg"
                  />
                </div>
              ) : (
                <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
                  <SupabaseImage
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg select-none"
                    style={{ maxHeight: 'calc(100vh - 8rem)' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {active > 0 && (
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            aria-label="Previous"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {active < media.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            aria-label="Next"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 px-4 py-4 shrink-0">
        {media.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === active ? 'w-5 bg-white' : 'w-1.5 bg-white/35'
            }`}
            aria-label={`Go to ${index + 1}`}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

const GridFour: React.FC<{
  media: string[];
  extraCount?: number;
  playingVideoId: string | null;
  onVideoClick: (url: string) => void;
  onOpen: (index: number) => void;
}> = ({ media, extraCount = 0, playingVideoId, onVideoClick, onOpen }) => {
  const visible = media.slice(0, 4);

  return (
    <div className="mt-2.5 w-full grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
      {visible.map((url, index) => {
        const isLast = index === 3;
        const showPlus = isLast && extraCount > 0;

        return (
          <MediaTile
            key={`${url}-${index}`}
            url={url}
            index={index}
            className="relative w-full aspect-square"
            playingVideoId={playingVideoId}
            onVideoClick={onVideoClick}
            onOpen={showPlus ? () => onOpen(4) : onOpen}
            overlay={
              showPlus ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(4);
                  }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 hover:bg-black/60 transition-colors cursor-pointer"
                  aria-label={`View ${extraCount} more images`}
                >
                  <span className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
                    +{extraCount}
                  </span>
                </button>
              ) : null
            }
          />
        );
      })}
    </div>
  );
};

/**
 * Social-standard post media:
 * 1–4 grids; 5+ shows +N; any click opens fullscreen swipe viewer
 */
const PostMediaGallery: React.FC<PostMediaGalleryProps> = ({
  media,
  playingVideoId,
  onVideoClick,
}) => {
  const [viewerStart, setViewerStart] = useState<number | null>(null);

  if (!media.length) return null;

  const count = media.length;
  const openAt = (index: number) => setViewerStart(Math.max(0, Math.min(index, count - 1)));
  const tileProps = { playingVideoId, onVideoClick, onOpen: openAt };

  return (
    <>
      {count === 1 && (
        <div className="mt-2.5 w-full overflow-hidden rounded-lg">
          <MediaTile
            url={media[0]}
            index={0}
            fill={false}
            className="relative w-full"
            imgClassName="w-full h-52 sm:h-64 object-cover"
            {...tileProps}
          />
        </div>
      )}

      {count === 2 && (
        <div className="mt-2.5 w-full grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
          {media.map((url, index) => (
            <MediaTile
              key={`${url}-${index}`}
              url={url}
              index={index}
              className="relative w-full aspect-square"
              {...tileProps}
            />
          ))}
        </div>
      )}

      {count === 3 && (
        <div className="mt-2.5 w-full aspect-square grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-lg">
          <MediaTile url={media[0]} index={0} className="relative row-span-2 min-h-0" {...tileProps} />
          <MediaTile url={media[1]} index={1} className="relative min-h-0" {...tileProps} />
          <MediaTile url={media[2]} index={2} className="relative min-h-0" {...tileProps} />
        </div>
      )}

      {count === 4 && <GridFour media={media} {...tileProps} />}

      {count >= 5 && (
        <GridFour media={media} extraCount={count - 4} {...tileProps} />
      )}

      {viewerStart !== null && (
        <PostMediaViewer
          media={media}
          startIndex={viewerStart}
          onClose={() => setViewerStart(null)}
        />
      )}
    </>
  );
};

export default PostMediaGallery;
