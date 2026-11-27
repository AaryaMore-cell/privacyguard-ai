import { detectAllPII } from '../engine/detectPII.js';
import { createPseudonymSession, REDACTION_MODES, redactText } from '../engine/redactPII.js';

/**
 * RFC-4180 compliant CSV parser supporting quoted fields, embedded commas,
 * escaped quotes (""), and CRLF/LF newlines inside quoted values.
 * Rejects malformed unclosed quotes cleanly with an error description.
 *
 * @param {string} text
 * @returns {{ ok: boolean, rows?: string[][], error?: string }}
 */
export function parseCsv(text) {
  if (typeof text !== 'string') {
    return { ok: false, error: 'CSV input must be a string.' };
  }
  if (text.length === 0) {
    return { ok: true, rows: [] };
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let fieldStarted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (fieldStarted) {
        return {
          ok: false,
          error: `Malformed CSV: unexpected quote inside unquoted field at row ${rows.length + 1}.`,
        };
      }
      inQuotes = true;
      fieldStarted = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
      fieldStarted = false;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      fieldStarted = false;
    } else {
      currentField += ch;
      fieldStarted = true;
    }
  }

  if (inQuotes) {
    return {
      ok: false,
      error: `Malformed CSV: unclosed quotation mark starting in row ${rows.length + 1}.`,
    };
  }

  // Push final row if non-empty or trailing comma present
  if (fieldStarted || currentRow.length > 0 || currentField.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return { ok: true, rows };
}

/**
 * Escapes and serializes a 2D array of strings back into valid RFC-4180 CSV text.
 * @param {string[][]} rows
 * @returns {string}
 */
export function serializeCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell == null ? '' : String(cell);
          if (/[",\r\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Runs PII detection and redaction cell-by-cell across a CSV document while preserving
 * row/column structure, quoted values, commas, and embedded newlines.
 * Shares a single in-memory pseudonym session across the entire CSV when in pseudonym mode.
 *
 * @param {string} csvText
 * @param {string[]} enabledTypes
 * @param {string} mode
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   rows?: string[][],
 *   sanitizedRows?: string[][],
 *   sanitizedText?: string,
 *   totalDetections?: number,
 *   redactedCount?: number,
 *   categoryCounts?: Record<string, number>
 * }}
 */
export function processCsvDocument(csvText, enabledTypes, mode) {
  const parsed = parseCsv(csvText);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const session =
    mode === REDACTION_MODES.PSEUDONYM ? createPseudonymSession() : undefined;

  let totalDetections = 0;
  let redactedCount = 0;
  const categoryCounts = {};

  const sanitizedRows = parsed.rows.map((row) =>
    row.map((cell) => {
      const detections = detectAllPII(cell, enabledTypes);
      totalDetections += detections.length;
      const result = redactText(cell, detections, mode, session);
      redactedCount += result.redactedCount;

      for (const [type, count] of Object.entries(result.categoryCounts)) {
        categoryCounts[type] = (categoryCounts[type] || 0) + count;
      }
      return result.sanitizedText;
    })
  );

  if (session) {
    session.clear();
  }

  return {
    ok: true,
    rows: parsed.rows,
    sanitizedRows,
    sanitizedText: serializeCsv(sanitizedRows),
    totalDetections,
    redactedCount,
    categoryCounts,
  };
}
