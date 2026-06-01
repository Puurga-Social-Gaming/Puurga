import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullPhase, setPullPhase] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isPulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let el = containerRef.current?.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollContainerRef.current = el;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const sc = scrollContainerRef.current;
    if (!sc || refreshingRef.current) return;
    if (sc.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || refreshingRef.current) return;
    const sc = scrollContainerRef.current;
    if (!sc) return;

    if (sc.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      setPullPhase('idle');
      return;
    }

    const currentY = e.touches[0].clientY;
    const raw = Math.max(0, currentY - startY.current);
    const resisted = Math.min(raw * 0.4, threshold * 1.5);

    setPullDistance(resisted);
    setPullPhase(resisted >= threshold ? 'ready' : 'pulling');
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || refreshingRef.current) {
      isPulling.current = false;
      return;
    }

    isPulling.current = false;

    if (pullDistanceRef.current >= threshold) {
      setRefreshing(true);
      setPullPhase('refreshing');
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        setPullPhase('idle');
      }
    } else {
      setPullDistance(0);
      setPullPhase('idle');
    }
  };

  useEffect(() => {
    const sc = scrollContainerRef.current;
    if (!sc) return;

    let wheelTimer: ReturnType<typeof setTimeout>;

    const onWheel = (e: WheelEvent) => {
      if (refreshingRef.current) return;
      if (sc.scrollTop <= 0 && e.deltaY < 0) {
        sc.scrollTop = 0;
        const dist = Math.min(Math.abs(e.deltaY) * 0.3, threshold * 1.5);
        setPullDistance(dist);
        setPullPhase('pulling');

        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          if (pullDistanceRef.current >= threshold) {
            setRefreshing(true);
            setPullPhase('refreshing');
            setPullDistance(threshold);
            onRefresh();
            setTimeout(() => {
              setRefreshing(false);
              setPullDistance(0);
              setPullPhase('idle');
            }, 1000);
          } else {
            setPullDistance(0);
            setPullPhase('idle');
          }
        }, 400);
      }
    };

    sc.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      sc.removeEventListener('wheel', onWheel);
      clearTimeout(wheelTimer);
    };
  }, [threshold, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {(pullPhase !== 'idle' || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: pullDistance,
            minHeight: refreshing ? threshold : 0,
          }}
        >
          {refreshing || pullPhase === 'refreshing' ? (
            <Loader2 size={24} className="animate-spin text-accent" />
          ) : (
            <div
              className="flex flex-col items-center gap-1 text-muted-foreground"
              style={{
                opacity: Math.min(pullDistance / (threshold * 0.6), 1),
              }}
            >
              <ArrowDown
                size={20}
                style={{
                  transform: `rotate(${Math.min(pullDistance / threshold, 1) * 180}deg)`,
                  transition: 'transform 0.2s ease',
                }}
              />
              <span className="text-xs font-medium">
                {pullPhase === 'ready' ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default PullToRefresh;
