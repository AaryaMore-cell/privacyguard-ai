export const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = ['.txt', '.csv'];
const ALLOWED_MIME_TYPES = new Set([
  '',
  'text/plain',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/x-csv',
]);

/**
 * Formats byte size into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extracts lowercase extension including leading dot.
 * @param {string} filename
 * @returns {string}
 */
export function getFileExtension(filename) {
  if (typeof filename !== 'string') return '';
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return '';
  return filename.slice(idx).toLowerCase();
}

/**
 * Validates file extension, MIME type, non-empty size, and configurable size limit.
 * @param {File | { name: string, size: number, type?: string }} file
 * @param {number} [maxBytes]
 * @returns {{ valid: boolean, extension: string, error?: string }}
 */
export function validateUploadedFile(file, maxBytes = DEFAULT_MAX_FILE_SIZE_BYTES) {
  if (!file || typeof file.name !== 'string') {
    return { valid: false, extension: '', error: 'No valid file selected.' };
  }

  const extension = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      extension,
      error: `Unsupported file type "${extension || 'unknown'}". Only .txt and .csv files are accepted.`,
    };
  }

  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      extension,
      error: `Unsupported MIME type "${file.type}". Only plain text (.txt) and CSV (.csv) files are allowed.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      extension,
      error: 'The selected file is empty (0 bytes). Please provide a file with text content.',
    };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      extension,
      error: `File size (${formatFileSize(file.size)}) exceeds the ${formatFileSize(maxBytes)} limit.`,
    };
  }

  return { valid: true, extension };
}

/**
 * Reads an uploaded File strictly as UTF-8 in the browser and checks for encoding errors.
 * @param {File} file
 * @param {number} [maxBytes]
 * @returns {Promise<{ ok: boolean, content?: string, extension?: string, error?: string }>}
 */
export async function readValidatedTextFile(file, maxBytes = DEFAULT_MAX_FILE_SIZE_BYTES) {
  const check = validateUploadedFile(file, maxBytes);
  if (!check.valid) {
    return { ok: false, error: check.error };
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 1) {
      if (bytes[i] === 0) {
        return {
          ok: false,
          error: 'Binary null-byte content detected. Only plain UTF-8 text or CSV files are allowed.',
        };
      }
    }

    const decoder = new TextDecoder('utf-8', { fatal: true });
    let content = decoder.decode(bytes);

    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    if (content.trim().length === 0) {
      return {
        ok: false,
        error: 'The file contains only whitespace and no readable text.',
      };
    }

    return { ok: true, content, extension: check.extension };
  } catch {
    return {
      ok: false,
      error: 'Unable to decode file as valid UTF-8 text. Please ensure the file is not binary or corrupted.',
    };
  }
}

/**
 * Returns character and line statistics for text input.
 * @param {string} text
 * @returns {{ chars: number, lines: number }}
 */
export function getTextMetrics(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { chars: 0, lines: 0 };
  }
  const lines = text.split(/\r\n|\r|\n/).length;
  return { chars: text.length, lines };
}
