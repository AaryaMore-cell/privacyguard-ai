# PrivacyGuard AI — *"Your data. Your control."*

**100% Client-Side PII Detection, Classification, and Sanitization in Your Browser.**

PrivacyGuard AI is a privacy-first cybersecurity web application built for the Google Cybersecurity Hackathon using **Google Antigravity IDE**. It detects, validates, highlights, and sanitizes Personally Identifiable Information (PII) inside `.txt`, `.csv`, and pasted documents strictly within browser RAM—never uploading documents to external servers, databases, or third-party AI APIs.

---

## Problem Statement

Users and teams routinely paste sensitive logs, customer exports, or support tickets containing emails, phone numbers, IP addresses, PAN/Aadhaar identifiers, or payment card numbers into online tools—exposing raw PII to remote servers, third-party APIs, and persistent telemetry.

## Proposed Solution

PrivacyGuard AI moves the entire inspection and redaction pipeline into the user's browser tab:
- Zero backend, zero database, zero external PII/AI APIs, and zero analytics trackers.
- Works offline after initial static asset load.
- Combines deterministic pattern matching, structural validators, Luhn checksums, and priority-based overlap resolution with three flexible redaction modes.

---

## Key Features

- **7 PII Entity Categories:** `EMAIL`, `PHONE` (Indian `+91` & international), `IPV4` (0–255 octet check), `IPV6` (full & `::` compressed), `INDIAN_PAN` (`ABCDE1234F`), `AADHAAR` (12-digit format), and `CREDIT_CARD` (Luhn mod-10 validated).
- **Overlap & False-Positive Resolution:** Prevents phone or Aadhaar patterns from matching inside valid credit cards, and rejects invalid IPv4 octets, timestamps (`14:35:00`), and non-Luhn 16-digit numbers.
- **Three Redaction Modes:**
  1. **Mode A — Full Mask:** Replaces sensitive spans with `[REDACTED]`.
  2. **Mode B — Partial Mask:** Preserves minimal context (e.g., `Aa**********@example.com`, `+** ***** 3210`, `**** **** **** 0366`).
  3. **Mode C — Consistent Pseudonymization:** Maps repeated normalized entities deterministically within a document session (`USER_01`, `PHONE_01`, `PAN_01`, `CARD_01`, `IP_01`) using ephemeral in-memory maps.
- **RFC-4180 CSV Preservation:** Safely parses and re-serializes quoted values, embedded commas, escaped quotes (`""`), and multi-line cells while preserving row/column structure.
- **Live Side-by-Side Diff Viewer:** Color-coded original vs. sanitized comparison rendered purely with safe React text nodes (immune to HTML/XSS injection).
- **Live Analytics & Zero-PII Audit Trail:** Interactive SVG charts, processing latency in milliseconds, and downloadable JSON audit reports containing aggregate counts only.
- **One-Click Exports:** Copy sanitized output or download `.txt`, `.csv`, and JSON audit reports via browser `Blob` + `URL.createObjectURL`.

---

## Architecture & Tech Stack

- **Frontend:** React 19, Vite 8, JavaScript, HTML5, CSS3 (Dark Navy + Light Theme)
- **Icons:** `lucide-react` (bundled locally)
- **Testing:** Vitest, React Testing Library, `@testing-library/jest-dom`, `jsdom`
- **Browser APIs:** `File`, `TextDecoder('utf-8', { fatal: true })`, `Blob`, `URL.createObjectURL`, `navigator.clipboard`

### How It Works

1. **Input & Validation:** Pasted text or `.txt`/`.csv` files (up to 5 MB) are validated by extension, MIME type, size, and strict UTF-8 decoding.
2. **Detection & Validation:** Independent detectors scan source text without modifying it, running structural checks and `luhnCheck()`.
3. **Overlap Resolution:** `resolveOverlaps()` prioritizes validated, more specific spans (`CREDIT_CARD > IPV6 > EMAIL > INDIAN_PAN > AADHAAR > IPV4 > PHONE`).
4. **Sanitization & Export:** `redactText()` or `processCsvDocument()` applies the chosen mode and outputs sanitized text, live metrics, and zero-PII audit events.

> **Important Limitation:** Detection is strictly **rule-based and pattern-based**, not a machine-learning identity model. Pattern or format matching (such as PAN or Aadhaar format) never proves real-world identity or official government issuance.

---

## Privacy-First Design

> *"Your document contents are processed locally in this browser. PrivacyGuard does not intentionally transmit document contents to an external server. Hosting providers still serve the application assets, and browser extensions or compromised devices may affect privacy."*

- `connect-src 'none'` Content Security Policy configured in [vercel.json](./vercel.json).
- Zero `localStorage`, `sessionStorage`, cookies, or `IndexedDB` persistence for document contents or mappings.
- Zero PII written to `console` logs or JSON audit exports.

---

## Installation & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Run all unit and component tests
npm test

# 4. Run linter and production build
npm run lint
npm run build
```

*(On Windows PowerShell if `.ps1` scripts are restricted, run `npm.cmd` instead of `npm`.)*

---

## Deployment (Vercel / Static Hosting)

PrivacyGuard AI is pre-configured with [vercel.json](./vercel.json) for zero-config static deployment:
1. Push the `PrivacyGuard-AI` directory to a GitHub repository.
2. Import the repository in **Vercel** (Framework Preset: **Vite**, Build Command: `npm run build`, Output Directory: `dist`).
3. Deploy—every route rewrites cleanly to `index.html` and serves with strict CSP & privacy headers.

---

## Screenshots

- **Dashboard & Hero:** Dark navy cybersecurity interface with live session telemetry and `100% CLIENT-SIDE PROCESSING` indicator.
- **Sanitizer Workspace:** Drag-and-drop uploader, redaction mode selector, category filters, and synchronized color-coded Diff Viewer.
- **Detection Analytics & Audit History:** Interactive donut/bar charts and zero-PII JSON audit report exporter.

---

## Known Limitations & Future Improvements

- **Limitations:** Pattern-based detection cannot infer unstructured context (e.g., arbitrary free-form person names or physical street addresses) and does not verify whether a matched PAN/Aadhaar/card belongs to a real person.
- **Future Improvements:** Optional WebAssembly local NER model for unstructured names/addresses, PDF/DOCX client-side parsing, and batch multi-file archive export.
