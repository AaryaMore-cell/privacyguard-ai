import { CheckCircle2, Cpu, FileSpreadsheet, Layers, ShieldAlert } from 'lucide-react';

export function HowItWorks() {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">How PrivacyGuard AI Works</h1>
          <p className="section-subtitle">
            Deterministic, rule-based, and checksum-validated sanitization inside your browser.
          </p>
        </div>
      </div>

      <div className="info-grid">
        <article className="glass-card info-card">
          <Cpu size={22} color="var(--accent-electric)" aria-hidden="true" />
          <h3>1. Rule &amp; Checksum Detection</h3>
          <p>
            Scans text locally for Email, Phone (+91 &amp; international), IPv4 (0–255 octet check),
            IPv6 (full, :: compressed, IPv4-mapped), Indian PAN (ABCDE1234F), Aadhaar-format 12-digit
            strings, and 13–19 digit payment cards validated with the Luhn algorithm.
          </p>
        </article>

        <article className="glass-card info-card">
          <Layers size={22} color="var(--accent-teal-bright)" aria-hidden="true" />
          <h3>2. Overlap &amp; False-Positive Guard</h3>
          <p>
            Candidates are ranked by validation status, specificity priority (Credit Card &gt; IPv6
            &gt; Email &gt; Aadhaar &gt; PAN &gt; IPv4 &gt; Phone), and span length. Random 16-digit
            numbers failing Luhn are rejected and never sliced into phone or Aadhaar sub-matches.
          </p>
        </article>

        <article className="glass-card info-card">
          <FileSpreadsheet size={22} color="var(--cat-pan)" aria-hidden="true" />
          <h3>3. Structure-Safe CSV &amp; Redaction</h3>
          <p>
            CSV files are parsed per RFC 4180 (preserving quoted fields, embedded commas, escaped
            quotes, and newlines), sanitized cell-by-cell so detections never cross column
            delimiters, and re-serialized cleanly for download.
          </p>
        </article>
      </div>

      <div className="glass-card panel-card">
        <h2 className="panel-title">
          <ShieldAlert size={18} color="var(--accent-amber)" aria-hidden="true" />
          <span>Important Scope Notice: Pattern Matching vs. Identity Verification</span>
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          PrivacyGuard AI uses deterministic pattern matching, structural validation, and Luhn
          checksum verification—not a remote LLM or external registry lookup. Pattern matching
          identifies strings resembling Aadhaar, PAN, phone, or card formats to help prevent
          accidental exposure, and <strong>never proves real-world issuance or identity</strong>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span className="badge-pill">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Full Mask: [REDACTED]</span>
          </span>
          <span className="badge-pill">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Partial Mask: Last 4 / Domain Context</span>
          </span>
          <span className="badge-pill">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Pseudonymization: Ephemeral Session Namespaces</span>
          </span>
        </div>
      </div>
    </div>
  );
}
