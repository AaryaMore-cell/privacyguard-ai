/**
 * Browser export utilities using Blob and URL.createObjectURL.
 * Never exports raw PII or pseudonym mapping tables in audit reports.
 */

function formatTimestampForFile(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

/**
 * Triggers a browser file download from string content using Blob and revokes the URL cleanly.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 * @returns {{ ok: boolean, filename?: string, error?: string }}
 */
export function downloadBlobFile(content, filename, mimeType) {
  if (typeof content !== 'string' || content.length === 0) {
    return { ok: false, error: 'Nothing to export. Please enter or load text first.' };
  }

  let objectUrl = null;
  try {
    const blob = new Blob([content], { type: mimeType });
    objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { ok: true, filename };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Failed to generate download file in this browser.',
    };
  } finally {
    if (objectUrl) {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }
}

/**
 * Generates a meaningful filename for sanitized document exports.
 * @param {'txt' | 'csv'} format
 * @param {string} [sourceName]
 * @returns {string}
 */
export function buildExportFilename(format, sourceName = '') {
  const stamp = formatTimestampForFile();
  const safeBase = sourceName
    ? sourceName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)
    : 'document';
  return `privacyguard-${safeBase}-sanitized-${stamp}.${format}`;
}

/**
 * Builds a sanitized JSON audit report containing only aggregate counts, settings, and non-PII events.
 * @param {Object} params
 * @returns {string}
 */
export function buildSanitizedAuditJson({
  mode,
  inputFormat,
  stats,
  enabledTypes,
  events,
}) {
  const report = {
    application: 'PrivacyGuard AI',
    processingMode: '100% Client-Side Browser Processing',
    exportedAt: new Date().toISOString(),
    settings: {
      redactionMode: mode,
      inputFormat,
      enabledCategories: [...enabledTypes],
    },
    summary: {
      totalDetected: stats.totalDetected,
      totalRedacted: stats.totalRedacted,
      categoryCounts: { ...stats.categoryCounts },
      processingTimeMs: stats.processingTimeMs,
      inputCharacters: stats.inputChars,
      outputCharacters: stats.outputChars,
    },
    auditEvents: events.map((evt) => ({
      id: evt.id,
      timestamp: evt.timestamp,
      action: evt.action,
      status: evt.status,
      detail: evt.detail,
    })),
    privacyNotice:
      'No raw PII, original document text, or pseudonymization mappings are included in this report.',
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Copies sanitized text to clipboard with error handling.
 * @param {string} text
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function copyTextToClipboard(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, error: 'No sanitized text available to copy.' };
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
    return { ok: false, error: 'Clipboard API is unavailable in this browser context.' };
  } catch {
    return { ok: false, error: 'Failed to copy text to clipboard.' };
  }
}
