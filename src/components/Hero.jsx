import { ArrowRight, Cpu, FileCheck2, Lock, Play, ShieldAlert } from 'lucide-react';

export function Hero({ onStartSanitizing, onExploreDemo }) {
  return (
    <section className="glass-card hero-card" aria-labelledby="hero-title">
      <div>
        <div className="hero-eyebrow">
          <Lock size={14} aria-hidden="true" />
          <span>100% CLIENT-SIDE PROCESSING</span>
        </div>

        <h1 id="hero-title" className="hero-heading">
          Your sensitive data{' '}
          <span className="hero-heading-accent">deserves protection.</span>
        </h1>

        <p className="hero-subtitle">
          Detect, classify and sanitize sensitive information instantly. Your documents never leave
          your browser.
        </p>

        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={onStartSanitizing}>
            <span>Start Sanitizing</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          <button type="button" className="btn btn-secondary" onClick={onExploreDemo}>
            <Play size={15} aria-hidden="true" />
            <span>Explore Demo</span>
          </button>
        </div>
      </div>

      <div className="pipeline-box" aria-label="How local client-side processing works">
        <div className="pipeline-title">
          <span>Zero-Upload Browser Pipeline</span>
          <span className="badge-pill">No Server / No AI API</span>
        </div>

        <div className="pipeline-steps">
          <div className="pipeline-step">
            <span className="pipeline-step-icon" aria-hidden="true">
              <FileCheck2 size={17} />
            </span>
            <div>
              <strong>1. Local Browser Ingestion</strong>
              <span>Paste text or drop .txt / .csv files via the Browser File API.</span>
            </div>
          </div>

          <div className="pipeline-step">
            <span className="pipeline-step-icon" aria-hidden="true">
              <Cpu size={17} />
            </span>
            <div>
              <strong>2. Rule + Luhn Validation Engine</strong>
              <span>Detects Email, Phone, IPv4/v6, PAN, Aadhaar format &amp; Luhn cards in RAM.</span>
            </div>
          </div>

          <div className="pipeline-step">
            <span className="pipeline-step-icon" aria-hidden="true">
              <ShieldAlert size={17} />
            </span>
            <div>
              <strong>3. Deterministic Sanitization &amp; Export</strong>
              <span>Full Mask, Partial Mask, or ephemeral Pseudonymization exported via Blob URLs.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
