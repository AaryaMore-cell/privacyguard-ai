import { describe, expect, it } from 'vitest';
import { luhnCheck } from '../engine/luhn.js';
import {
  isValidAadhaarFormat,
  isValidIPv4,
  isValidIPv6,
  isValidPAN,
  isValidPhone,
} from '../engine/validatePII.js';

describe('PII Validation Engine', () => {
  it('validates Luhn card candidates and rejects invalid or degenerate ones', () => {
    expect(luhnCheck('4532 0151 1283 0366').valid).toBe(true);
    expect(luhnCheck('5425-2334-3010-9903').valid).toBe(true);
    expect(luhnCheck('4532 0151 1283 0367').valid).toBe(false);
    expect(luhnCheck('1234567890123457').valid).toBe(false);
    expect(luhnCheck('0000000000000000').valid).toBe(false);
    expect(luhnCheck('12345').valid).toBe(false);
  });

  it('validates IPv4 octets 0-255 and rejects out-of-range or malformed octets', () => {
    expect(isValidIPv4('192.168.10.42')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
    expect(isValidIPv4('256.1.1.1')).toBe(false);
    expect(isValidIPv4('999.45.12.1')).toBe(false);
    expect(isValidIPv4('192.168.01.1')).toBe(false);
  });

  it('validates standard IPv6 addresses and rejects colon-separated non-IPs', () => {
    expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(isValidIPv6('2001:db8::1')).toBe(true);
    expect(isValidIPv6('fe80::1ff:fe23:4567:890a')).toBe(true);
    expect(isValidIPv6('::1')).toBe(true);
    expect(isValidIPv6('::ffff:192.0.2.128')).toBe(true);
    expect(isValidIPv6('12:30:45')).toBe(false);
    expect(isValidIPv6('2001::db8::1')).toBe(false);
  });

  it('validates Indian PAN format case-insensitively', () => {
    expect(isValidPAN('ABCDE1234F')).toBe(true);
    expect(isValidPAN('pqrst5678k')).toBe(true);
    expect(isValidPAN('ABCD12345F')).toBe(false);
  });

  it('validates 12-digit Aadhaar format patterns', () => {
    expect(isValidAadhaarFormat('2345 6789 0123')).toBe(true);
    expect(isValidAadhaarFormat('3456-7890-1234')).toBe(true);
    expect(isValidAadhaarFormat('234567890123')).toBe(true);
    expect(isValidAadhaarFormat('1111 1111 1111')).toBe(false);
    expect(isValidAadhaarFormat('1234 5678 901')).toBe(false);
  });

  it('validates Indian and international phone formats without matching dates', () => {
    expect(isValidPhone('+91 98765 43210')).toBe(true);
    expect(isValidPhone('+91-9876543210')).toBe(true);
    expect(isValidPhone('91234 56789')).toBe(true);
    expect(isValidPhone('+1 (555) 234-5678')).toBe(true);
    expect(isValidPhone('2026-11-27')).toBe(false);
    expect(isValidPhone('192.168.1.1')).toBe(false);
  });
});
