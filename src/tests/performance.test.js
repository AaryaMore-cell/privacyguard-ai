import { describe, expect, it } from 'vitest';
import { ALL_PII_TYPES, detectAllPII } from '../engine/detectPII.js';
import { REDACTION_MODES, redactText } from '../engine/redactPII.js';
import { processCsvDocument } from '../utils/csvUtils.js';

const SYNTHETIC_ROW =
  'User Aarav.Sharma@example.com, +91 98765 43210, 4532 0151 1283 0366, ABCDE1234F, 192.168.10.42, 2001:db8::1\n';

describe('Engine Performance & Scalability Benchmarks (synthetic fixtures)', () => {
  it('processes small (1 KB), medium (100 KB), and large (1 MB) documents within interactive budgets', () => {
    const smallDoc = SYNTHETIC_ROW.repeat(10); // ~1.08 KB
    const mediumDoc = SYNTHETIC_ROW.repeat(950); // ~102 KB
    const largeDoc = SYNTHETIC_ROW.repeat(9500); // ~1.02 MB (57,000 PII detections)

    const tSmall = performance.now();
    const smallDets = detectAllPII(smallDoc);
    const smallRed = redactText(smallDoc, smallDets, REDACTION_MODES.PSEUDONYM);
    const smallMs = performance.now() - tSmall;

    expect(smallDets).toHaveLength(60);
    expect(smallRed.redactedCount).toBe(60);
    expect(smallMs).toBeLessThan(150);

    const tMed = performance.now();
    const medDets = detectAllPII(mediumDoc);
    const medRed = redactText(mediumDoc, medDets, REDACTION_MODES.PSEUDONYM);
    const medMs = performance.now() - tMed;

    expect(medDets).toHaveLength(5700);
    expect(medRed.redactedCount).toBe(5700);
    expect(medMs).toBeLessThan(400);

    const tLarge = performance.now();
    const largeDets = detectAllPII(largeDoc);
    const largeRed = redactText(largeDoc, largeDets, REDACTION_MODES.PSEUDONYM);
    const largeMs = performance.now() - tLarge;

    expect(largeDets).toHaveLength(57000);
    expect(largeRed.redactedCount).toBe(57000);
    // O(N log N) cluster sweep keeps 1 MB / 57,000 detections well under 1 second
    expect(largeMs).toBeLessThan(1000);
  });

  it('parses and sanitizes a 100 KB CSV document cleanly without quadratic slowdown', () => {
    const csvHeader = 'id,name,email,phone,note\n';
    const csvRow = '101,Aarav,aarav@example.com,+91 98765 43210,"Escalated, ""verified"""\n';
    const csv100k = csvHeader + csvRow.repeat(1600);

    const t0 = performance.now();
    const result = processCsvDocument(
      csv100k,
      ALL_PII_TYPES,
      REDACTION_MODES.PSEUDONYM
    );
    const elapsedMs = performance.now() - t0;

    expect(result.ok).toBe(true);
    expect(result.totalDetections).toBe(3200);
    expect(result.redactedCount).toBe(3200);
    expect(elapsedMs).toBeLessThan(500);
  });
});
