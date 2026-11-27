import { describe, expect, it } from 'vitest';
import { detectAllPII } from '../engine/detectPII.js';
import {
  createPseudonymSession,
  REDACTION_MODES,
  redactText,
} from '../engine/redactPII.js';

describe('PII Redaction Engine', () => {
  const sample =
    'Email: Aarav.Sharma@example.com, Repeat: aarav.sharma@example.com, Phone: +91 98765 43210, Repeat Phone: +91-9876543210, PAN: ABCDE1234F, Aadhaar: 2345 6789 0123, Card: 4532 0151 1283 0366, IP4: 192.168.10.42, IP6: 2001:db8::1!';

  it('11. applies Full Mask mode while preserving surrounding punctuation', () => {
    const detections = detectAllPII(sample);
    const result = redactText(sample, detections, REDACTION_MODES.FULL);
    expect(result.redactedCount).toBe(9);
    expect(result.sanitizedText).toBe(
      'Email: [REDACTED], Repeat: [REDACTED], Phone: [REDACTED], Repeat Phone: [REDACTED], PAN: [REDACTED], Aadhaar: [REDACTED], Card: [REDACTED], IP4: [REDACTED], IP6: [REDACTED]!'
    );
  });

  it('12. applies Partial Mask mode tailored to every entity category', () => {
    const detections = detectAllPII(sample);
    const result = redactText(sample, detections, REDACTION_MODES.PARTIAL);

    expect(result.sanitizedText).toContain('Aa**********@example.com');
    expect(result.sanitizedText).toContain('+** ***** *3210');
    expect(result.sanitizedText).toContain('AB******4F');
    expect(result.sanitizedText).toContain('**** **** 0123');
    expect(result.sanitizedText).toContain('**** **** **** 0366');
    expect(result.sanitizedText).toContain('192.***.***.***');
    expect(result.sanitizedText).toContain('2001:****:****:****');
    expect(result.sanitizedText.endsWith('!')).toBe(true);
  });

  it('13. applies Consistent Pseudonymization across repeated normalized entities and separate namespaces', () => {
    const detections = detectAllPII(sample);
    const session = createPseudonymSession();
    const result = redactText(sample, detections, REDACTION_MODES.PSEUDONYM, session);

    expect(result.sanitizedText).toBe(
      'Email: USER_01, Repeat: USER_01, Phone: PHONE_01, Repeat Phone: PHONE_01, PAN: PAN_01, Aadhaar: AADHAAR_01, Card: CARD_01, IP4: IP_01, IP6: IPV6_01!'
    );

    session.clear();
  });
});
