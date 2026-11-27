import { luhnCheck } from './luhn.js';
import { resolveOverlaps } from './resolveOverlaps.js';
import {
  isValidAadhaarFormat,
  isValidIPv4,
  isValidIPv6,
  isValidPAN,
  isValidPhone,
  normalizePhone,
} from './validatePII.js';

export { luhnCheck };

export const PII_TYPES = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  IPV4: 'IPV4',
  IPV6: 'IPV6',
  INDIAN_PAN: 'INDIAN_PAN',
  AADHAAR: 'AADHAAR',
  CREDIT_CARD: 'CREDIT_CARD',
};

export const ALL_PII_TYPES = Object.values(PII_TYPES);

// Pre-compiled global RegExp instances avoid recompiling patterns across documents and CSV cells.
const EMAIL_REGEX =
  /(?<![A-Za-z0-9._%+-])[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?![A-Za-z0-9_-])/g;

const PHONE_REGEX =
  /(?<![+\dA-Za-z])(?:\+91[\s.-]?[6-9]\d{4}[\s.-]?\d{5}|\+91[\s.-]?[6-9]\d{9}|0[6-9]\d{9}|[6-9]\d{4}[\s.-]\d{5}|[6-9]\d{9}|\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?(?:\d[\s.-]?){6,12}\d)(?![\dA-Za-z])/g;

const IPV4_REGEX = /(?<![.\dA-Za-z])(?:\d{1,3}\.){3}\d{1,3}(?![.\dA-Za-z])/g;

const IPV6_REGEX =
  /(?<![0-9a-fA-F:])(?:[0-9a-fA-F]{0,4}:){2,7}(?:[0-9a-fA-F]{0,4}|(?:\d{1,3}\.){3}\d{1,3})(?![0-9a-fA-F:])/g;

const PAN_REGEX = /(?<![A-Za-z0-9])[A-Za-z]{5}[0-9]{4}[A-Za-z](?![A-Za-z0-9])/g;

const AADHAAR_REGEX =
  /(?<![\dA-Za-z-])(?<!\d[\s-])(?:\d{4}\s\d{4}\s\d{4}|\d{4}-\d{4}-\d{4}|\d{12})(?![\dA-Za-z-])(?![\s-]\d)/g;

const CARD_REGEX = /(?<![\dA-Za-z-])(?:\d[ -]?){12,18}\d(?![\dA-Za-z-])/g;

const PREV_DIGIT_BLOCK_RE = /\d{2,}[\s.-]$/;
const NEXT_DIGIT_BLOCK_RE = /^[\s.-]\d{2,}/;

/**
 * Helper to collect regex matches using a pre-compiled global RegExp without mutating input text.
 * Resets `lastIndex` cleanly before and after scanning.
 */
function collectMatches(text, regex, buildResult) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const results = [];
  regex.lastIndex = 0;

  try {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      const entry = buildResult(match);
      if (entry) {
        results.push(entry);
      }
    }
  } finally {
    regex.lastIndex = 0;
  }

  return results;
}

export function detectEmails(text) {
  return collectMatches(text, EMAIL_REGEX, (match) => {
    const value = match[0];
    return {
      type: PII_TYPES.EMAIL,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: value.toLowerCase(),
      valid: true,
      explanation: 'Matched standard email address pattern',
    };
  });
}

export function detectPhones(text) {
  return collectMatches(text, PHONE_REGEX, (match) => {
    const value = match[0];
    if (!isValidPhone(value)) return null;

    if (!value.startsWith('+')) {
      const prevChunk = text.slice(Math.max(0, match.index - 5), match.index);
      const nextChunk = text.slice(match.index + value.length, match.index + value.length + 5);
      if (PREV_DIGIT_BLOCK_RE.test(prevChunk) || NEXT_DIGIT_BLOCK_RE.test(nextChunk)) {
        return null;
      }
    }

    return {
      type: PII_TYPES.PHONE,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: normalizePhone(value),
      valid: true,
      explanation: 'Matched validated phone number format',
    };
  });
}

export function detectIPv4(text) {
  return collectMatches(text, IPV4_REGEX, (match) => {
    const value = match[0];
    if (!isValidIPv4(value)) return null;

    return {
      type: PII_TYPES.IPV4,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: value,
      valid: true,
      explanation: 'All four IPv4 octets validated between 0 and 255',
    };
  });
}

export function detectIPv6(text) {
  return collectMatches(text, IPV6_REGEX, (match) => {
    const value = match[0];
    if (!isValidIPv6(value)) return null;

    return {
      type: PII_TYPES.IPV6,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: value.toLowerCase(),
      valid: true,
      explanation: 'Matched validated IPv6 address structure',
    };
  });
}

export function detectPAN(text) {
  return collectMatches(text, PAN_REGEX, (match) => {
    const value = match[0];
    if (!isValidPAN(value)) return null;

    return {
      type: PII_TYPES.INDIAN_PAN,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: value.toUpperCase(),
      valid: true,
      explanation: 'Matched Indian PAN structural format (5 letters, 4 digits, 1 letter)',
    };
  });
}

export function detectAadhaar(text) {
  return collectMatches(text, AADHAAR_REGEX, (match) => {
    const value = match[0];
    if (!isValidAadhaarFormat(value)) return null;

    return {
      type: PII_TYPES.AADHAAR,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: value.replace(/[\s-]/g, ''),
      valid: true,
      explanation:
        'Matched 12-digit Aadhaar format (pattern match only; does not verify issuance)',
    };
  });
}

export function detectCreditCards(text) {
  return collectMatches(text, CARD_REGEX, (match) => {
    const value = match[0];
    const luhn = luhnCheck(value);
    if (!luhn.valid) return null;

    return {
      type: PII_TYPES.CREDIT_CARD,
      start: match.index,
      end: match.index + value.length,
      value,
      normalized: luhn.digits,
      valid: true,
      explanation: luhn.reason,
    };
  });
}

/**
 * Runs all enabled PII detectors on source text and resolves overlapping matches deterministically.
 * Does not mutate input text.
 *
 * @param {string} text
 * @param {string[]} [enabledTypes]
 * @returns {Array<Object>}
 */
export function detectAllPII(text, enabledTypes = ALL_PII_TYPES) {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }

  const active = new Set(enabledTypes);
  const candidates = [];

  if (active.has(PII_TYPES.CREDIT_CARD)) {
    candidates.push(...detectCreditCards(text));
  }
  if (active.has(PII_TYPES.IPV6)) {
    candidates.push(...detectIPv6(text));
  }
  if (active.has(PII_TYPES.EMAIL)) {
    candidates.push(...detectEmails(text));
  }
  if (active.has(PII_TYPES.INDIAN_PAN)) {
    candidates.push(...detectPAN(text));
  }
  if (active.has(PII_TYPES.AADHAAR)) {
    candidates.push(...detectAadhaar(text));
  }
  if (active.has(PII_TYPES.IPV4)) {
    candidates.push(...detectIPv4(text));
  }
  if (active.has(PII_TYPES.PHONE)) {
    candidates.push(...detectPhones(text));
  }

  return resolveOverlaps(candidates);
}
