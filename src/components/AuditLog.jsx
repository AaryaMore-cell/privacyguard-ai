import { motion } from 'motion/react';
import { ClipboardList, Download } from 'lucide-react';
import { ENTITY_META } from './entityMeta.js';

export function AuditLog({ auditEvents, onExportAuditJSON }) {
  return (
    <section className="glass-card panel-card" aria-labelledby="audit-log-title">
      <div className="panel-title-row">
        <div>
          <h2 id="audit-log-title" className="panel-title">
            <ClipboardList size={18} aria-hidden="true" />
            <span>Session Audit Timeline (Zero-PII Metadata Only)</span>
          </h2>
          <p className="section-subtitle">
            Chronological browser-session trail of detection, redaction, and export events. Never
            stores raw PII.
          </p>
        </div>

        <motion.button
          type="button"
          className="btn btn-primary btn-sm"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onExportAuditJSON}
        >
          <Download size={14} aria-hidden="true" />
          <span>Export Audit JSON</span>
        </motion.button>
      </div>

      {auditEvents.length === 0 ? (
        <div className="diff-pane diff-empty">
          <strong>No audit activity recorded yet</strong>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem' }}>
            Load a document or paste text in the Sanitizer to record local processing events.
          </p>
        </div>
      ) : (
        <div className="audit-timeline">
          {auditEvents.map((evt, index) => (
            <motion.div
              key={evt.id}
              className="timeline-node"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.25) }}
            >
              <span className={`timeline-dot status-${evt.status}`} aria-hidden="true" />

              <div className="audit-item">
                <div className="audit-item-main">
                  <strong>{evt.event}</strong>
                  <span>{evt.details}</span>

                  {Array.isArray(evt.categories) && evt.categories.length > 0 ? (
                    <div className="timeline-badges">
                      {evt.categories.map((cat) => (
                        <span key={cat} className="badge-pill mono">
                          {ENTITY_META[cat]?.shortTag || cat}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="timeline-meta">
                  <span className="badge-pill">{evt.status}</span>
                  {evt.redactionStatus ? (
                    <span className="badge-pill">{evt.redactionStatus}</span>
                  ) : null}
                  {evt.exportStatus ? (
                    <span className="badge-pill">{evt.exportStatus}</span>
                  ) : null}
                  <span className="audit-time">
                    {evt.timestamp.slice(0, 10)} · {evt.timestamp.slice(11, 19)} UTC
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
