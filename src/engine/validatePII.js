/**
 * Structural and format validators for PII candidates.
 * Note: Pattern and checksum matching never establishes real-world identity or official issuance.
 */

/**
 * Validates an IPv4 dotted-quad string (each octet 0-255, no invalid leading zeros).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidIPv4(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validates standard full and compressed (::) IPv6 addresses,
 * including optional IPv4-mapped tail, while rejecting timestamps or arbitrary colon text.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidIPv6(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed.includes(':')) return false;

  // Reject more than one '::' compression
  const doubleColonParts = trimmed.split('::');
  if (doubleColonParts.length > 2) return false;

  const hasCompression = doubleColonParts.length === 2;

  const parseGroups = (part) => {
    if (part === '') return [];
    return part.split(':');
  };

  let groups = [];
  if (hasCompression) {
    const left = parseGroups(doubleColonParts[0]);
    const right = parseGroups(doubleColonParts[1]);
    groups = [...left, ...right];
  } else {
    groups = trimmed.split(':');
  }

  if (groups.length === 0) {
    // "::" alone is valid unspecified IPv6, but avoid matching lone punctuation in prose;
    // require at least 1 explicit hextet or standard loopback "::1"
    return false;
  }

  // Check optional IPv4-mapped last segment (e.g. ::ffff:192.0.2.128)
  let totalHextetSlots = 0;
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    if (i === groups.length - 1 && group.includes('.')) {
      if (!isValidIPv4(group)) return false;
      totalHextetSlots += 2;
    } else {
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return false;
      totalHextetSlots += 1;
    }
  }

  if (hasCompression) {
    return totalHextetSlots < 8;
  }
  return totalHextetSlots === 8;
}

/**
 * Validates Indian PAN format: 5 letters, 4 digits, 1 letter (case-insensitive).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidPAN(value) {
  if (typeof value !== 'string') return false;
  return /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(value.trim());
}

/**
 * Validates 12-digit Aadhaar-format candidate with optional consistent space or hyphen separators.
 * Pattern match only; does not verify authenticity or issuance.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidAadhaarFormat(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (
    !/^(\d{12}|\d{4}\s\d{4}\s\d{4}|\d{4}-\d{4}-\d{4})$/.test(trimmed)
  ) {
    return false;
  }
  const digits = trimmed.replace(/[\s-]/g, '');
  // Reject degenerate all-same-digit sequences
  if (/^(\d)\1+$/.test(digits)) return false;
  return digits.length === 12;
}

/**
 * Normalizes a phone string to digits with optional leading '+' for international numbers.
 * @param {string} value
 * @returns {string}
 */
export function normalizePhone(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Validates Indian and clearly formatted international phone numbers.
 * Avoids matching plain short numbers, dates, or IP octets.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidPhone(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();

  // Reject ISO-like dates (YYYY-MM-DD or DD-MM-YYYY) or dotted IPv4-like patterns
  if (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(trimmed)) return false;
  if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(trimmed)) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  if (/^(\d)\1+$/.test(digits)) return false;

  // Indian +91 / 91 / 0 prefixed or 10-digit mobile starting 6-9
  if (/^(?:\+?91|0)?[6-9]\d{9}$/.test(digits)) {
    return true;
  }

  // Clearly formatted international number starting with + and 8-15 digits
  if (trimmed.startsWith('+') && digits.length >= 8 && digits.length <= 15) {
    return true;
  }

  return false;
}
