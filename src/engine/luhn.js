/**
 * Validates a credit/payment card number candidate using the Luhn (mod-10) algorithm.
 * Expects digits only or a string with spaces/hyphens.
 * Rejects sequences outside 13-19 digits and trivial all-identical digit strings.
 *
 * @param {string} rawCandidate
 * @returns {{ valid: boolean, digits: string, reason: string }}
 */
export function luhnCheck(rawCandidate) {
  if (typeof rawCandidate !== 'string') {
    return { valid: false, digits: '', reason: 'Input is not a string' };
  }

  const digits = rawCandidate.replace(/[\s-]/g, '');

  if (!/^\d+$/.test(digits)) {
    return { valid: false, digits, reason: 'Contains non-digit characters' };
  }

  if (digits.length < 13 || digits.length > 19) {
    return {
      valid: false,
      digits,
      reason: `Invalid card length (${digits.length}); expected 13-19 digits`,
    };
  }

  // Reject degenerate all-same-digit sequences (e.g. 0000000000000000)
  if (/^(\d)\1+$/.test(digits)) {
    return {
      valid: false,
      digits,
      reason: 'Rejected degenerate repeated-digit sequence',
    };
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = digits.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const valid = sum % 10 === 0;
  return {
    valid,
    digits,
    reason: valid
      ? 'Passed Luhn checksum and length validation (13-19 digits)'
      : 'Failed Luhn checksum validation',
  };
}
