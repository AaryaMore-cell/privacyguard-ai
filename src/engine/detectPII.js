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

/**
 * Helper to collect regex matches with exact source offsets without modifying input text.
 * @param {string} text
 * @param {RegExp} regex
 * @param {(match: RegExpExecArray) => Object|null} buildResult
 * @returns {Array<Object>}
 */
function collectMatches(text, regex, buildResult) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const results = [];
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const scanner = new RegExp(regex.source, flags);

  let match;
  while ((match = scanner.exec(text)) !== null) {
    if (match[0].length === 0) {
      scanner.lastIndex += 1;
      continue;
    }
    const entry = buildResult(match);
    if (entry) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * Detects standard email addresses and normalizes to lowercase for comparison.
 * @param {string} text
 */
export function detectEmails(text) {
  const emailRegex =
    /(?<![A-Za-z0-9._%+-])[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?![A-Za-z0-9_-])/;

  return collectMatches(text, emailRegex, (match) => {
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

/**
 * Detects Indian (+91 / 0 / 10-digit mobile) and clearly formatted international phone numbers.
 * @param {string} text
 */
export function detectPhones(text) {
  const phoneRegex =
    /(?<![+\dA-Za-z])(?:\+91[\s.-]?[6-9]\d{4}[\s.-]?\d{5}|\+91[\s.-]?[6-9]\d{9}|0[6-9]\d{9}|[6-9]\d{4}[\s.-]\d{5}|[6-9]\d{9}|\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?(?:\d[\s.-]?){6,12}\d)(?![\dA-Za-z])/;

  return collectMatches(text, phoneRegex, (match) => {
    const value = match[0];
    if (!isValidPhone(value)) return null;

    if (!value.startsWith('+')) {
      const prevChunk = text.slice(Math.max(0, match.index - 5), match.index);
      const nextChunk = text.slice(match.index + value.length, match.index + value.length + 5);
      if (/\d{2,}[\s.-]$/.test(prevChunk) || /^[\s.-]\d{2,}/.test(nextChunk)) {
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

/**
 * Detects IPv4 dotted-quad addresses and validates each octet is 0-255.
 * @param {string} text
 */
export function detectIPv4(text) {
  const ipv4Regex = /(?<![.\dA-Za-z])(?:\d{1,3}\.){3}\d{1,3}(?![.\dA-Za-z])/;

  return collectMatches(text, ipv4Regex, (match) => {
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

/**
 * Detects standard full and compressed IPv6 addresses while rejecting arbitrary colon text.
 * @param {string} text
 */
export function detectIPv6(text) {
  const ipv6Regex =
    /(?<![0-9a-fA-F:])(?:[0-9a-fA-F]{0,4}:){2,7}(?:[0-9a-fA-F]{0,4}|(?:\d{1,3}\.){3}\d{1,3})(?![0-9a-fA-F:])/;

  return collectMatches(text, ipv6Regex, (match) => {
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

/**
 * Detects Indian Permanent Account Number (PAN) format: ABCDE1234F (case-insensitive).
 * @param {string} text
 */
export function detectPAN(text) {
  const panRegex = /(?<![A-Za-z0-9])[A-Za-z]{5}[0-9]{4}[A-Za-z](?![A-Za-z0-9])/;

  return collectMatches(text, panRegex, (match) => {
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

/**
 * Detects 12-digit Aadhaar-format candidates with optional space/hyphen separators.
 * Pattern matching does not verify authenticity or official issuance.
 * @param {string} text
 */
export function detectAadhaar(text) {
  const aadhaarRegex =
    /(?<![\dA-Za-z-])(?<!\d[\s-])(?:\d{4}\s\d{4}\s\d{4}|\d{4}-\d{4}-\d{4}|\d{12})(?![\dA-Za-z-])(?![\s-]\d)/;

  return collectMatches(text, aadhaarRegex, (match) => {
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

/**
 * Detects credit card candidates (13-19 digits, optional spaces/hyphens) that pass Luhn validation.
 * Rejects candidates failing Luhn or degenerate digit strings.
 * @param {string} text
 */
export function detectCreditCards(text) {
  const cardRegex = /(?<![\dA-Za-z-])(?:\d[ -]?){12,18}\d(?![\dA-Za-z-])/;

  return collectMatches(text, cardRegex, (match) => {
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
