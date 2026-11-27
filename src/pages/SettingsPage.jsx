import { motion } from 'motion/react';
import {
  CheckCircle2,
  Moon,
  RotateCcw,
  Settings as SettingsIcon,
  Sliders,
  Sun,
  Zap,
} from 'lucide-react';
import { ENTITY_LIST } from '../components/entityMeta.js';
import { REDACTION_MODES } from '../engine/redactPII.js';
import { DEFAULT_MAX_FILE_SIZE_BYTES, formatFileSize } from '../utils/fileUtils.js';

export function SettingsPage({
  theme,
  onToggleTheme,
  sanitizer,
}) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Universe Settings</h1>
          <p className="section-subtitle">
            Configure theme, scan trigger behavior, default redaction mode, and active PII
            detectors.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="glass-card panel-card">
          <h2 className="panel-title">
            <SettingsIcon size={17} aria-hidden="true" />
            <span>Appearance &amp; Scan Engine</span>
          </h2>

          <div className="setting-row">
            <div>
              <strong>Visual Theme</strong>
              <span>Switch between Midnight Neon Dark and Frost Light glassmorphism.</span>
            </div>
            <motion.button
              type="button"
              className="btn btn-secondary btn-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
            </motion.button>
          </div>

          <div className="setting-row">
            <div>
              <strong>Live Auto-Scan on Type</strong>
              <span>
                When enabled, detections update on every keystroke. Turn off to scan only when
                clicking <strong>Scan</strong>.
              </span>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${sanitizer.autoScan ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={sanitizer.autoScan}
              onClick={() => sanitizer.setAutoScan((prev) => !prev)}
            >
              <Zap size={14} aria-hidden="true" />
              <span>{sanitizer.autoScan ? 'Auto-Scan ON' : 'Manual Scan'}</span>
            </button>
          </div>

          <div className="setting-row">
            <div>
              <strong>Maximum Upload Size Limit</strong>
              <span>Enforced locally before decoding files in browser memory.</span>
            </div>
            <span className="badge-pill mono">{formatFileSize(DEFAULT_MAX_FILE_SIZE_BYTES)}</span>
          </div>

          <div className="setting-row">
            <div>
              <strong>Wipe Session Memory</strong>
              <span>Clears input text, sanitized output, detections, and audit log.</span>
            </div>
            <button
              type="button"
              className="btn btn-danger-ghost btn-sm"
              onClick={sanitizer.handleReset}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Clear All RAM</span>
            </button>
          </div>
        </div>

        <div className="glass-card panel-card">
          <h2 className="panel-title">
            <Sliders size={17} aria-hidden="true" />
            <span>Default Redaction &amp; Detectors</span>
          </h2>

          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {[
              { id: REDACTION_MODES.FULL, label: 'Mode A: Full Mask ([REDACTED])' },
              { id: REDACTION_MODES.PARTIAL, label: 'Mode B: Partial Mask (Last 4 / Domain)' },
              {
                id: REDACTION_MODES.PSEUDONYM,
                label: 'Mode C: Consistent Pseudonymization (USER_01)',
              },
            ].map((opt) => {
              const selected = sanitizer.redactionMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`mode-option ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => sanitizer.setRedactionMode(opt.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2
                      size={15}
                      color={selected ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                      aria-hidden="true"
                    />
                    <strong>{opt.label}</strong>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <div className="panel-title-row" style={{ marginBottom: '0.55rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Active PII Categories</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  sanitizer.toggleAllCategories(
                    sanitizer.enabledTypes.length !== ENTITY_LIST.length
                  )
                }
              >
                {sanitizer.enabledTypes.length === ENTITY_LIST.length
                  ? 'Disable All'
                  : 'Enable All'}
              </button>
            </div>

            <div className="category-toggles">
              {ENTITY_LIST.map((cat) => {
                const active = sanitizer.enabledTypes.includes(cat.type);
                return (
                  <button
                    key={cat.type}
                    type="button"
                    className={`cat-toggle ${active ? 'active' : ''}`}
                    aria-pressed={active}
                    onClick={() => sanitizer.toggleCategory(cat.type)}
                  >
                    <span
                      className="cat-dot"
                      style={{ backgroundColor: cat.colorVar, opacity: active ? 1 : 0.35 }}
                      aria-hidden="true"
                    />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
