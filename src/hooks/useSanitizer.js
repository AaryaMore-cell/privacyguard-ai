import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_PII_TYPES, detectAllPII } from '../engine/detectPII.js';
import {
  createPseudonymSession,
  REDACTION_MODES,
  redactText,
} from '../engine/redactPII.js';
import {
  checkBackendHealth,
  redactViaBackend,
  uploadAndRedactViaBackend,
} from '../utils/apiClient.js';
import { processCsvDocument } from '../utils/csvUtils.js';
import {
  buildExportFilename,
  buildSanitizedAuditJson,
  copyTextToClipboard,
  downloadBlobFile,
} from '../utils/exportUtils.js';
import {
  getTextMetrics,
  readValidatedTextFile,
} from '../utils/fileUtils.js';
import {
  SYNTHETIC_SAMPLE_CSV,
  SYNTHETIC_SAMPLE_TEXT,
} from '../utils/sampleData.js';

const LARGE_TEXT_DEBOUNCE_THRESHOLD = 15000;
const LARGE_TEXT_DEBOUNCE_MS = 180;

function createEmptyCounts() {
  return Object.fromEntries(ALL_PII_TYPES.map((t) => [t, 0]));
}

function createEmptyAnalysis(inputChars = 0, lineCount = 0) {
  return {
    detections: [],
    sanitizedText: '',
    outputSegments: [],
    csvWarnings: [],
    stats: {
      totalDetected: 0,
      totalRedacted: 0,
      byCategory: createEmptyCounts(),
      processingTimeMs: 0,
      inputChars,
      outputChars: 0,
      lineCount,
      csvRows: 0,
      csvCols: 0,
    },
  };
}

function createAuditEntry(event, status, details, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    event,
    status,
    details,
    ...extra,
  };
}

function mapServerResponse(data) {
  return {
    detections: data.detections || [],
    sanitizedText: data.sanitized_text || '',
    outputSegments: data.output_spans || [],
    csvWarnings: data.csv_warnings || [],
    stats: {
      totalDetected: data.total_detected ?? 0,
      totalRedacted: data.total_redacted ?? 0,
      byCategory: { ...createEmptyCounts(), ...(data.category_counts || {}) },
      processingTimeMs: data.processing_time_ms ?? 0,
      inputChars: data.input_chars ?? 0,
      outputChars: data.output_chars ?? 0,
      lineCount: data.line_count ?? 0,
      csvRows: data.csv_rows ?? 0,
      csvCols: data.csv_cols ?? 0,
    },
  };
}

/**
 * Executes a single local detection + redaction pass with integrated high-resolution timing.
 * Avoids redundant re-scanning across renders, CSV processing, and audit badge generation.
 */
function executeLocalPipeline(sourceText, rawInputText, documentFormat, enabledTypes, redactionMode) {
  const inputMetrics = getTextMetrics(rawInputText);

  if (!sourceText) {
    return createEmptyAnalysis(inputMetrics.chars, inputMetrics.lines);
  }

  const emptyCounts = createEmptyCounts();
  const startMs = performance.now();

  if (documentFormat === 'csv') {
    const csvResult = processCsvDocument(sourceText, enabledTypes, redactionMode);

    if (!csvResult.ok) {
      const elapsed = Math.max(0.1, Number((performance.now() - startMs).toFixed(2)));
      return {
        detections: [],
        sanitizedText: '',
        outputSegments: [],
        csvWarnings: [csvResult.error],
        stats: {
          totalDetected: 0,
          totalRedacted: 0,
          byCategory: emptyCounts,
          processingTimeMs: elapsed,
          inputChars: inputMetrics.chars,
          outputChars: 0,
          lineCount: inputMetrics.lines,
          csvRows: 0,
          csvCols: 0,
        },
      };
    }

    // Reuse raw-text detections for left-pane highlighting only when under 250 KB to keep UI snappy
    const detections =
      sourceText.length <= 250000 ? detectAllPII(sourceText, enabledTypes) : [];
    const elapsed = Math.max(0.1, Number((performance.now() - startMs).toFixed(2)));
    const byCategory = { ...emptyCounts, ...csvResult.categoryCounts };
    const maxCols = csvResult.rows.reduce((max, row) => Math.max(max, row.length), 0);

    return {
      detections,
      sanitizedText: csvResult.sanitizedText,
      outputSegments: [],
      csvWarnings: [],
      stats: {
        totalDetected: csvResult.totalDetections,
        totalRedacted: csvResult.redactedCount,
        byCategory,
        processingTimeMs: elapsed,
        inputChars: inputMetrics.chars,
        outputChars: csvResult.sanitizedText.length,
        lineCount: inputMetrics.lines,
        csvRows: csvResult.rows.length,
        csvCols: maxCols,
      },
    };
  }

  const detections = detectAllPII(sourceText, enabledTypes);
  const session =
    redactionMode === REDACTION_MODES.PSEUDONYM ? createPseudonymSession() : undefined;
  let redacted;
  try {
    redacted = redactText(sourceText, detections, redactionMode, session);
  } finally {
    if (session) {
      session.clear();
    }
  }

  const elapsed = Math.max(0.1, Number((performance.now() - startMs).toFixed(2)));
  const byCategory = { ...emptyCounts, ...redacted.categoryCounts };

  return {
    detections,
    sanitizedText: redacted.sanitizedText,
    outputSegments: redacted.spans,
    csvWarnings: [],
    stats: {
      totalDetected: detections.length,
      totalRedacted: redacted.redactedCount,
      byCategory,
      processingTimeMs: elapsed,
      inputChars: inputMetrics.chars,
      outputChars: redacted.sanitizedText.length,
      lineCount: inputMetrics.lines,
      csvRows: 0,
      csvCols: 0,
    },
  };
}

function getMatchedCategories(byCategory) {
  return ALL_PII_TYPES.filter((type) => (byCategory?.[type] ?? 0) > 0);
}

export function useSanitizer() {
  const [inputText, setInputText] = useState('');
  const [committedText, setCommittedText] = useState('');
  const [autoScan, setAutoScan] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSeq, setScanSeq] = useState(0);
  const [documentFormat, setDocumentFormatState] = useState('txt');
  const [fileMeta, setFileMeta] = useState(null);
  const [redactionMode, setRedactionModeState] = useState(REDACTION_MODES.PSEUDONYM);
  const [enabledTypes, setEnabledTypes] = useState(ALL_PII_TYPES);
  const [processingEngine, setProcessingEngineState] = useState('local');
  const [serverStatus, setServerStatus] = useState('idle');
  const [localAnalysis, setLocalAnalysis] = useState(() => createEmptyAnalysis());
  const [serverAnalysis, setServerAnalysis] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);

  const scanAnimTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastTypingAuditRef = useRef(0);

  useEffect(() => {
    return () => {
      if (scanAnimTimerRef.current) clearTimeout(scanAnimTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const pulseScanAnimation = useCallback(() => {
    if (scanAnimTimerRef.current) {
      clearTimeout(scanAnimTimerRef.current);
    }
    setIsScanning(true);
    setScanSeq((prev) => prev + 1);
    scanAnimTimerRef.current = setTimeout(() => {
      setIsScanning(false);
    }, 520);
  }, []);

  const appendAudit = useCallback((event, status, details, extra = {}) => {
    setAuditEvents((prev) =>
      [createAuditEntry(event, status, details, extra), ...prev].slice(0, 60)
    );
  }, []);

  const clearMessages = useCallback(() => {
    setErrorMessage(null);
    setStatusMessage(null);
  }, []);

  const activeSourceText = autoScan ? inputText : committedText;
  const hasPendingManualScan = !autoScan && inputText !== committedText;

  const runAndCommitLocal = useCallback(
    (sourceText, rawInput, format, types, mode) => {
      const result = executeLocalPipeline(sourceText, rawInput, format, types, mode);
      setLocalAnalysis(result);
      return result;
    },
    []
  );

  const checkServerHealth = useCallback(async () => {
    setServerStatus('checking');
    try {
      const health = await checkBackendHealth();
      setServerStatus('online');
      return { ok: true, health };
    } catch (err) {
      setServerStatus('offline');
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'FastAPI backend is unreachable.',
      };
    }
  }, []);

  const setProcessingEngine = useCallback(
    async (nextEngine) => {
      const normalized = nextEngine === 'server' ? 'server' : 'local';
      setErrorMessage(null);
      setStatusMessage(null);
      setProcessingEngineState(normalized);

      if (normalized === 'local') {
        setServerAnalysis(null);
        setServerStatus('idle');
        runAndCommitLocal(activeSourceText, inputText, documentFormat, enabledTypes, redactionMode);
        appendAudit(
          'Processing Mode Changed',
          'info',
          'Switched to 100% Local Browser RAM processing (zero network calls)'
        );
        setStatusMessage('Switched to Local Browser Mode (100% offline-capable).');
        return;
      }

      appendAudit(
        'Processing Mode Changed',
        'info',
        'Switched to FastAPI Server API (/api/redact & /api/upload)'
      );
      const check = await checkServerHealth();
      if (check.ok) {
        setStatusMessage('Connected to PrivacyGuard FastAPI backend (/api).');
      } else {
        setErrorMessage(
          `FastAPI backend unreachable (${check.error}). Start uvicorn or switch back to Local Browser mode.`
        );
      }
    },
    [
      activeSourceText,
      appendAudit,
      checkServerHealth,
      documentFormat,
      enabledTypes,
      inputText,
      redactionMode,
      runAndCommitLocal,
    ]
  );

  // Sync FastAPI /api/redact when Server API mode is active
  useEffect(() => {
    if (processingEngine !== 'server' || !activeSourceText) {
      return undefined;
    }

    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setIsScanning(true);
      }
    });

    redactViaBackend({
      text: activeSourceText,
      mode: redactionMode,
      enabledTypes,
      format: documentFormat,
      signal: controller.signal,
    })
      .then((data) => {
        setServerStatus('online');
        setServerAnalysis(mapServerResponse(data));
        setErrorMessage(null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setServerStatus('offline');
        setErrorMessage(
          err instanceof Error
            ? `FastAPI server error: ${err.message}`
            : 'Unable to reach FastAPI backend.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsScanning(false);
        }
      });

    return () => controller.abort();
  }, [processingEngine, activeSourceText, redactionMode, enabledTypes, documentFormat]);

  const analysis = useMemo(() => {
    if (processingEngine === 'server' && activeSourceText && serverAnalysis) {
      return serverAnalysis;
    }
    if (!activeSourceText) {
      const metrics = getTextMetrics(inputText);
      return createEmptyAnalysis(metrics.chars, metrics.lines);
    }
    return localAnalysis;
  }, [processingEngine, activeSourceText, serverAnalysis, inputText, localAnalysis]);

  const setDocumentFormat = useCallback(
    (nextFormat) => {
      const normalized = nextFormat === 'csv' ? 'csv' : 'txt';
      setDocumentFormatState(normalized);
      if (processingEngine === 'local') {
        runAndCommitLocal(activeSourceText, inputText, normalized, enabledTypes, redactionMode);
      }
      appendAudit(
        'Format Mode Changed',
        'info',
        `Switched parser format to ${normalized.toUpperCase()}`
      );
    },
    [activeSourceText, appendAudit, enabledTypes, inputText, processingEngine, redactionMode, runAndCommitLocal]
  );

  const setRedactionMode = useCallback(
    (nextMode) => {
      setRedactionModeState(nextMode);
      setStatusMessage(null);
      if (processingEngine === 'local') {
        runAndCommitLocal(activeSourceText, inputText, documentFormat, enabledTypes, nextMode);
      }
      appendAudit('Redaction Mode Changed', 'info', `Active redaction mode set to ${nextMode}`);
    },
    [activeSourceText, appendAudit, documentFormat, enabledTypes, inputText, processingEngine, runAndCommitLocal]
  );

  const triggerScan = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setErrorMessage(null);
    if (!inputText) {
      setCommittedText('');
      setServerAnalysis(null);
      setLocalAnalysis(createEmptyAnalysis());
      return;
    }
    setCommittedText(inputText);
    if (processingEngine === 'local') {
      const result = runAndCommitLocal(
        inputText,
        inputText,
        documentFormat,
        enabledTypes,
        redactionMode
      );
      pulseScanAnimation();
      const matchedCats = getMatchedCategories(result.stats.byCategory);
      appendAudit(
        'Detection & Sanitization Completed',
        'success',
        `Scanned ${inputText.length} chars (${documentFormat.toUpperCase()}, mode: ${redactionMode}) — ${result.stats.totalDetected} entities matched`,
        {
          categories: matchedCats,
          count: result.stats.totalDetected,
          redactionStatus: 'Sanitized',
        }
      );
      setStatusMessage(`Local scan complete: ${result.stats.totalDetected} sensitive entities processed.`);
    }
  }, [
    appendAudit,
    documentFormat,
    enabledTypes,
    inputText,
    processingEngine,
    pulseScanAnimation,
    redactionMode,
    runAndCommitLocal,
  ]);

  const handleTextChange = useCallback(
    (nextText) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setErrorMessage(null);
      setStatusMessage(null);
      setInputText(nextText);

      if (!nextText) {
        setCommittedText('');
        setServerAnalysis(null);
        setFileMeta(null);
        setLocalAnalysis(createEmptyAnalysis());
        return;
      }

      if (!autoScan) {
        // Update raw character/line counters without running detections
        setLocalAnalysis((prev) => {
          const metrics = getTextMetrics(nextText);
          return {
            ...prev,
            stats: { ...prev.stats, inputChars: metrics.chars, lineCount: metrics.lines },
          };
        });
        return;
      }

      setCommittedText(nextText);
      if (processingEngine !== 'local') {
        return;
      }

      const executeAndLog = () => {
        const result = runAndCommitLocal(
          nextText,
          nextText,
          documentFormat,
          enabledTypes,
          redactionMode
        );
        const now = Date.now();
        if (now - lastTypingAuditRef.current > 1200) {
          lastTypingAuditRef.current = now;
          appendAudit(
            'Detection & Sanitization Completed',
            'success',
            `Processed ${nextText.length} characters locally (${documentFormat.toUpperCase()}, mode: ${redactionMode})`,
            {
              categories: getMatchedCategories(result.stats.byCategory),
              count: result.stats.totalDetected,
              redactionStatus: 'Sanitized',
            }
          );
        }
      };

      if (nextText.length > LARGE_TEXT_DEBOUNCE_THRESHOLD) {
        debounceTimerRef.current = setTimeout(executeAndLog, LARGE_TEXT_DEBOUNCE_MS);
      } else {
        executeAndLog();
      }
    },
    [appendAudit, autoScan, documentFormat, enabledTypes, processingEngine, redactionMode, runAndCommitLocal]
  );

  const handleFileUpload = useCallback(
    async (file) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setErrorMessage(null);
      setStatusMessage(null);
      const res = await readValidatedTextFile(file);
      if (!res.ok) {
        setErrorMessage(res.error);
        appendAudit('File Validation Failed', 'error', res.error);
        return false;
      }

      const fmt = res.extension === '.csv' ? 'csv' : 'txt';
      setFileMeta({ name: file.name, size: file.size });
      setDocumentFormatState(fmt);
      setInputText(res.content);
      setCommittedText(res.content);

      if (processingEngine === 'server') {
        try {
          setIsScanning(true);
          const serverData = await uploadAndRedactViaBackend({
            file,
            mode: redactionMode,
            enabledTypes,
          });
          setServerStatus('online');
          setServerAnalysis(mapServerResponse(serverData));
          appendAudit(
            'Document Uploaded to FastAPI',
            'success',
            `Processed ${fmt.toUpperCase()} (${file.size} bytes) via POST /api/upload`,
            {
              count: serverData.total_detected ?? 0,
              redactionStatus: 'Sanitized',
            }
          );
          setStatusMessage(`Processed "${file.name}" via FastAPI /api/upload.`);
          return true;
        } catch (err) {
          setServerStatus('offline');
          const msg = err instanceof Error ? err.message : 'FastAPI upload failed.';
          setErrorMessage(msg);
          appendAudit('Server Upload Failed', 'error', msg);
          return false;
        } finally {
          setIsScanning(false);
        }
      }

      const result = runAndCommitLocal(res.content, res.content, fmt, enabledTypes, redactionMode);
      pulseScanAnimation();
      const matchedCats = getMatchedCategories(result.stats.byCategory);
      appendAudit(
        'Document Loaded',
        'success',
        `Loaded ${fmt.toUpperCase()} file (${file.size} bytes) strictly in browser memory`
      );
      appendAudit(
        'Detection & Sanitization Completed',
        'success',
        `Scanned ${res.content.length} characters (${fmt.toUpperCase()}, mode: ${redactionMode})`,
        {
          categories: matchedCats,
          count: result.stats.totalDetected,
          redactionStatus: 'Sanitized',
        }
      );
      setStatusMessage(`Loaded "${file.name}" locally in browser memory.`);
      return true;
    },
    [appendAudit, enabledTypes, processingEngine, pulseScanAnimation, redactionMode, runAndCommitLocal]
  );

  const loadSampleData = useCallback(
    (format = 'txt') => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setErrorMessage(null);
      setStatusMessage(null);
      const isCsv = format === 'csv';
      const content = isCsv ? SYNTHETIC_SAMPLE_CSV : SYNTHETIC_SAMPLE_TEXT;
      const fmt = isCsv ? 'csv' : 'txt';
      setDocumentFormatState(fmt);
      setFileMeta({
        name: isCsv ? 'synthetic-sample.csv' : 'synthetic-sample.txt',
        size: content.length,
      });
      setInputText(content);
      setCommittedText(content);

      if (processingEngine === 'local') {
        const result = runAndCommitLocal(content, content, fmt, enabledTypes, redactionMode);
        pulseScanAnimation();
        const matchedCats = getMatchedCategories(result.stats.byCategory);
        appendAudit(
          'Document Loaded',
          'info',
          `Loaded synthetic ${fmt.toUpperCase()} sample (${content.length} chars)`
        );
        appendAudit(
          'Detection & Sanitization Completed',
          'success',
          `Sanitized synthetic ${fmt.toUpperCase()} sample locally (mode: ${redactionMode})`,
          {
            categories: matchedCats,
            count: result.stats.totalDetected,
            redactionStatus: 'Sanitized',
          }
        );
      } else {
        appendAudit(
          'Sample Sent to FastAPI',
          'info',
          `Loaded synthetic ${fmt.toUpperCase()} sample for server sanitization`
        );
      }
      setStatusMessage(`Loaded synthetic ${fmt.toUpperCase()} sample fixture.`);
    },
    [appendAudit, enabledTypes, processingEngine, pulseScanAnimation, redactionMode, runAndCommitLocal]
  );

  const toggleCategory = useCallback(
    (category) => {
      setEnabledTypes((prev) => {
        const exists = prev.includes(category);
        const next = exists
          ? prev.filter((item) => item !== category)
          : [...prev, category];
        if (processingEngine === 'local') {
          runAndCommitLocal(activeSourceText, inputText, documentFormat, next, redactionMode);
        }
        appendAudit(
          'Detector Filter Updated',
          'info',
          `${category} ${exists ? 'disabled' : 'enabled'} (${next.length}/${ALL_PII_TYPES.length} active)`
        );
        return next;
      });
    },
    [activeSourceText, appendAudit, documentFormat, inputText, processingEngine, redactionMode, runAndCommitLocal]
  );

  const toggleAllCategories = useCallback(
    (enableAll) => {
      const next = enableAll ? ALL_PII_TYPES : [];
      setEnabledTypes(next);
      if (processingEngine === 'local') {
        runAndCommitLocal(activeSourceText, inputText, documentFormat, next, redactionMode);
      }
      appendAudit(
        'Detector Filters Updated',
        'info',
        `${enableAll ? 'Enabled' : 'Disabled'} all ${ALL_PII_TYPES.length} PII categories`
      );
    },
    [activeSourceText, appendAudit, documentFormat, inputText, processingEngine, redactionMode, runAndCommitLocal]
  );

  const handleExportDocument = useCallback(
    (format = documentFormat) => {
      if (analysis.csvWarnings.length > 0) {
        setErrorMessage(analysis.csvWarnings[0]);
        appendAudit('Export Blocked', 'error', 'Cannot export malformed CSV input', {
          exportStatus: 'Blocked',
        });
        return;
      }
      const targetFormat = format === 'csv' ? 'csv' : 'txt';
      const mimeType =
        targetFormat === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
      const filename = buildExportFilename(targetFormat, fileMeta?.name);
      const res = downloadBlobFile(analysis.sanitizedText, filename, mimeType);
      if (!res.ok) {
        setErrorMessage(res.error);
        appendAudit('Export Failed', 'error', res.error, { exportStatus: 'Failed' });
        return;
      }
      setStatusMessage(`Downloaded ${res.filename}`);
      appendAudit(
        'Export Completed',
        'success',
        `Exported sanitized ${targetFormat.toUpperCase()} (${analysis.stats.totalRedacted} redactions)`,
        { exportStatus: `Exported .${targetFormat}` }
      );
    },
    [analysis, appendAudit, documentFormat, fileMeta]
  );

  const handleExportAuditJSON = useCallback(() => {
    const json = buildSanitizedAuditJson({
      mode: redactionMode,
      inputFormat: documentFormat,
      stats: {
        totalDetected: analysis.stats.totalDetected,
        totalRedacted: analysis.stats.totalRedacted,
        categoryCounts: analysis.stats.byCategory,
        processingTimeMs: analysis.stats.processingTimeMs,
        inputChars: analysis.stats.inputChars,
        outputChars: analysis.stats.outputChars,
      },
      enabledTypes,
      events: auditEvents.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        action: e.event,
        status: e.status,
        detail: e.details,
      })),
    });
    const filename = buildExportFilename('json', 'audit-report');
    const res = downloadBlobFile(json, filename, 'application/json;charset=utf-8');
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }
    setStatusMessage(`Downloaded sanitized audit report (${res.filename})`);
    appendAudit(
      'Audit Report Exported',
      'success',
      'Exported aggregate JSON audit report (0 raw PII included)',
      { exportStatus: 'Exported .json' }
    );
  }, [analysis.stats, appendAudit, auditEvents, documentFormat, enabledTypes, redactionMode]);

  const handleCopySanitized = useCallback(async () => {
    const res = await copyTextToClipboard(analysis.sanitizedText);
    if (!res.ok) {
      setErrorMessage(res.error);
      return false;
    }
    setStatusMessage('Sanitized output copied to clipboard.');
    appendAudit(
      'Output Copied',
      'success',
      `Copied ${analysis.stats.outputChars} sanitized characters to clipboard`,
      { exportStatus: 'Copied' }
    );
    return true;
  }, [analysis.sanitizedText, analysis.stats.outputChars, appendAudit]);

  const handleReset = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (scanAnimTimerRef.current) clearTimeout(scanAnimTimerRef.current);
    lastTypingAuditRef.current = 0;
    setInputText('');
    setCommittedText('');
    setServerAnalysis(null);
    setLocalAnalysis(createEmptyAnalysis());
    setIsScanning(false);
    setDocumentFormatState('txt');
    setFileMeta(null);
    setErrorMessage(null);
    setStatusMessage('Workspace cleared. All input, output, and in-memory mappings wiped.');
    setAuditEvents([]);
  }, []);

  return {
    inputText,
    autoScan,
    setAutoScan,
    hasPendingManualScan,
    isScanning,
    scanSeq,
    triggerScan,
    documentFormat,
    setDocumentFormat,
    fileMeta,
    redactionMode,
    setRedactionMode,
    enabledTypes,
    processingEngine,
    setProcessingEngine,
    serverStatus,
    checkServerHealth,
    errorMessage,
    statusMessage,
    csvWarnings: analysis.csvWarnings,
    auditEvents,
    detections: analysis.detections,
    sanitizedText: analysis.sanitizedText,
    outputSegments: analysis.outputSegments,
    stats: analysis.stats,
    clearMessages,
    handleTextChange,
    handleFileUpload,
    loadSampleData,
    toggleCategory,
    toggleAllCategories,
    handleExportDocument,
    handleExportAuditJSON,
    handleCopySanitized,
    handleReset,
  };
}
