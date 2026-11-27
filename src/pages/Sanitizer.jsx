import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Cpu, Radar, X } from 'lucide-react';
import { DiffViewer } from '../components/DiffViewer.jsx';
import { ENTITY_LIST, ENTITY_META } from '../components/entityMeta.js';
import { FileUploader } from '../components/FileUploader.jsx';
import { RedactionModeSelector } from '../components/RedactionModeSelector.jsx';
import { TextInput } from '../components/TextInput.jsx';

export function Sanitizer({ sanitizer }) {
  const activeDetectionsByType = ENTITY_LIST.map((meta) => {
    const matches = sanitizer.detections.filter((d) => d.type === meta.type);
    return {
      ...meta,
      count: sanitizer.stats.byCategory?.[meta.type] ?? matches.length,
      basis: matches[0]?.explanation || meta.description,
    };
  }).filter((item) => item.count > 0);

  return (
    <div className="sanitizer-layout">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="section-title">Neon Sanitizer Workspace</h1>
          <p className="section-subtitle">
            Split-screen local PII inspection, deterministic validation, and real-time redaction in
            browser RAM.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} role="group" aria-label="Processing engine mode">
            <button
              type="button"
              className={`btn btn-sm ${sanitizer.processingEngine === 'local' ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={sanitizer.processingEngine === 'local'}
              onClick={() => sanitizer.setProcessingEngine('local')}
            >
              Browser RAM
            </button>
            <button
              type="button"
              className={`btn btn-sm ${sanitizer.processingEngine === 'server' ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={sanitizer.processingEngine === 'server'}
              onClick={() => sanitizer.setProcessingEngine('server')}
            >
              FastAPI Server
            </button>
          </div>
          <span className={`badge-pill ${sanitizer.isScanning ? 'scan-pill-active' : ''}`}>
            <Radar size={14} aria-hidden="true" />
            <span>
              {sanitizer.isScanning
                ? 'Scanning Buffer...'
                : sanitizer.autoScan
                  ? 'Live Scan Active'
                  : 'Manual Scan Mode'}
            </span>
          </span>
          <span className="badge-pill mono">{sanitizer.stats.processingTimeMs} ms</span>
        </div>
      </div>

      {sanitizer.errorMessage ? (
        <div className="alert-banner alert-error" role="alert">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{sanitizer.errorMessage}</span>
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={sanitizer.clearMessages}
            aria-label="Dismiss error message"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {sanitizer.statusMessage ? (
        <div className="alert-banner alert-info" role="status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{sanitizer.statusMessage}</span>
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={sanitizer.clearMessages}
            aria-label="Dismiss status message"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {sanitizer.csvWarnings.length > 0 ? (
        <div className="alert-banner alert-error" role="status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>CSV notice: {sanitizer.csvWarnings.join(' ')}</span>
          </span>
        </div>
      ) : null}

      <div className="split-sanitizer-grid">
        {/* LEFT SPLIT: Ingestion & Source Editor */}
        <div className="glass-card panel-card split-pane-left">
          <FileUploader
            onFileSelect={sanitizer.handleFileUpload}
            fileMeta={sanitizer.fileMeta}
            documentFormat={sanitizer.documentFormat}
            onChangeFormat={sanitizer.setDocumentFormat}
          />
          <TextInput
            value={sanitizer.inputText}
            onChange={sanitizer.handleTextChange}
            onScan={sanitizer.triggerScan}
            onLoadSample={() => sanitizer.loadSampleData('txt')}
            onLoadSampleCsv={() => sanitizer.loadSampleData('csv')}
            onClear={sanitizer.handleReset}
            stats={sanitizer.stats}
            documentFormat={sanitizer.documentFormat}
            hasPendingManualScan={sanitizer.hasPendingManualScan}
            isScanning={sanitizer.isScanning}
          />
        </div>

        {/* RIGHT SPLIT: Detection Intelligence, Validation Basis & Redaction Controls */}
        <div className="glass-card panel-card split-pane-right">
          <AnimatePresence>
            {sanitizer.isScanning ? (
              <motion.div
                className="scan-progress-bar"
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: 1, opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                aria-hidden="true"
              />
            ) : null}
          </AnimatePresence>

          <RedactionModeSelector
            mode={sanitizer.redactionMode}
            onChangeMode={sanitizer.setRedactionMode}
            enabledTypes={sanitizer.enabledTypes}
            onToggleCategory={sanitizer.toggleCategory}
            onToggleAll={sanitizer.toggleAllCategories}
            countsByCategory={sanitizer.stats.byCategory}
          />

          <div className="validation-box">
            <div className="panel-title-row" style={{ marginBottom: '0.45rem' }}>
              <h3 className="panel-title">
                <Cpu size={15} aria-hidden="true" />
                <span>Detection &amp; Validation Results</span>
              </h3>
              <span className="badge-pill mono">
                {sanitizer.stats.totalRedacted} / {sanitizer.stats.totalDetected} redacted
              </span>
            </div>

            {activeDetectionsByType.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                No active PII detections yet. Deterministic rule and Luhn checksum explanations will
                appear here once scanned.
              </p>
            ) : (
              <div className="validation-chip-list">
                {activeDetectionsByType.map((item) => (
                  <div key={item.type} className="validation-chip">
                    <div className="validation-chip-head">
                      <span className="legend-item">
                        <span
                          className="cat-dot"
                          style={{ backgroundColor: item.colorVar }}
                          aria-hidden="true"
                        />
                        <strong>{ENTITY_META[item.type]?.label || item.label}</strong>
                      </span>
                      <span className="mono">{item.count}</span>
                    </div>
                    <span className="validation-chip-note">{item.basis}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DiffViewer
        inputText={sanitizer.inputText}
        sanitizedText={sanitizer.sanitizedText}
        detections={sanitizer.detections}
        outputSegments={sanitizer.outputSegments}
        documentFormat={sanitizer.documentFormat}
        isScanning={sanitizer.isScanning}
        onCopy={sanitizer.handleCopySanitized}
        onReset={sanitizer.handleReset}
        onExportDocument={sanitizer.handleExportDocument}
      />
    </div>
  );
}
