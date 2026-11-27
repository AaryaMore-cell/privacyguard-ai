import { detectAllPII } from '../engine/detectPII.js';
import { createPseudonymSession, REDACTION_MODES, redactText } from '../engine/redactPII.js';

const CSV_ESCAPE_TRIGGER_RE = /[",\r\n]/;

/**
 * RFC-4180 compliant CSV parser using slice-buffered field chunks instead of char-by-char
 * string concatenation, handling quoted fields, embedded commas, escaped quotes (""), and CRLF/LF.
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
  let fieldChunks = [];
  let sliceStart = 0;
  let inQuotes = false;
  let fieldStarted = false;

  const flushField = (endIdx) => {
    if (fieldChunks.length === 0) {
      currentRow.push(text.slice(sliceStart, endIdx));
    } else {
      if (endIdx > sliceStart) {
        fieldChunks.push(text.slice(sliceStart, endIdx));
      }
      currentRow.push(fieldChunks.join(''));
      fieldChunks = [];
    }
    fieldStarted = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          fieldChunks.push(text.slice(sliceStart, i + 1));
          i += 1;
          sliceStart = i + 1;
        } else {
          fieldChunks.push(text.slice(sliceStart, i));
          inQuotes = false;
          sliceStart = i + 1;
        }
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
      sliceStart = i + 1;
    } else if (ch === ',') {
      flushField(i);
      sliceStart = i + 1;
    } else if (ch === '\r' || ch === '\n') {
      flushField(i);
      rows.push(currentRow);
      currentRow = [];
      if (ch === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      sliceStart = i + 1;
    } else {
      fieldStarted = true;
    }
  }

  if (inQuotes) {
    return {
      ok: false,
      error: `Malformed CSV: unclosed quotation mark starting in row ${rows.length + 1}.`,
    };
  }

  if (fieldStarted || currentRow.length > 0 || sliceStart < text.length) {
    flushField(text.length);
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

  const serializedRows = new Array(rows.length);
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    const serializedCells = new Array(row.length);
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];
      const str = cell == null ? '' : String(cell);
      serializedCells[c] = CSV_ESCAPE_TRIGGER_RE.test(str)
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }
    serializedRows[r] = serializedCells.join(',');
  }
  return serializedRows.join('\n');
}

/**
 * Runs PII detection and redaction cell-by-cell across a CSV document while preserving
 * row/column structure, quoted values, commas, and embedded newlines.
 * Shares a single in-memory pseudonym session across the entire CSV when in pseudonym mode.
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

  try {
    const sanitizedRows = parsed.rows.map((row) =>
      row.map((cell) => {
        if (!cell) return '';
        const detections = detectAllPII(cell, enabledTypes);
        totalDetections += detections.length;
        if (detections.length === 0) {
          return cell;
        }
        const result = redactText(cell, detections, mode, session);
        redactedCount += result.redactedCount;

        for (const [type, count] of Object.entries(result.categoryCounts)) {
          categoryCounts[type] = (categoryCounts[type] || 0) + count;
        }
        return result.sanitizedText;
      })
    );

    return {
      ok: true,
      rows: parsed.rows,
      sanitizedRows,
      sanitizedText: serializeCsv(sanitizedRows),
      totalDetections,
      redactedCount,
      categoryCounts,
    };
  } finally {
    if (session) {
      session.clear();
    }
  }
}
