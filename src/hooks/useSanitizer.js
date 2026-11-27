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

function mapServerResponse(data, emptyCounts) {
  return {
    detections: data.detections || [],
    sanitizedText: data.sanitized_text || '',
    outputSegments: data.output_spans || [],
    csvWarnings: data.csv_warnings || [],
    stats: {
      totalDetected: data.total_detected ?? 0,
      totalRedacted: data.total_redacted ?? 0,
      byCategory: { ...emptyCounts, ...(data.category_counts || {}) },
      processingTimeMs: data.processing_time_ms ?? 0,
      inputChars: data.input_chars ?? 0,
      outputChars: data.output_chars ?? 0,
      lineCount: data.line_count ?? 0,
      csvRows: data.csv_rows ?? 0,
      csvCols: data.csv_cols ?? 0,
    },
  };
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
  const [processingEngine, setProcessingEngineState] = useState('local'); // 'local' | 'server'
  const [serverStatus, setServerStatus] = useState('idle'); // 'idle' | 'checking' | 'online' | 'offline'
  const [serverAnalysis, setServerAnalysis] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const [auditEvents, setAuditEvents] = useState([]);
  const scanTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const pulseScanAnimation = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }
    setIsScanning(true);
    setScanSeq((prev) => prev + 1);
    scanTimerRef.current = setTimeout(() => {
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
    [appendAudit, checkServerHealth]
  );

  // Run FastAPI /api/redact automatically when Server API mode is active
  useEffect(() => {
    if (processingEngine !== 'server' || !activeSourceText) {
      return undefined;
    }

    const controller = new AbortController();
    const emptyCounts = Object.fromEntries(ALL_PII_TYPES.map((t) => [t, 0]));

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
        setServerAnalysis(mapServerResponse(data, emptyCounts));
        setProcessingTimeMs(data.processing_time_ms ?? 0);
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

  const measurePipelineMs = useCallback((text, format, types, mode) => {
    if (!text) return 0;
    const t0 = performance.now();
    if (format === 'csv') {
      processCsvDocument(text, types, mode);
    } else {
      const detections = detectAllPII(text, types);
      const session = mode === REDACTION_MODES.PSEUDONYM ? createPseudonymSession() : undefined;
      redactText(text, detections, mode, session);
      if (session) session.clear();
    }
    return Math.max(0.1, Number((performance.now() - t0).toFixed(2)));
  }, []);

  const localAnalysis = useMemo(() => {
    const emptyCounts = Object.fromEntries(ALL_PII_TYPES.map((t) => [t, 0]));
    const inputMetrics = getTextMetrics(inputText);

    if (!activeSourceText) {
      return {
        detections: [],
        sanitizedText: '',
        outputSegments: [],
        csvWarnings: [],
        stats: {
          totalDetected: 0,
          totalRedacted: 0,
          byCategory: emptyCounts,
          processingTimeMs: 0,
          inputChars: inputMetrics.chars,
          outputChars: 0,
          lineCount: inputMetrics.lines,
          csvRows: 0,
          csvCols: 0,
        },
      };
    }

    if (documentFormat === 'csv') {
      const csvResult = processCsvDocument(activeSourceText, enabledTypes, redactionMode);
      const detections = detectAllPII(activeSourceText, enabledTypes);

      if (!csvResult.ok) {
        return {
          detections,
          sanitizedText: '',
          outputSegments: [],
          csvWarnings: [csvResult.error],
          stats: {
            totalDetected: detections.length,
            totalRedacted: 0,
            byCategory: emptyCounts,
            processingTimeMs,
            inputChars: inputMetrics.chars,
            outputChars: 0,
            lineCount: inputMetrics.lines,
            csvRows: 0,
            csvCols: 0,
          },
        };
      }

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
          processingTimeMs,
          inputChars: inputMetrics.chars,
          outputChars: csvResult.sanitizedText.length,
          lineCount: inputMetrics.lines,
          csvRows: csvResult.rows.length,
          csvCols: maxCols,
        },
      };
    }

    const detections = detectAllPII(activeSourceText, enabledTypes);
    const session =
      redactionMode === REDACTION_MODES.PSEUDONYM ? createPseudonymSession() : undefined;
    const redacted = redactText(activeSourceText, detections, redactionMode, session);
    if (session) {
      session.clear();
    }

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
        processingTimeMs,
        inputChars: inputMetrics.chars,
        outputChars: redacted.sanitizedText.length,
        lineCount: inputMetrics.lines,
        csvRows: 0,
        csvCols: 0,
      },
    };
  }, [activeSourceText, inputText, documentFormat, enabledTypes, redactionMode, processingTimeMs]);

  const analysis =
    processingEngine === 'server' && activeSourceText && serverAnalysis
      ? serverAnalysis
      : localAnalysis;

  const setDocumentFormat = useCallback(
    (nextFormat) => {
      const normalized = nextFormat === 'csv' ? 'csv' : 'txt';
      setDocumentFormatState(normalized);
      if (processingEngine === 'local') {
        setProcessingTimeMs(
          measurePipelineMs(activeSourceText, normalized, enabledTypes, redactionMode)
        );
      }
      appendAudit(
        'Format Mode Changed',
        'info',
        `Switched parser format to ${normalized.toUpperCase()}`
      );
    },
    [activeSourceText, appendAudit, enabledTypes, measurePipelineMs, processingEngine, redactionMode]
  );

  const setRedactionMode = useCallback(
    (nextMode) => {
      setRedactionModeState(nextMode);
      setStatusMessage(null);
      if (processingEngine === 'local') {
        setProcessingTimeMs(
          measurePipelineMs(activeSourceText, documentFormat, enabledTypes, nextMode)
        );
      }
      appendAudit('Redaction Mode Changed', 'info', `Active redaction mode set to ${nextMode}`);
    },
    [activeSourceText, appendAudit, documentFormat, enabledTypes, measurePipelineMs, processingEngine]
  );

  const triggerScan = useCallback(() => {
    setErrorMessage(null);
    if (!inputText) {
      setCommittedText('');
      setServerAnalysis(null);
      setProcessingTimeMs(0);
      return;
    }
    setCommittedText(inputText);
    if (processingEngine === 'local') {
      setProcessingTimeMs(measurePipelineMs(inputText, documentFormat, enabledTypes, redactionMode));
      pulseScanAnimation();
      const detections = detectAllPII(inputText, enabledTypes);
      const matchedCats = [...new Set(detections.map((d) => d.type))];
      appendAudit(
        'Detection & Sanitization Completed',
        'success',
        `Scanned ${inputText.length} chars (${documentFormat.toUpperCase()}, mode: ${redactionMode}) — ${detections.length} entities matched`,
        {
          categories: matchedCats,
          count: detections.length,
          redactionStatus: 'Sanitized',
        }
      );
      setStatusMessage(`Local scan complete: ${detections.length} sensitive entities processed.`);
    }
  }, [
    appendAudit,
    documentFormat,
    enabledTypes,
    inputText,
    measurePipelineMs,
    processingEngine,
    pulseScanAnimation,
    redactionMode,
  ]);

  const handleTextChange = useCallback(
    (nextText) => {
      setErrorMessage(null);
      setStatusMessage(null);
      setInputText(nextText);
      if (!nextText) {
        setCommittedText('');
        setServerAnalysis(null);
        setFileMeta(null);
        setProcessingTimeMs(0);
        return;
      }
      if (autoScan) {
        setCommittedText(nextText);
        if (processingEngine === 'local') {
          setProcessingTimeMs(
            measurePipelineMs(nextText, documentFormat, enabledTypes, redactionMode)
          );
          const detections = detectAllPII(nextText, enabledTypes);
          const matchedCats = [...new Set(detections.map((d) => d.type))];
          appendAudit(
            'Detection & Sanitization Completed',
            'success',
            `Processed ${nextText.length} characters locally (${documentFormat.toUpperCase()}, mode: ${redactionMode})`,
            {
              categories: matchedCats,
              count: detections.length,
              redactionStatus: 'Sanitized',
            }
          );
        }
      }
    },
    [
      appendAudit,
      autoScan,
      documentFormat,
      enabledTypes,
      measurePipelineMs,
      processingEngine,
      redactionMode,
    ]
  );

  const handleFileUpload = useCallback(
    async (file) => {
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
          const emptyCounts = Object.fromEntries(ALL_PII_TYPES.map((t) => [t, 0]));
          const serverData = await uploadAndRedactViaBackend({
            file,
            mode: redactionMode,
            enabledTypes,
          });
          setServerStatus('online');
          setServerAnalysis(mapServerResponse(serverData, emptyCounts));
          setProcessingTimeMs(serverData.processing_time_ms ?? 0);
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

      setProcessingTimeMs(measurePipelineMs(res.content, fmt, enabledTypes, redactionMode));
      pulseScanAnimation();

      const detections = detectAllPII(res.content, enabledTypes);
      const matchedCats = [...new Set(detections.map((d) => d.type))];
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
          count: detections.length,
          redactionStatus: 'Sanitized',
        }
      );
      setStatusMessage(`Loaded "${file.name}" locally in browser memory.`);
      return true;
    },
    [
      appendAudit,
      enabledTypes,
      measurePipelineMs,
      processingEngine,
      pulseScanAnimation,
      redactionMode,
    ]
  );

  const loadSampleData = useCallback(
    (format = 'txt') => {
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
        setProcessingTimeMs(measurePipelineMs(content, fmt, enabledTypes, redactionMode));
        pulseScanAnimation();
        const detections = detectAllPII(content, enabledTypes);
        const matchedCats = [...new Set(detections.map((d) => d.type))];
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
            count: detections.length,
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
    [
      appendAudit,
      enabledTypes,
      measurePipelineMs,
      processingEngine,
      pulseScanAnimation,
      redactionMode,
    ]
  );

  const toggleCategory = useCallback(
    (category) => {
      setEnabledTypes((prev) => {
        const exists = prev.includes(category);
        const next = exists
          ? prev.filter((item) => item !== category)
          : [...prev, category];
        appendAudit(
          'Detector Filter Updated',
          'info',
          `${category} ${exists ? 'disabled' : 'enabled'} (${next.length}/${ALL_PII_TYPES.length} active)`
        );
        return next;
      });
    },
    [appendAudit]
  );

  const toggleAllCategories = useCallback(
    (enableAll) => {
      const next = enableAll ? ALL_PII_TYPES : [];
      setEnabledTypes(next);
      appendAudit(
        'Detector Filters Updated',
        'info',
        `${enableAll ? 'Enabled' : 'Disabled'} all ${ALL_PII_TYPES.length} PII categories`
      );
    },
    [appendAudit]
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
    setInputText('');
    setCommittedText('');
    setServerAnalysis(null);
    setIsScanning(false);
    setProcessingTimeMs(0);
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
