import { motion } from 'motion/react';
import {
  AlertTriangle,
  Cpu,
  Database,
  EyeOff,
  HardDrive,
  Lock,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

export function Privacy({ isOnline = true }) {
  const storageKeysCount =
    typeof window !== 'undefined'
      ? (window.localStorage?.length || 0) + (window.sessionStorage?.length || 0)
      : 0;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Privacy Center &amp; Security Matrix</h1>
          <p className="section-subtitle">
            Transparent verification of local browser execution, storage hygiene, and detection
            boundaries.
          </p>
        </div>
      </div>

      {/* Live Privacy Status Matrix */}
      <div className="privacy-matrix-grid">
        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span className="kpi-label">
            <span>Processing Location</span>
            <Cpu size={15} aria-hidden="true" />
          </span>
          <span className="kpi-value" style={{ fontSize: '1.15rem', color: 'var(--accent-cyan)' }}>
            100% Client-Side RAM
          </span>
          <span className="kpi-meta">Zero backend APIs or external AI calls</span>
        </motion.div>

        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span className="kpi-label">
            <span>Offline Readiness</span>
            {isOnline ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
          </span>
          <span className="kpi-value" style={{ fontSize: '1.15rem', color: 'var(--accent-emerald)' }}>
            {isOnline ? 'Offline-Ready' : 'Offline Active'}
          </span>
          <span className="kpi-meta">
            All detectors, fonts, and icons bundled locally
          </span>
        </motion.div>

        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span className="kpi-label">
            <span>Browser Persistent Storage</span>
            <Database size={15} aria-hidden="true" />
          </span>
          <span className="kpi-value mono" style={{ fontSize: '1.15rem' }}>
            {storageKeysCount} PII keys saved
          </span>
          <span className="kpi-meta">localStorage, sessionStorage &amp; cookies unused</span>
        </motion.div>
      </div>

      <div className="glass-card panel-card" style={{ borderColor: 'rgba(0, 240, 255, 0.35)' }}>
        <h2 className="panel-title">
          <Lock size={18} color="var(--accent-cyan)" aria-hidden="true" />
          <span>Local Processing Disclosure</span>
        </h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Your document contents are processed locally in this browser. PrivacyGuard does not
          intentionally transmit document contents to an external server. Hosting providers still
          serve the application assets, and browser extensions or compromised devices may affect
          privacy.
        </p>
      </div>

      <div className="info-grid">
        <article className="glass-card info-card">
          <EyeOff size={22} color="var(--accent-cyan)" aria-hidden="true" />
          <h3>Data Handling</h3>
          <p>
            No backend API, no cloud OCR/NER service, no third-party analytics, and no tracking
            scripts. Pasted text and uploaded files are read via the Browser File API and processed
            synchronously in memory.
          </p>
        </article>

        <article className="glass-card info-card">
          <HardDrive size={22} color="var(--accent-violet)" aria-hidden="true" />
          <h3>Volatile Memory Only</h3>
          <p>
            Document text, detection arrays, and pseudonymization maps live strictly in React RAM
            and are wiped when you click <strong>Clear / Reset</strong> or close the tab.
          </p>
        </article>

        <article className="glass-card info-card">
          <ShieldCheck size={22} color="var(--accent-emerald)" aria-hidden="true" />
          <h3>XSS &amp; File Guardrails</h3>
          <p>
            Diff highlighting renders exclusively through escaped React text nodes (never{' '}
            <code>dangerouslySetInnerHTML</code>). Uploads enforce <code>.txt</code>/
            <code>.csv</code> extensions, MIME checks, strict UTF-8 decoding, and a 5 MB limit.
          </p>
        </article>
      </div>

      <div className="glass-card panel-card">
        <h2 className="panel-title">
          <AlertTriangle size={18} color="var(--accent-amber)" aria-hidden="true" />
          <span>Honest Privacy &amp; Detection Limitations</span>
        </h2>
        <ul className="privacy-limits-list">
          <li>
            Detection is rule-based and checksum-based (including Luhn mod-10 for payment card
            candidates); it does not verify whether an Aadhaar, PAN, or card number is officially
            issued or belongs to a real person.
          </li>
          <li>
            Unstructured free-form PII (such as plain human names or street addresses without format
            patterns) is outside rule-based scope.
          </li>
          <li>
            Static hosting providers deliver the frontend HTML/JS/CSS bundle over HTTPS; third-party
            browser extensions or compromised OS environments remain outside app control.
          </li>
        </ul>
      </div>
    </div>
  );
}
