# Security & Privacy Architecture — PrivacyGuard AI

## Privacy-First Design Guarantees

1. **100% Client-Side Execution:** All PII detection, Luhn validation, overlap resolution, masking, CSV parsing, and file export run strictly inside the browser's JavaScript runtime.
2. **Zero External Document Transmission:** No document contents, extracted entities, or pseudonymization maps are sent to any backend, external AI API, analytics service, or CDN.
3. **Ephemeral Memory Only:** Input text, sanitized output, detection spans, audit events, and pseudonymization session `Map`s live strictly in React component memory. Nothing is written to `localStorage`, `sessionStorage`, cookies, or `IndexedDB`.
4. **Reset Hygiene:** Clicking **Clear / Reset** wipes input text, file metadata, detection state, sanitized output, and audit events from memory.
5. **XSS & HTML Injection Safety:** `DiffViewer.jsx` renders all user-controlled text through React JSX text nodes only and never uses `dangerouslySetInnerHTML`, `innerHTML`, or `eval`.
6. **File & CSV Safeguards:** Uploads are restricted to `.txt` and `.csv` extensions, validated MIME types, non-empty content, strict UTF-8 decoding (`TextDecoder('utf-8', { fatal: true })`), and a 5 MB configurable size limit. Malformed CSV quotes return clean errors without crashing.
7. **Zero PII in Logs & Exports:** Browser `console` is never used to log document contents or PII. Exported JSON audit reports contain only aggregate counts, timestamps, redaction mode, and active categories.
8. **HTTP Security Headers & CSP:** [vercel.json](./vercel.json) enforces `Content-Security-Policy` with `connect-src 'none'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.

## Honest Threat Model & Limitations

> "Your document contents are processed locally in this browser. PrivacyGuard does not intentionally transmit document contents to an external server. Hosting providers still serve the application assets, and browser extensions or compromised devices may affect privacy."

- **Rule-Based Detection:** PII detection uses deterministic regular expressions, structural checks, and Luhn mod-10 checksums. Pattern matching **never** proves real-world identity or official government issuance (e.g., PAN or Aadhaar).
- **No Compliance Certification:** This application is a technical privacy utility and does not constitute formal legal or regulatory certification.
