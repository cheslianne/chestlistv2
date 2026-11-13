import React, { useEffect, useState } from 'react';
import { formatPHP } from '../api';

interface CountUpNumberProps {
  centavos: number;
  duration?: number;
  className?: string;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  centavos,
  duration = 900,
  className = '',
}) => {
  const [currentCentavos, setCurrentCentavos] = useState(0);

  useEffect(() => {
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrentCentavos(centavos);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    const targetValue = centavos;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(startValue + (targetValue - startValue) * easeProgress);
      setCurrentCentavos(val);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCurrentCentavos(targetValue);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [centavos, duration]);

  return (
    <span className={`tabular-numbers font-medium ${className}`}>
      {formatPHP(currentCentavos)}
    </span>
  );
};
