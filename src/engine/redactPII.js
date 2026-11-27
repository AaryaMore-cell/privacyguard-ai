import { PII_TYPES } from './detectPII.js';

export const REDACTION_MODES = {
  FULL: 'full',
  PARTIAL: 'partial',
  PSEUDONYM: 'pseudonym',
};

const PSEUDONYM_PREFIX = {
  [PII_TYPES.EMAIL]: 'USER',
  [PII_TYPES.PHONE]: 'PHONE',
  [PII_TYPES.INDIAN_PAN]: 'PAN',
  [PII_TYPES.AADHAAR]: 'AADHAAR',
  [PII_TYPES.CREDIT_CARD]: 'CARD',
  [PII_TYPES.IPV4]: 'IP',
  [PII_TYPES.IPV6]: 'IPV6',
};

/**
 * Creates a fresh, strictly in-memory pseudonymization session for a single document.
 * Mapping data is never persisted to storage or exposed in audit logs.
 */
export function createPseudonymSession() {
  const categoryMaps = new Map();
  const categoryCounters = new Map();

  return {
    getPlaceholder(type, normalizedValue) {
      if (!categoryMaps.has(type)) {
        categoryMaps.set(type, new Map());
        categoryCounters.set(type, 0);
      }
      const map = categoryMaps.get(type);
      if (map.has(normalizedValue)) {
        return map.get(normalizedValue);
      }

      const nextCount = categoryCounters.get(type) + 1;
      categoryCounters.set(type, nextCount);
      const prefix = PSEUDONYM_PREFIX[type] || type;
      const padded = String(nextCount).padStart(2, '0');
      const placeholder = `${prefix}_${padded}`;
      map.set(normalizedValue, placeholder);
      return placeholder;
    },
    clear() {
      for (const map of categoryMaps.values()) {
        map.clear();
      }
      categoryMaps.clear();
      categoryCounters.clear();
    },
  };
}

/**
 * Masks all digits in a string except the final `keepLast` digits, preserving separators.
 * @param {string} value
 * @param {number} keepLast
 * @param {string} maskChar
 * @returns {string}
 */
function maskAllDigitsExceptLast(value, keepLast = 4, maskChar = '*') {
  const totalDigits = (value.match(/\d/g) || []).length;
  const digitsToMask = Math.max(0, totalDigits - keepLast);
  let seen = 0;

  return value.replace(/\d/g, (digit) => {
    seen += 1;
    return seen <= digitsToMask ? maskChar : digit;
  });
}

/**
 * Applies partial masking tailored to each PII entity category.
 * @param {string} type
 * @param {string} value
 * @returns {string}
 */
export function partialMaskEntity(type, value) {
  switch (type) {
    case PII_TYPES.EMAIL: {
      const atIndex = value.indexOf('@');
      if (atIndex <= 0) return '[REDACTED]';
      const local = value.slice(0, atIndex);
      const domain = value.slice(atIndex + 1);
      const prefixLen = local.length > 3 ? 2 : 1;
      const prefix = local.slice(0, prefixLen);
      const maskedCount = Math.max(3, local.length - prefixLen);
      return `${prefix}${'*'.repeat(maskedCount)}@${domain}`;
    }

    case PII_TYPES.PHONE:
      return maskAllDigitsExceptLast(value, 4, '*');

    case PII_TYPES.CREDIT_CARD:
      return maskAllDigitsExceptLast(value, 4, '*');

    case PII_TYPES.INDIAN_PAN: {
      const trimmed = value.trim();
      if (trimmed.length !== 10) return '[REDACTED]';
      return `${trimmed.slice(0, 2)}******${trimmed.slice(8)}`;
    }

    case PII_TYPES.AADHAAR:
      return maskAllDigitsExceptLast(value, 4, '*');

    case PII_TYPES.IPV4: {
      const parts = value.split('.');
      if (parts.length !== 4) return '***.***.***.***';
      return `${parts[0]}.***.***.***`;
    }

    case PII_TYPES.IPV6: {
      const parts = value.split(':');
      const firstNonEmpty = parts.find((p) => p.length > 0);
      if (!firstNonEmpty) return '****:****:****:****';
      return `${firstNonEmpty}:****:****:****`;
    }

    default:
      return '[REDACTED]';
  }
}

/**
 * Computes the replacement token for a single detected entity under the chosen redaction mode.
 * @param {Object} detection
 * @param {string} mode
 * @param {ReturnType<typeof createPseudonymSession>} [session]
 * @returns {string}
 */
export function formatRedactedToken(detection, mode, session) {
  if (mode === REDACTION_MODES.FULL) {
    return '[REDACTED]';
  }
  if (mode === REDACTION_MODES.PARTIAL) {
    return partialMaskEntity(detection.type, detection.value);
  }
  if (mode === REDACTION_MODES.PSEUDONYM) {
    if (!session) {
      throw new Error('Pseudonymization mode requires an active in-memory session');
    }
    return session.getPlaceholder(detection.type, detection.normalized);
  }
  return '[REDACTED]';
}

/**
 * Redacts all resolved, non-overlapping detections in `text` using exact character offsets.
 * Preserves all surrounding whitespace, newlines, and punctuation untouched.
 *
 * @param {string} text
 * @param {Array<Object>} detections
 * @param {string} [mode]
 * @param {ReturnType<typeof createPseudonymSession>} [session]
 * @returns {{
 *   sanitizedText: string,
 *   redactedCount: number,
 *   categoryCounts: Record<string, number>,
 *   spans: Array<{ type: string, originalStart: number, originalEnd: number, outputStart: number, outputEnd: number, replacement: string }>
 * }}
 */
export function redactText(
  text,
  detections,
  mode = REDACTION_MODES.FULL,
  session = mode === REDACTION_MODES.PSEUDONYM ? createPseudonymSession() : undefined
) {
  if (typeof text !== 'string' || text.length === 0) {
    return {
      sanitizedText: typeof text === 'string' ? text : '',
      redactedCount: 0,
      categoryCounts: {},
      spans: [],
    };
  }

  if (!Array.isArray(detections) || detections.length === 0) {
    return {
      sanitizedText: text,
      redactedCount: 0,
      categoryCounts: {},
      spans: [],
    };
  }

  const sorted = [...detections].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let outputLength = 0;
  const parts = [];
  const spans = [];
  const categoryCounts = {};

  for (const item of sorted) {
    if (item.start < cursor || item.end > text.length || item.start >= item.end) {
      continue;
    }

    const unchanged = text.slice(cursor, item.start);
    parts.push(unchanged);
    outputLength += unchanged.length;

    const replacement = formatRedactedToken(item, mode, session);
    const outputStart = outputLength;
    parts.push(replacement);
    outputLength += replacement.length;
    const outputEnd = outputLength;

    spans.push({
      type: item.type,
      originalStart: item.start,
      originalEnd: item.end,
      outputStart,
      outputEnd,
      replacement,
    });

    categoryCounts[item.type] = (categoryCounts[item.type] || 0) + 1;
    cursor = item.end;
  }

  parts.push(text.slice(cursor));

  return {
    sanitizedText: parts.join(''),
    redactedCount: spans.length,
    categoryCounts,
    spans,
  };
}
