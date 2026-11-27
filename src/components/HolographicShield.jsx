import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FileCode2, KeyRound, Lock, ScanEye, ShieldCheck } from 'lucide-react';

const ORBITAL_ICONS = [
  { id: 'lock', Icon: Lock, label: 'Zero Upload Lock', angleClass: 'orbit-node-1', tone: 'cyan' },
  { id: 'key', Icon: KeyRound, label: 'Ephemeral Pseudonyms', angleClass: 'orbit-node-2', tone: 'violet' },
  { id: 'scan', Icon: ScanEye, label: '7 PII Detectors', angleClass: 'orbit-node-3', tone: 'blue' },
  { id: 'code', Icon: FileCode2, label: 'RFC-4180 CSV Safe', angleClass: 'orbit-node-4', tone: 'teal' },
];

export function HolographicShield() {
  const prefersReduced = useReducedMotion();
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handlePointerMove = (e) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rotateX: Number((-y * 14).toFixed(2)),
      rotateY: Number((x * 16).toFixed(2)),
    });
  };

  const resetTilt = () => setTilt({ rotateX: 0, rotateY: 0 });

  return (
    <div
      className="holo-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      aria-label="Interactive 3D holographic privacy shield"
    >
      <motion.div
        className="holo-3d-rig"
        animate={
          prefersReduced
            ? undefined
            : {
                rotateX: tilt.rotateX,
                rotateY: tilt.rotateY,
              }
        }
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
      >
        <div className="holo-aura" />

        {/* Outer Orbital Ring */}
        <motion.div
          className="orbital-ring orbital-ring-outer"
          animate={prefersReduced ? undefined : { rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        />

        {/* Mid Holographic Ring */}
        <motion.div
          className="orbital-ring orbital-ring-mid"
          animate={prefersReduced ? undefined : { rotate: -360 }}
          transition={{ duration: 19, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner Pulse Ring */}
        <motion.div
          className="orbital-ring orbital-ring-inner"
          animate={
            prefersReduced
              ? undefined
              : { scale: [1, 1.05, 1], opacity: [0.55, 0.9, 0.55] }
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Central 3D Holographic Shield */}
        <motion.div
          className="holo-shield-core"
          animate={prefersReduced ? undefined : { y: [-6, 6, -6] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            viewBox="0 0 180 200"
            className="holo-shield-svg"
            role="img"
            aria-label="Holographic security shield core"
          >
            <defs>
              <linearGradient id="holoShieldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="holoShieldFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(0, 240, 255, 0.24)" />
                <stop offset="55%" stopColor="rgba(59, 130, 246, 0.14)" />
                <stop offset="100%" stopColor="rgba(168, 85, 247, 0.22)" />
              </linearGradient>
            </defs>

            <path
              d="M90 12 L158 38 V96 C158 140 128 172 90 188 C52 172 22 140 22 96 V38 Z"
              fill="url(#holoShieldFill)"
              stroke="url(#holoShieldStroke)"
              strokeWidth="2.5"
            />
            <path
              d="M90 26 L144 47 V95 C144 131 120 158 90 172 C60 158 36 131 36 95 V47 Z"
              fill="none"
              stroke="rgba(0, 240, 255, 0.35)"
              strokeWidth="1.2"
              strokeDasharray="5 5"
            />
          </svg>

          <div className="holo-core-badge">
            <ShieldCheck size={36} strokeWidth={1.9} />
            <span className="mono">RAM SHIELD</span>
          </div>
        </motion.div>

        {/* Floating Privacy Nodes */}
        {ORBITAL_ICONS.map(({ id, Icon, label, angleClass, tone }, idx) => (
          <motion.div
            key={id}
            className={`orbit-float-node ${angleClass} tone-${tone}`}
            title={label}
            animate={
              prefersReduced
                ? undefined
                : { y: [0, idx % 2 === 0 ? -8 : 8, 0] }
            }
            transition={{
              duration: 4 + idx * 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
