import { motion } from 'motion/react';
import {
  ArrowRight,
  Cpu,
  FileCheck2,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { HolographicShield } from '../components/HolographicShield.jsx';

export function HomePage({ onStartSanitizing, onExploreDemo, onNavigate, isOnline = true }) {
  return (
    <div className="universe-home">
      <section className="spatial-hero" aria-labelledby="universe-hero-title">
        <motion.div
          className="spatial-hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="universe-pill-row">
            <span className="hero-eyebrow">
              <Lock size={14} aria-hidden="true" />
              <span>100% CLIENT-SIDE PROCESSING</span>
            </span>

            <span className="badge-pill offline-pill">
              {isOnline ? <ShieldCheck size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
              <span>{isOnline ? 'Offline-Ready Engine' : 'Running Offline'}</span>
            </span>
          </div>

          <h1 id="universe-hero-title" className="universe-heading">
            Your Data. <span className="universe-heading-cyan">Your Universe.</span>{' '}
            <span className="universe-heading-violet">Your Control.</span>
          </h1>

          <p className="universe-subtitle">
            Intelligent privacy protection that keeps your sensitive information yours.
          </p>

          <p className="universe-subdetail">
            Detect emails, Indian PAN, Aadhaar-format IDs, IPv4/IPv6 addresses, phone numbers, and
            Luhn-validated payment cards directly inside browser RAM—with zero server uploads and
            zero external AI APIs.
          </p>

          <div className="hero-actions">
            <motion.button
              type="button"
              className="btn btn-primary btn-glow"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartSanitizing}
            >
              <Sparkles size={16} aria-hidden="true" />
              <span>Start Sanitizing</span>
              <ArrowRight size={16} aria-hidden="true" />
            </motion.button>

            <motion.button
              type="button"
              className="btn btn-holo"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onExploreDemo}
            >
              <Play size={15} aria-hidden="true" />
              <span>Explore Demo</span>
            </motion.button>
          </div>

          <div className="universe-trust-strip">
            <div className="trust-chip">
              <span className="status-dot-live" aria-hidden="true" />
              <span>Local Browser RAM Execution</span>
            </div>
            <button
              type="button"
              className="trust-chip trust-chip-btn"
              onClick={() => onNavigate('privacy')}
            >
              <Lock size={13} aria-hidden="true" />
              <span>Inspect Privacy Center</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          className="spatial-hero-visual"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <HolographicShield />
        </motion.div>
      </section>

      <section className="orbital-pillars" aria-label="Local processing architecture">
        <motion.article
          className="glass-card pillar-card"
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span className="pillar-icon tone-cyan" aria-hidden="true">
            <FileCheck2 size={20} />
          </span>
          <h3>1. Local File &amp; Text Ingestion</h3>
          <p>
            Paste raw logs or drop <code>.txt</code> / <code>.csv</code> files (up to 5 MB). Strict
            UTF-8 decoding and RFC-4180 CSV preservation run solely inside your browser.
          </p>
        </motion.article>

        <motion.article
          className="glass-card pillar-card"
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span className="pillar-icon tone-blue" aria-hidden="true">
            <Cpu size={20} />
          </span>
          <h3>2. Rule &amp; Luhn Validation</h3>
          <p>
            Deterministic pattern matching, IPv4/v6 octet validation, Luhn mod-10 card checks, and
            priority overlap resolution reject false positives cleanly.
          </p>
        </motion.article>

        <motion.article
          className="glass-card pillar-card"
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span className="pillar-icon tone-violet" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <h3>3. Ephemeral Redaction &amp; Export</h3>
          <p>
            Switch instantaneously between Full Mask, Partial Mask, and in-memory Consistent
            Pseudonymization—then export clean files or zero-PII JSON audit reports.
          </p>
        </motion.article>
      </section>
    </div>
  );
}
