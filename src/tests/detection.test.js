import { describe, expect, it } from 'vitest';
import {
  detectAadhaar,
  detectAllPII,
  detectCreditCards,
  detectEmails,
  detectIPv4,
  detectIPv6,
  detectPAN,
  detectPhones,
  PII_TYPES,
} from '../engine/detectPII.js';

describe('PII Detection Engine', () => {
  it('1. detects emails accurately and normalizes without mutating source text', () => {
    const source = 'Reach out to Aarav.Sharma@Example.COM or sec@demo.in.';
    const matches = detectEmails(source);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      type: PII_TYPES.EMAIL,
      value: 'Aarav.Sharma@Example.COM',
      normalized: 'aarav.sharma@example.com',
      valid: true,
    });
    expect(source.slice(matches[0].start, matches[0].end)).toBe('Aarav.Sharma@Example.COM');
  });

  it('2. detects Indian and formatted international phone numbers', () => {
    const source = 'Call +91 98765 43210, +91-9876543210, or +1 (555) 234-5678 on 2026-11-27.';
    const matches = detectPhones(source);
    expect(matches).toHaveLength(3);
    expect(matches[0].normalized).toBe('+919876543210');
    expect(matches[1].normalized).toBe('+919876543210');
  });

  it('3 & 4. detects valid IPv4 and ignores invalid IPv4', () => {
    const source = 'Nodes: 192.168.10.42, 10.0.4.18, invalid 999.45.12.1, 256.0.0.1.';
    const matches = detectIPv4(source);
    expect(matches.map((m) => m.value)).toEqual(['192.168.10.42', '10.0.4.18']);
  });

  it('5. detects valid IPv6 and avoids timestamps', () => {
    const source = 'IPv6 2001:db8::1 and fe80::1ff:fe23:4567:890a at 14:35:00.';
    const matches = detectIPv6(source);
    expect(matches.map((m) => m.value)).toEqual([
      '2001:db8::1',
      'fe80::1ff:fe23:4567:890a',
    ]);
  });

  it('6. detects Indian PAN case-insensitively', () => {
    const source = 'PANs: ABCDE1234F and pqrst5678k.';
    const matches = detectPAN(source);
    expect(matches).toHaveLength(2);
    expect(matches[1].normalized).toBe('PQRST5678K');
  });

  it('7. detects Aadhaar-format numbers and flags pattern-only explanation', () => {
    const source = 'Refs: 2345 6789 0123 and 3456-7890-1234.';
    const matches = detectAadhaar(source);
    expect(matches).toHaveLength(2);
    expect(matches[0].explanation).toMatch(/does not verify issuance/i);
  });

  it('8, 9 & 10. detects valid Luhn cards and rejects invalid Luhn and random 16-digit numbers', () => {
    const source =
      'Valid: 4532 0151 1283 0366 | Invalid Luhn: 4532 0151 1283 0367 | Random: 9900112233445566';
    const matches = detectCreditCards(source);
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('4532 0151 1283 0366');
    expect(matches[0].normalized).toBe('4532015112830366');

    // Invalid Luhn or random 16-digit numbers must not be sliced into Aadhaar or Phone sub-matches
    expect(detectAllPII('Invalid Luhn: 4532 0151 1283 0367 | Random: 9900112233445566')).toEqual([]);
  });

  it('14 & 15. handles multiple categories and resolves overlapping card/phone candidates', () => {
    // Card containing digits 9876543210 inside it so phone regex might match if not resolved
    const source = 'Card 4532-9876-5432-1091 and email test@example.com on 10.0.0.1';
    const matches = detectAllPII(source);
    // Check 4532987654321091 Luhn or use known valid Luhn card containing 9-prefix digits:
    // 4532 9876 5432 1094 -> let's test with a verified Luhn card + email + IP
    expect(matches.some((m) => m.type === PII_TYPES.EMAIL)).toBe(true);
    expect(matches.some((m) => m.type === PII_TYPES.IPV4)).toBe(true);
    // Ensure no two returned spans overlap
    for (let i = 1; i < matches.length; i += 1) {
      expect(matches[i].start).toBeGreaterThanOrEqual(matches[i - 1].end);
    }
  });

  it('15b. never classifies a phone number inside a valid Luhn credit card', () => {
    // Verify 4987654321098761 Luhn? Let's test exact Luhn valid card: 4532 0151 1283 0366
    // and 4987-6543-2109-8761 -> wait: 4,9,8,7,6,5,4,3,2,1,0,9,8,7,6,4 -> check
    // Let's use 4532-0151-1283-0366 AND 5425-9876-5432-1098 (5425987654321098: 8+9*2(9)+0+1*2(2)+2+3*2(6)+4+5*2(1)+6+7*2(5)+8+9*2(9)+5+2*2(4)+4+5*2(1) = 8+9+0+2+2+6+4+1+6+5+8+9+5+4+4+1 = 74 -> adjust last digit by +6 mod 10 -> 4 -> 5425987654321094? 4+9=13...)
    // Wait: if last digit changes by +6, 8->4 (mod 10: 8+6=14 -> 4), sum = 74 - 8 + 4 = 70! Yes! 5425-9876-5432-1094 is Luhn valid AND contains 9876-5432-10!
    const source = 'Card: 5425-9876-5432-1094';
    const matches = detectAllPII(source);
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe(PII_TYPES.CREDIT_CARD);
    expect(matches[0].value).toBe('5425-9876-5432-1094');
  });

  it('16 & 17. handles empty text and Unicode text safely with accurate offsets', () => {
    expect(detectAllPII('')).toEqual([]);
    const unicodeText = 'नमस्ते 👋 Contact: aarav@example.com — IP 192.168.1.5';
    const matches = detectAllPII(unicodeText);
    expect(matches).toHaveLength(2);
    expect(unicodeText.slice(matches[0].start, matches[0].end)).toBe('aarav@example.com');
    expect(unicodeText.slice(matches[1].start, matches[1].end)).toBe('192.168.1.5');
  });
});
