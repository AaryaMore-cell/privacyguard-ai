import { memo } from 'react';
import { motion } from 'motion/react';
import { Activity, Clock, FileCode2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber.jsx';
import { ENTITY_LIST } from './entityMeta.js';

function buildDonutSegments(items, total) {
  if (total <= 0) return [];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return items
    .filter((item) => item.count > 0)
    .map((item) => {
      const fraction = item.count / total;
      const dash = fraction * circumference;
      const segment = {
        ...item,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset,
      };
      offset += dash;
      return segment;
    });
}

export const DetectionStats = memo(function DetectionStats({
  stats,
  enabledTypes,
  onToggleCategory,
  auditEvents = [],
}) {
  const categoryRows = ENTITY_LIST.map((cat) => ({
    ...cat,
    count: stats.byCategory?.[cat.type] ?? 0,
    active: enabledTypes.includes(cat.type),
  }));

  const maxCategoryCount = Math.max(1, ...categoryRows.map((row) => row.count));
  const donutSegments = buildDonutSegments(categoryRows, stats.totalDetected);
  const scanHistory = auditEvents.slice(0, 6);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="kpi-grid">
        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <span className="kpi-label">
            <span>Entities Detected</span>
            <ShieldAlert size={15} aria-hidden="true" />
          </span>
          <span className="kpi-value mono">
            <AnimatedNumber value={stats.totalDetected} />
          </span>
          <span className="kpi-meta">Unique overlapping spans resolved</span>
        </motion.div>

        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <span className="kpi-label">
            <span>Entities Redacted</span>
            <ShieldCheck size={15} aria-hidden="true" />
          </span>
          <span className="kpi-value mono">
            <AnimatedNumber value={stats.totalRedacted} />
          </span>
          <span className="kpi-meta">Replaced in sanitized output</span>
        </motion.div>

        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <span className="kpi-label">
            <span>Processing Duration</span>
            <Clock size={15} aria-hidden="true" />
          </span>
          <span className="kpi-value mono">
            <AnimatedNumber
              value={stats.processingTimeMs}
              decimals={stats.processingTimeMs > 0 ? 2 : 0}
              suffix=" ms"
            />
          </span>
          <span className="kpi-meta">Measured client-side in browser RAM</span>
        </motion.div>

        <motion.div
          className="glass-card kpi-card"
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <span className="kpi-label">
            <span>Input → Output Size</span>
            <FileCode2 size={15} aria-hidden="true" />
          </span>
          <span className="kpi-value mono" style={{ fontSize: '1.35rem' }}>
            <AnimatedNumber value={stats.inputChars} /> →{' '}
            <AnimatedNumber value={stats.outputChars} />
          </span>
          <span className="kpi-meta">Characters ({stats.lineCount} lines)</span>
        </motion.div>
      </div>

      <div className="analytics-grid">
        <div className="glass-card panel-card">
          <div className="panel-title-row">
            <h3 className="panel-title">Category Breakdown (Click to Toggle Filter)</h3>
            <span className="badge-pill mono">{stats.totalDetected} total</span>
          </div>

          <div className="bar-chart-list">
            {categoryRows.map((row) => {
              const widthPct =
                stats.totalDetected > 0 ? Math.round((row.count / maxCategoryCount) * 100) : 0;
              return (
                <div key={row.type} className="bar-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      textAlign: 'left',
                      padding: '0.2rem 0.35rem',
                      borderRadius: '6px',
                      opacity: row.active ? 1 : 0.45,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                    onClick={() => onToggleCategory(row.type)}
                    title={`Toggle ${row.label} detection`}
                  >
                    {row.label}
                  </button>

                  <div className="bar-track" aria-hidden="true">
                    <motion.div
                      className="bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                      style={{ backgroundColor: row.colorVar }}
                    />
                  </div>

                  <span className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {row.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card panel-card">
          <div className="panel-title-row">
            <h3 className="panel-title">Entity Distribution</h3>
            <span className="badge-pill">Local Analytics</span>
          </div>

          <div className="donut-wrap">
            <svg
              width="144"
              height="144"
              viewBox="0 0 144 144"
              role="img"
              aria-label="Detected entity distribution chart"
            >
              <circle
                cx="72"
                cy="72"
                r="52"
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="16"
              />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.type}
                  cx="72"
                  cy="72"
                  r="52"
                  fill="none"
                  stroke={seg.colorVar}
                  strokeWidth="16"
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  transform="rotate(-90 72 72)"
                />
              ))}
              <text
                x="72"
                y="69"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="22"
                fontWeight="800"
              >
                {stats.totalDetected}
              </text>
              <text
                x="72"
                y="87"
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="10"
                fontWeight="600"
              >
                DETECTED
              </text>
            </svg>

            <div className="donut-legend">
              {categoryRows.map((row) => {
                const pct =
                  stats.totalDetected > 0
                    ? Math.round((row.count / stats.totalDetected) * 100)
                    : 0;
                return (
                  <div key={row.type} className="donut-legend-row">
                    <span className="legend-item">
                      <span
                        className="cat-dot"
                        style={{ backgroundColor: row.colorVar }}
                        aria-hidden="true"
                      />
                      <span>{row.singular}</span>
                    </span>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {row.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card panel-card">
        <div className="panel-title-row">
          <h3 className="panel-title">
            <Activity size={16} aria-hidden="true" />
            <span>Session Historical Activity (Actual Local Events)</span>
          </h3>
          <span className="badge-pill mono">{auditEvents.length} recorded</span>
        </div>

        {scanHistory.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            No processing events in this session yet. Load sample data or scan a document to view
            real local session history.
          </p>
        ) : (
          <div className="history-strip">
            {scanHistory.map((evt) => (
              <div key={evt.id} className="history-chip">
                <div className="history-chip-top">
                  <strong>{evt.event}</strong>
                  <span className="mono">{evt.timestamp.slice(11, 19)} UTC</span>
                </div>
                <span>{evt.details}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
