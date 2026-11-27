# PrivacyGuard AI — *"Your data. Your control."*

**Privacy-First PII Detection, Validation, and Sanitization Platform.**

PrivacyGuard AI detects, validates, highlights, and sanitizes Personally Identifiable Information (PII) inside `.txt`, `.csv`, and pasted documents. By default, **100% of processing runs locally in browser RAM** with zero network requests—and an optional **Python FastAPI backend** (`backend/`) is included for server-side API workflows when explicitly toggled in the UI.

---

## Problem Statement

Users and teams routinely paste sensitive logs, customer exports, or support tickets containing emails, phone numbers, IP addresses, PAN/Aadhaar identifiers, or payment card numbers into online tools—exposing raw PII to remote servers, third-party AI APIs, and persistent telemetry.

## Proposed Solution

PrivacyGuard AI enforces a privacy-first architecture across both execution modes:
- **Default Browser RAM Mode:** Zero backend calls, zero database, zero external AI APIs, zero analytics trackers, and works offline once assets load.
- **Optional FastAPI Server Mode (`/api/*`):** Ephemeral in-memory Python processing with `Cache-Control: no-store`, zero database persistence, and zero raw-PII logging.
- Combines deterministic pattern matching, structural validators, Luhn checksums, and $O(N \log N)$ cluster-based overlap resolution with three flexible redaction modes.

---

## Key Features

- **7 PII Entity Categories:** `EMAIL`, `PHONE` (Indian `+91` & international), `IPV4` (0–255 octet check), `IPV6` (full, `::` compressed & IPv4-mapped), `INDIAN_PAN` (`ABCDE1234F`), `AADHAAR` (12-digit format), and `CREDIT_CARD` (Luhn mod-10 validated).
- **Overlap & False-Positive Resolution:** $O(N \log N)$ cluster sweep prevents phone or Aadhaar sub-patterns from matching inside valid or invalid-Luhn 16-digit card numbers, and rejects invalid IPv4 octets, timestamps (`14:35:00`), MAC addresses, and non-Luhn 16-digit numbers.
- **Three Redaction Modes:**
  1. **Mode A — Full Mask:** Replaces sensitive spans with `[REDACTED]`.
  2. **Mode B — Partial Mask:** Preserves minimal context (e.g., `Aa**********@example.com`, `+** ***** *3210`, `**** **** **** 0366`).
  3. **Mode C — Consistent Pseudonymization:** Maps repeated normalized entities deterministically within a document session (`USER_01`, `PHONE_01`, `PAN_01`, `AADHAAR_01`, `CARD_01`, `IP_01`, `IPV6_01`) using ephemeral in-memory maps cleared immediately after each pass.
- **RFC-4180 CSV Preservation:** Slice-buffered parser & serializer handles quoted values, embedded commas, escaped quotes (`""`), and multi-line cells while sanitizing cell-by-cell.
- **Live Side-by-Side Diff Viewer:** Color-coded original vs. sanitized comparison rendered purely with safe React text nodes (immune to HTML/XSS injection).
- **Live Analytics & Zero-PII Audit Trail:** Interactive SVG charts, real `performance.now()` latency telemetry, and downloadable JSON audit reports containing aggregate counts only.
- **One-Click Exports:** Copy sanitized output or download `.txt`, `.csv`, and JSON audit reports via browser `Blob` + `URL.createObjectURL`.

---

## Architecture & Tech Stack

### Frontend
- **UI & Build:** React 19, Vite 8, JavaScript, HTML5, CSS3 (Midnight Neon Dark & Frost Light themes), `motion`, `lucide-react`, `@fontsource/space-grotesk` (all bundled locally).
- **Client Engines:** `src/engine/` (`detectPII.js`, `validatePII.js`, `luhn.js`, `resolveOverlaps.js`, `redactPII.js`), `src/utils/` (`csvUtils.js`, `fileUtils.js`, `exportUtils.js`, `apiClient.js`).
- **Testing & Linting:** Vitest 5, React Testing Library, `@testing-library/jest-dom`, `jsdom`, `oxlint`.

### Optional Python FastAPI Backend (`backend/`)
- **Stack:** Python 3.14, FastAPI, Pydantic v2, Uvicorn (`backend/app/main.py` & `backend/app/engine/`).
- **Endpoints:** `GET /api/health`, `POST /api/detect`, `POST /api/redact`, `POST /api/upload` (5 MB / `.txt` & `.csv` / null-byte & strict UTF-8 guards), and `POST /api/audit-report`.
- **Serverless Entrypoint:** `api/index.py` + `requirements.txt` for Vercel Python serverless routing.
- **Testing:** `pytest` + FastAPI `TestClient` (`backend/tests/test_api.py`).

### How It Works

1. **Input & Validation:** Pasted text or `.txt`/`.csv` files (up to 5 MB) are validated by extension, MIME type, non-empty size, binary null-byte rejection, and strict UTF-8 decoding.
2. **Detection & Validation:** Pre-compiled global regexes extract candidates without modifying source text, followed by structural checks and `luhnCheck()`.
3. **Overlap Resolution:** `resolveOverlaps()` partitions sorted intervals into overlapping clusters and selects winners deterministically (`CREDIT_CARD > IPV6 > EMAIL > INDIAN_PAN > AADHAAR > IPV4 > PHONE`).
4. **Sanitization & Export:** `redactText()` or `processCsvDocument()` applies the chosen mode in a single pass (debounced for rapid typing on `> 15 KB` inputs) and exports safely via `Blob` URLs.

> **Important Limitation:** Detection is strictly **rule-based and pattern-based**, not a machine-learning identity model. Pattern or format matching (such as PAN or Aadhaar format) never proves real-world identity or official government issuance.

---

## Privacy-First Design

> *"Your document contents are processed locally in this browser. PrivacyGuard does not intentionally transmit document contents to an external server. Hosting providers still serve the application assets, and browser extensions or compromised devices may affect privacy."*

- Zero `localStorage`, `sessionStorage`, cookies, or `IndexedDB` persistence for document contents or pseudonym mappings.
- Zero PII written to `console` logs or JSON audit exports.
- Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, CSP) configured in [vercel.json](./vercel.json) and [netlify.toml](./netlify.toml), plus `Cache-Control: no-store` on FastAPI `/api/*` responses.

---

## Installation & Running Locally

### Frontend
```bash
npm install
npm run dev      # http://127.0.0.1:5173 (proxies /api -> 127.0.0.1:8000)
npm test         # Vitest + React Testing Library + performance benchmarks
npm run lint     # Oxlint static analysis
npm run build    # Production bundle in dist/
```
*(On Windows PowerShell if `.ps1` scripts are restricted, run `npm.cmd` instead of `npm`.)*

### Optional FastAPI Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest tests -v
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Deployment (Vercel & Netlify)

- **Vercel (Frontend + FastAPI `/api/*`):** Import the GitHub repo in [vercel.com/new](https://vercel.com/new). [vercel.json](./vercel.json) builds `dist/` via Vite and routes `/api/*` to [api/index.py](./api/index.py).
- **Netlify (Static Frontend):** Import the GitHub repo in [app.netlify.com](https://app.netlify.com/). [netlify.toml](./netlify.toml) configures `npm run build` → `dist`, SPA rewrites, and security headers. (Host `backend/` on a Python runtime such as Render/Railway and set `VITE_API_BASE_URL` if using Server API mode.)

---

## Known Limitations & Future Improvements

- **Limitations:** Pattern-based detection cannot infer unstructured context (e.g., arbitrary free-form person names or physical street addresses) and does not verify whether a matched PAN/Aadhaar/card belongs to a real person. Exported `.csv` files preserve cells verbatim (including spreadsheet formula prefixes like `+` or `=`).
- **Future Improvements:** Optional WebAssembly local NER model for unstructured names/addresses, client-side PDF/DOCX parsing, and batch multi-file archive export.
