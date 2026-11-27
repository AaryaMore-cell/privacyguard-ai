import { motion } from 'motion/react';
import { Eraser, FlaskConical, ScanSearch } from 'lucide-react';

export function TextInput({
  value,
  onChange,
  onScan,
  onLoadSample,
  onLoadSampleCsv,
  onClear,
  stats,
  documentFormat,
  hasPendingManualScan,
  isScanning,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="panel-title-row">
        <label htmlFor="pii-source-input" className="panel-title">
          Document Input ({documentFormat.toUpperCase()})
        </label>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onScan}
            disabled={!value}
          >
            <ScanSearch size={14} aria-hidden="true" />
            <span>
              {isScanning
                ? 'Scanning...'
                : hasPendingManualScan
                  ? 'Scan Changes'
                  : 'Scan'}
            </span>
          </motion.button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onLoadSample('txt')}
          >
            <FlaskConical size={14} aria-hidden="true" />
            <span>Load Sample TXT</span>
          </button>

          {onLoadSampleCsv ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onLoadSampleCsv}>
              <FlaskConical size={14} aria-hidden="true" />
              <span>Load Sample CSV</span>
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-danger-ghost btn-sm"
            onClick={onClear}
            disabled={!value}
          >
            <Eraser size={14} aria-hidden="true" />
            <span>Clear / Reset</span>
          </button>
        </div>
      </div>

      <textarea
        id="pii-source-input"
        className="source-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste logs, customer records, CSV rows, or support tickets here... Everything stays inside your browser."
        spellCheck={false}
      />

      <div className="input-footer-bar">
        <span>
          Characters: <strong className="mono">{stats.inputChars.toLocaleString()}</strong> · Lines:{' '}
          <strong className="mono">{stats.lineCount.toLocaleString()}</strong>
          {documentFormat === 'csv' && stats.csvRows > 0 ? (
            <>
              {' '}
              · CSV Grid:{' '}
              <strong className="mono">
                {stats.csvRows} × {stats.csvCols}
              </strong>
            </>
          ) : null}
        </span>

        <span>
          Detected entities: <strong className="mono">{stats.totalDetected}</strong>
        </span>
      </div>
    </div>
  );
}
