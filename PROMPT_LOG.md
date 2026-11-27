# AI Development Prompt & Decision Log — PrivacyGuard AI

> Note: This file records software engineering prompts and architectural decisions made inside Google Antigravity IDE. It is completely separate from the runtime Document Audit Log and contains **zero real PII**.

## Stage 1 — Workspace Inspection & Architecture
- **Prompt / Goal:** Inspect `d:\Hack2skills`, scaffold a JavaScript React + Vite project (`PrivacyGuard-AI`), configure Vitest + React Testing Library, and define a modular client-side architecture.
- **Key Decisions:**
  - Chose pure JavaScript + React 19 + Vite 8 for beginner accessibility and zero-backend static deployment.
  - Replaced external CSV/PII dependencies with custom, auditable client-side modules (`csvUtils.js`, `detectPII.js`, `redactPII.js`).
  - Configured `npm.cmd` invocation in Windows PowerShell to respect system execution policies cleanly.

## Stage 2 — PII Detection & Validation Engine
- **Prompt / Goal:** Build deterministic, zero-mutation detection for `EMAIL`, `PHONE`, `IPV4`, `IPV6`, `INDIAN_PAN`, `AADHAAR`, and `CREDIT_CARD` with Luhn validation and overlap resolution.
- **Key Decisions:**
  - Implemented `luhnCheck()` rejecting degenerate all-identical digit strings (`0000000000000000`) and non-13..19-digit candidates.
  - Built priority-ranked `resolveOverlaps()` (`CREDIT_CARD > IPV6 > EMAIL > INDIAN_PAN > AADHAAR > IPV4 > PHONE`) so valid credit cards are never partially split into phone or Aadhaar matches.

## Stage 3 — Three Redaction Modes
- **Prompt / Goal:** Implement Full Mask (`[REDACTED]`), Partial Mask (category-aware), and Consistent Pseudonymization (`USER_01`, `PHONE_01`, `CARD_01`, etc.) strictly in memory.
- **Key Decisions:**
  - Created `createPseudonymSession()` using ephemeral per-category `Map`s cleared immediately after processing and never exposed to the UI or browser storage.

## Stage 4–6 — UI, CSV Preservation, Security & QA
- **Prompt / Goal:** Connect the engine to a cybersecurity SaaS dashboard (dark navy + light theme), safe React-node `DiffViewer`, live SVG analytics, zero-PII audit log, `.txt`/`.csv`/`.json` Blob exports, and Vercel CSP headers.
- **Key Decisions:**
  - Rendered all diff highlights with React text slices (`<mark>{text.slice(start, end)}</mark>`) instead of `dangerouslySetInnerHTML` to prevent XSS.
  - Enforced `connect-src 'none'` in `vercel.json` CSP headers to guarantee zero runtime outbound connections.
