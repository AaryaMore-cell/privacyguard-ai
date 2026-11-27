import { PII_TYPES } from '../engine/detectPII.js';
import { REDACTION_MODES } from '../engine/redactPII.js';

/**
 * Shared metadata for all 7 PII entity categories (labels, short tags, CSS class tokens, descriptions).
 */
export const ENTITY_META = Object.freeze({
  [PII_TYPES.EMAIL]: {
    type: PII_TYPES.EMAIL,
    label: 'Emails',
    singular: 'Email',
    shortTag: 'EMAIL',
    colorVar: 'var(--cat-email)',
    className: 'cat-email',
    description: 'RFC-style email addresses normalized to lowercase',
  },
  [PII_TYPES.PHONE]: {
    type: PII_TYPES.PHONE,
    label: 'Phone Numbers',
    singular: 'Phone',
    shortTag: 'PHONE',
    colorVar: 'var(--cat-phone)',
    className: 'cat-phone',
    description: 'Indian (+91 / 10-digit) and formatted international numbers',
  },
  [PII_TYPES.IPV4]: {
    type: PII_TYPES.IPV4,
    label: 'IPv4 Addresses',
    singular: 'IPv4',
    shortTag: 'IPV4',
    colorVar: 'var(--cat-ipv4)',
    className: 'cat-ipv4',
    description: 'Four-octet addresses validated within 0–255',
  },
  [PII_TYPES.IPV6]: {
    type: PII_TYPES.IPV6,
    label: 'IPv6 Addresses',
    singular: 'IPv6',
    shortTag: 'IPV6',
    colorVar: 'var(--cat-ipv6)',
    className: 'cat-ipv6',
    description: 'Full, compressed (::), and IPv4-mapped IPv6 addresses',
  },
  [PII_TYPES.INDIAN_PAN]: {
    type: PII_TYPES.INDIAN_PAN,
    label: 'Indian PAN',
    singular: 'PAN',
    shortTag: 'PAN',
    colorVar: 'var(--cat-pan)',
    className: 'cat-pan',
    description: '10-character PAN format (ABCDE1234F, case-insensitive)',
  },
  [PII_TYPES.AADHAAR]: {
    type: PII_TYPES.AADHAAR,
    label: 'Aadhaar Format',
    singular: 'Aadhaar',
    shortTag: 'AADHAAR',
    colorVar: 'var(--cat-aadhaar)',
    className: 'cat-aadhaar',
    description: '12-digit Aadhaar-format pattern match (does not verify issuance)',
  },
  [PII_TYPES.CREDIT_CARD]: {
    type: PII_TYPES.CREDIT_CARD,
    label: 'Credit Cards',
    singular: 'Credit Card',
    shortTag: 'CARD',
    colorVar: 'var(--cat-card)',
    className: 'cat-card',
    description: '13–19 digit card numbers verified via Luhn checksum',
  },
});

export const ENTITY_LIST = Object.values(ENTITY_META);

/**
 * Shared redaction mode definitions consumed by RedactionModeSelector and SettingsPage.
 */
export const REDACTION_MODE_OPTIONS = Object.freeze([
  {
    id: REDACTION_MODES.FULL,
    title: 'Mode A: Full Mask',
    shortLabel: 'Mode A: Full Mask ([REDACTED])',
    description: 'Replaces every detected sensitive span with a uniform redaction token.',
    example: '[REDACTED]',
  },
  {
    id: REDACTION_MODES.PARTIAL,
    title: 'Mode B: Partial Mask',
    shortLabel: 'Mode B: Partial Mask (Last 4 / Domain)',
    description:
      'Masks identifying digits/prefixes while keeping minimal context (last 4 digits, domain).',
    example: 'Aa***@demo.in',
  },
  {
    id: REDACTION_MODES.PSEUDONYM,
    title: 'Mode C: Consistent Pseudonymization',
    shortLabel: 'Mode C: Consistent Pseudonymization (USER_01)',
    description: 'Maps repeated identical entities to consistent session-only placeholders.',
    example: 'USER_01',
  },
]);
