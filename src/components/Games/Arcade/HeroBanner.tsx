import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Trophy, Sparkles } from 'lucide-react';
import type { GameEntry } from '../../../games/catalog';

interface HeroBannerProps {
  featuredGame: GameEntry | null;
  lastPlayedGame: GameEntry | null;
  lastResult: Record<string, unknown> | null;
  onPlay: (game: GameEntry) => void;
}

const CYBER_RUNNER_VIDEO = 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Gamevids/Cyberrunner.mp4';

const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredGame,
  lastPlayedGame,
  lastResult,
  onPlay,
}) => {
  const { t } = useTranslation();
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const displayGame = featuredGame || lastPlayedGame;
  const isCyberRunner = displayGame?.id === 'cyber-runner';

  useEffect(() => {
    if (bgVideoRef.current && isCyberRunner) {
      bgVideoRef.current.playbackRate = 0.7;
    }
  }, [isCyberRunner]);

  // Desktop: hover to play/stop preview
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (previewVideoRef.current) {
      previewVideoRef.current.play().catch(() => {});
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.currentTime = 0;
    }
  }, []);

  // Mobile: IntersectionObserver to play/stop preview when visible
  useEffect(() => {
    if (isHovering) return; // Desktop hover takes priority
    const video = previewVideoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isHovering]);

  if (!displayGame) return null;

  const showPreviewVideo = isCyberRunner && isHovering;

  return (
    <section
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-border/30"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic blur background */}
      <div className="absolute inset-0">
        {isCyberRunner ? (
          <video
            ref={bgVideoRef}
            src={CYBER_RUNNER_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] transition-opacity duration-500 ${showPreviewVideo ? 'opacity-30' : 'opacity-70'}`}
          />
        ) : (
          <img
            src={displayGame.banner}
            alt=""
            className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/70" />
      </div>

      {/* Hover preview video overlay (desktop: hover, mobile: in viewport) */}
      {isCyberRunner && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${showPreviewVideo ? 'opacity-100' : 'opacity-0'}`}>
          <video
            ref={previewVideoRef}
            src={CYBER_RUNNER_VIDEO}
            muted
            playsInline
            loop
            className="w-full h-full object-cover"
          />
          {/* Vignette overlay on top of preview */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/60 pointer-events-none" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${displayGame.gradient || 'from-orange-600/40 via-red-500/20 to-transparent'} opacity-60 pointer-events-none`} />

      {/* Content */}
      <div className="relative px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
          {/* Game art thumbnail */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="shrink-0"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shadow-black/30">
              <img
                src={displayGame.icon}
                alt={displayGame.name}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {lastPlayedGame && featuredGame && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/30 text-[10px] font-semibold text-orange-400 uppercase tracking-wide">
                  <Sparkles size={10} />
                  {t('games.continuePlaying')}
                </span>
              )}
              {!lastPlayedGame && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/30 text-[10px] font-semibold text-orange-400 uppercase tracking-wide">
                  <Sparkles size={10} />
                  {t('games.featured')}
                </span>
              )}
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl sm:text-2xl md:text-3xl font-black text-foreground leading-tight line-clamp-1"
            >
              {displayGame.name}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xs sm:text-sm text-muted mt-1 line-clamp-2 max-w-lg leading-relaxed"
            >
              {displayGame.description}
            </motion.p>

            {/* Meta row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-3 mt-3"
            >
              {/* Progress bar (if we have last result) */}
              {lastResult && String(lastResult.game) === displayGame.name && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((Number(lastResult.score) || 0) / 1000) * 100)}%` }}
                      transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                    />
                  </div>
                  <span className="text-[10px] text-muted">
                    {t('games.progress')}: {String(lastResult.score ?? 0)} pts
                  </span>
                </div>
              )}

              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock size={12} className="text-muted/70" />
                {displayGame.playTime}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Trophy size={12} className="text-amber-400" />
                +{displayGame.rewardCoins} {t('games.credits')}
              </span>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-3 mt-4"
            >
              <button
                type="button"
                onClick={() => onPlay(displayGame)}
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl
                  bg-gradient-to-r from-orange-600 to-red-600
                  hover:from-orange-500 hover:to-red-500
                  text-white text-sm font-bold
                  shadow-lg shadow-orange-600/25 dark:shadow-orange-600/30
                  hover:shadow-xl hover:shadow-orange-600/30
                  active:scale-95
                  transition-all duration-200"
              >
                <Play size={16} className="fill-white" />
                {t('games.playNow')}
              </button>

              {lastResult && String(lastResult.game) === displayGame.name && (
                <span className="text-xs text-muted">
                  {t('games.lastPlayed')}
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
