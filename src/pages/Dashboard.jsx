import { motion } from 'motion/react';
import { ArrowRight, FlaskConical, Lock, Sparkles } from 'lucide-react';
import { DetectionStats } from '../components/DetectionStats.jsx';

export function Dashboard({
  stats,
  enabledTypes,
  onToggleCategory,
  auditEvents,
  onStartSanitizing,
  onExploreDemo,
  onNavigate,
}) {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <motion.section
        className="glass-card dashboard-banner"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <span className="hero-eyebrow" style={{ marginBottom: '0.65rem' }}>
            <Lock size={13} aria-hidden="true" />
            <span>100% CLIENT-SIDE PROCESSING</span>
          </span>
          <h1 className="section-title" style={{ fontSize: '1.55rem' }}>
            Command Dashboard — Live Session Telemetry
          </h1>
          <p className="section-subtitle">
            Real-time metrics computed directly from your active browser document (zero simulated
            numbers).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            className="btn btn-holo btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onExploreDemo}
          >
            <FlaskConical size={14} aria-hidden="true" />
            <span>Explore Demo</span>
          </motion.button>

          <motion.button
            type="button"
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartSanitizing}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Start Sanitizing</span>
            <ArrowRight size={14} aria-hidden="true" />
          </motion.button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('privacy')}
          >
            <span>Privacy Center</span>
          </button>
        </div>
      </motion.section>

      <DetectionStats
        stats={stats}
        enabledTypes={enabledTypes}
        onToggleCategory={onToggleCategory}
        auditEvents={auditEvents}
      />
    </div>
  );
}
