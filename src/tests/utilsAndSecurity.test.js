import { describe, expect, it, vi } from 'vitest';
import { REDACTION_MODES } from '../engine/redactPII.js';
import { ALL_PII_TYPES } from '../engine/detectPII.js';
import { parseCsv, processCsvDocument } from '../utils/csvUtils.js';
import {
  buildExportFilename,
  buildSanitizedAuditJson,
  downloadBlobFile,
} from '../utils/exportUtils.js';
import { validateUploadedFile, readValidatedTextFile } from '../utils/fileUtils.js';

describe('CSV, File Validation & Export Security Utilities', () => {
  it('18. handles malformed CSV gracefully without crashing', () => {
    const malformed = 'name,email\n"Aarav,aarav@example.com';
    const parsed = parseCsv(malformed);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatch(/Malformed CSV/i);
  });

  it('19. preserves quoted CSV values, escaped quotes, commas, and embedded newlines', () => {
    const csv =
      'id,email,note\n1,a@example.com,"Hello, ""world""\nLine 2 with 192.168.1.1"\n2,A@EXAMPLE.COM,Clean';
    const result = processCsvDocument(csv, ALL_PII_TYPES, REDACTION_MODES.PSEUDONYM);
    expect(result.ok).toBe(true);
    expect(result.sanitizedRows).toHaveLength(3);
    expect(result.sanitizedRows[1][1]).toBe('USER_01');
    expect(result.sanitizedRows[2][1]).toBe('USER_01');
    expect(result.sanitizedRows[1][2]).toBe('Hello, "world"\nLine 2 with IP_01');
    expect(result.sanitizedText).toContain('"Hello, ""world""\nLine 2 with IP_01"');
  });

  it('20. validates file size, extensions, MIME types and triggers Blob export', () => {
    expect(validateUploadedFile({ name: 'empty.txt', size: 0, type: 'text/plain' }).valid).toBe(false);
    expect(validateUploadedFile({ name: 'hack.exe', size: 100, type: 'application/octet-stream' }).valid).toBe(false);
    expect(validateUploadedFile({ name: 'huge.txt', size: 6 * 1024 * 1024, type: 'text/plain' }).valid).toBe(false);
    expect(validateUploadedFile({ name: 'notes.csv', size: 512, type: 'text/csv' }).valid).toBe(true);

    const createUrlSpy = vi.fn(() => 'blob:mock-url');
    const revokeUrlSpy = vi.fn();
    globalThis.URL.createObjectURL = createUrlSpy;
    globalThis.URL.revokeObjectURL = revokeUrlSpy;

    const exportRes = downloadBlobFile('USER_01', buildExportFilename('txt', 'demo.txt'), 'text/plain');
    expect(exportRes.ok).toBe(true);
    expect(exportRes.filename).toMatch(/^privacyguard-demo-sanitized-.*\.txt$/);
    expect(createUrlSpy).toHaveBeenCalledTimes(1);
  });

  it('builds sanitized JSON audit report with zero raw PII', () => {
    const json = buildSanitizedAuditJson({
      mode: REDACTION_MODES.PSEUDONYM,
      inputFormat: 'txt',
      stats: {
        totalDetected: 2,
        totalRedacted: 2,
        categoryCounts: { EMAIL: 2 },
        processingTimeMs: 1.5,
        inputChars: 120,
        outputChars: 90,
      },
      enabledTypes: ALL_PII_TYPES,
      events: [
        {
          id: '1',
          timestamp: '2026-11-27T11:00:00.000Z',
          action: 'Sanitization Completed',
          status: 'success',
          detail: '2 entities sanitized',
        },
      ],
    });
    const parsed = JSON.parse(json);
    expect(parsed.summary.totalRedacted).toBe(2);
    expect(json).not.toContain('example.com');
  });

  it('rejects binary null-byte payloads masquerading as .txt files', async () => {
    const binaryPayload = new Uint8Array([0x48, 0x65, 0x6c, 0x00, 0x6f]);
    const mockFile = {
      name: 'binary.txt',
      size: binaryPayload.byteLength,
      type: 'text/plain',
      arrayBuffer: async () => binaryPayload.buffer,
    };
    const res = await readValidatedTextFile(mockFile);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/null-byte|binary/i);
  });
});
