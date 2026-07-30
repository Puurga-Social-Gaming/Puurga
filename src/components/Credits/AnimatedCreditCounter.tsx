import { useEffect, useRef, useState } from 'react';

interface AnimatedCreditCounterProps {
  value: number;
  className?: string;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCreditCounter({
  value,
  className = '',
  duration = 800,
  decimals = 2,
  prefix = '',
  suffix = '',
}: AnimatedCreditCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animDirection, setAnimDirection] = useState<'up' | 'down' | null>(null);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    const prevValue = prevValueRef.current;
    if (prevValue === value) return;

    prevValueRef.current = value;
    setAnimDirection(value > prevValue ? 'up' : 'down');

    const startTime = performance.now();
    const diff = value - prevValue;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = prevValue + diff * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setAnimDirection(null);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatted = decimals > 0
    ? displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : Math.round(displayValue).toLocaleString();

  return (
    <span
      className={`tabular-nums transition-colors duration-300 ${
        animDirection === 'up'
          ? 'text-green-400'
          : animDirection === 'down'
          ? 'text-red-400'
          : ''
      } ${className}`}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default AnimatedCreditCounter;
