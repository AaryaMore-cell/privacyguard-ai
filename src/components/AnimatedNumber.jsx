import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Smoothly animates real numeric metrics from previous value to target value.
 * Avoids synchronous setState inside effects and renders immediately when reduced motion is active.
 */
export function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const prefersReduced = useReducedMotion();
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [animatedValue, setAnimatedValue] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const startVal = previousRef.current;
    if (prefersReduced || startVal === target) {
      previousRef.current = target;
      return undefined;
    }

    const duration = 360;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setAnimatedValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousRef.current = target;
        setAnimatedValue(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [prefersReduced, target]);

  const effectiveValue = prefersReduced ? target : animatedValue;
  const formatted =
    decimals > 0
      ? effectiveValue.toFixed(decimals)
      : Math.round(effectiveValue).toLocaleString();

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}
