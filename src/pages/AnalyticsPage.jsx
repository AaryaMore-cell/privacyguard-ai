import { FlaskConical, Sparkles } from 'lucide-react';
import { DetectionStats } from '../components/DetectionStats.jsx';

export function AnalyticsPage({
  stats,
  enabledTypes,
  onToggleCategory,
  auditEvents,
  onLoadSample,
  onOpenSanitizer,
}) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Detection Analytics</h1>
          <p className="section-subtitle">
            Interactive category breakdown, latency, and historical local activity from your active
            session.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLoadSample}>
            <FlaskConical size={14} aria-hidden="true" />
            <span>Load Synthetic Sample</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenSanitizer}>
            <Sparkles size={14} aria-hidden="true" />
            <span>Go to Sanitizer</span>
          </button>
        </div>
      </div>

      <DetectionStats
        stats={stats}
        enabledTypes={enabledTypes}
        onToggleCategory={onToggleCategory}
        auditEvents={auditEvents}
      />
    </div>
  );
}
