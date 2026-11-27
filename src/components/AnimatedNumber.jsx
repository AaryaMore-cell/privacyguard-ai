import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Smoothly animates real numeric metrics from previous value to target value.
 */
export function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const prefersReduced = useReducedMotion();
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [displayValue, setDisplayValue] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const startVal = previousRef.current;
    if (prefersReduced || startVal === target) {
      previousRef.current = target;
      setDisplayValue(target);
      return undefined;
    }

    const duration = 380;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousRef.current = target;
        setDisplayValue(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [prefersReduced, target]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString();

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}
