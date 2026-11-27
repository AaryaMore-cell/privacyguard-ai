import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { ENTITY_LIST, ENTITY_META } from './entityMeta.js';

/**
 * Safely renders text with highlighted span segments using React text nodes only.
 * Never uses dangerouslySetInnerHTML so HTML/script tags in input stay inert.
 */
function renderHighlightedNodes(text, spans, isSanitized) {
  if (!text) return null;
  if (!Array.isArray(spans) || spans.length === 0) {
    return text;
  }

  const nodes = [];
  let cursor = 0;

  for (let idx = 0; idx < spans.length; idx += 1) {
    const span = spans[idx];
    const start = isSanitized ? span.outputStart : span.start;
    const end = isSanitized ? span.outputEnd : span.end;

    if (
      typeof start !== 'number' ||
      typeof end !== 'number' ||
      start < cursor ||
      end <= start ||
      end > text.length
    ) {
      continue;
    }

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    const meta = ENTITY_META[span.type];
    const markClass = isSanitized ? 'redacted-mark' : `pii-mark ${meta ? meta.className : ''}`;

    const tooltip = isSanitized
      ? `Sanitized ${meta?.singular || span.type}`
      : `${meta?.singular || span.type}: ${span.explanation || span.validationStatus}`;

    nodes.push(
      <mark key={`${start}-${end}-${idx}`} className={markClass} title={tooltip}>
        {text.slice(start, end)}
      </mark>
    );

    cursor = end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

export function DiffViewer({
  inputText,
  sanitizedText,
  detections,
  outputSegments,
  documentFormat,
  isScanning,
  onCopy,
  onReset,
  onExportDocument,
}) {
  const [copied, setCopied] = useState(false);
  const hasContent = inputText.length > 0;

  const handleCopyClick = async () => {
    const ok = await onCopy();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <section className="glass-card panel-card diff-shell" aria-labelledby="diff-viewer-title">
      <AnimatePresence>
        {isScanning ? (
          <motion.div
            className="scan-laser-beam"
            initial={{ top: '0%', opacity: 0.9 }}
            animate={{ top: '100%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>

      <div className="panel-title-row">
        <div>
          <h2 id="diff-viewer-title" className="panel-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Live Side-by-Side Diff &amp; Redaction Preview</span>
          </h2>
          <p className="section-subtitle">
            Color-coded detections synchronized with sanitized output inside volatile browser RAM.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <motion.button
            type="button"
            className="btn btn-secondary btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyClick}
            disabled={!hasContent}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            <span>{copied ? 'Copied' : 'Copy Sanitized'}</span>
          </motion.button>

          <motion.button
            type="button"
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onExportDocument(documentFormat === 'csv' ? 'csv' : 'txt')}
            disabled={!hasContent}
          >
            <Download size={14} aria-hidden="true" />
            <span>Download .{documentFormat === 'csv' ? 'csv' : 'txt'}</span>
          </motion.button>

          {documentFormat === 'csv' ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onExportDocument('txt')}
              disabled={!hasContent}
            >
              <Download size={14} aria-hidden="true" />
              <span>Export .txt</span>
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-danger-ghost btn-sm"
            onClick={onReset}
            disabled={!hasContent}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="legend-row" aria-label="Entity highlight color legend">
        {ENTITY_LIST.map((cat) => (
          <span key={cat.type} className="legend-item">
            <span className="cat-dot" style={{ backgroundColor: cat.colorVar }} aria-hidden="true" />
            <span>{cat.singular}</span>
          </span>
        ))}
      </div>

      {!hasContent ? (
        <div className="diff-pane diff-empty">
          <strong>No document loaded yet</strong>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem' }}>
            Paste text, upload a <code>.txt</code> / <code>.csv</code> file, or click{' '}
            <strong>Load Sample TXT</strong> / <strong>Load Sample CSV</strong> to inspect real-time
            PII highlighting and sanitized output side-by-side.
          </p>
        </div>
      ) : (
        <div className="diff-grid">
          <div className="diff-pane">
            <div className="diff-pane-header">
              <span>Original Input (Local Only)</span>
              <span className="mono">{detections.length} detections</span>
            </div>
            <pre className="diff-content" data-testid="diff-original">
              {renderHighlightedNodes(inputText, detections, false)}
            </pre>
          </div>

          <div className="diff-pane">
            <div className="diff-pane-header">
              <span>Sanitized Output</span>
              <span className="mono">{sanitizedText.length.toLocaleString()} chars</span>
            </div>
            <pre className="diff-content" data-testid="diff-sanitized">
              {renderHighlightedNodes(sanitizedText, outputSegments, true)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
