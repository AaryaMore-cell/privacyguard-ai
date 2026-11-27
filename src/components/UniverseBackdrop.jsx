import { motion, useReducedMotion } from 'motion/react';

const PARTICLES = [
  { id: 'p1', left: '8%', top: '16%', size: 4, delay: 0, duration: 7, color: 'cyan' },
  { id: 'p2', left: '21%', top: '72%', size: 3, delay: 1.2, duration: 9, color: 'violet' },
  { id: 'p3', left: '34%', top: '28%', size: 5, delay: 0.6, duration: 8, color: 'blue' },
  { id: 'p4', left: '49%', top: '84%', size: 3, delay: 2.1, duration: 10, color: 'cyan' },
  { id: 'p5', left: '63%', top: '19%', size: 4, delay: 0.4, duration: 7.5, color: 'violet' },
  { id: 'p6', left: '76%', top: '58%', size: 5, delay: 1.8, duration: 8.5, color: 'cyan' },
  { id: 'p7', left: '88%', top: '24%', size: 3, delay: 0.9, duration: 9.5, color: 'blue' },
  { id: 'p8', left: '92%', top: '78%', size: 4, delay: 1.5, duration: 7.8, color: 'violet' },
  { id: 'p9', left: '14%', top: '46%', size: 3, delay: 2.4, duration: 8.8, color: 'cyan' },
  { id: 'p10', left: '55%', top: '42%', size: 4, delay: 0.3, duration: 9.2, color: 'blue' },
];

export function UniverseBackdrop() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="universe-backdrop" aria-hidden="true">
      <div className="universe-nebula universe-nebula-cyan" />
      <div className="universe-nebula universe-nebula-violet" />
      <div className="universe-nebula universe-nebula-blue" />
      <div className="universe-grid" />

      <div className="universe-particles">
        {PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            className={`cosmic-particle particle-${p.color}`}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
            }}
            animate={
              prefersReduced
                ? undefined
                : {
                    y: [0, -18, 0],
                    opacity: [0.25, 0.85, 0.25],
                    scale: [1, 1.25, 1],
                  }
            }
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
