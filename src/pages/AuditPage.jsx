import { ShieldCheck } from 'lucide-react';
import { AuditLog } from '../components/AuditLog.jsx';

export function AuditPage({ auditEvents, onExportAuditJSON }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Audit History</h1>
          <p className="section-subtitle">
            Local compliance trail showing aggregate counts and timestamps without storing raw PII.
          </p>
        </div>
      </div>

      <div className="glass-card panel-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.85rem' }}>
        <ShieldCheck size={22} color="var(--accent-teal-bright)" aria-hidden="true" />
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Exported JSON audit reports include document metadata, redaction mode, enabled categories,
          processing latency, and event timestamps—never original text, emails, phones, cards, or
          pseudonym mapping tables.
        </p>
      </div>

      <AuditLog auditEvents={auditEvents} onExportAuditJSON={onExportAuditJSON} />
    </div>
  );
}
