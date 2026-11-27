"""PrivacyGuard AI FastAPI Backend.

Provides server-side PII detection, validation, redaction, CSV processing, and file upload
endpoints with zero database persistence, zero raw-PII logging, and no-store cache headers.
"""

from datetime import datetime, timezone
import json
import os
import time
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .engine.csv_processor import process_csv_document
from .engine.detector import ALL_PII_TYPES, detect_all_pii
from .engine.redactor import PseudonymSession, REDACTION_MODES, redact_text
from .schemas import (
    AuditReportRequest,
    DetectRequest,
    DetectResponse,
    HealthResponse,
    RedactRequest,
    RedactResponse,
)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".txt", ".csv"}
ALLOWED_MIME_TYPES = {
    "",
    "text/plain",
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/x-csv",
}

app = FastAPI(
    title="PrivacyGuard AI API",
    version="1.0.0",
    description=(
        "Rule-based and Luhn-validated PII detection and sanitization REST API. "
        "Processes documents ephemerally in memory with zero database persistence."
    ),
)

cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173",
)
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def add_privacy_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response


def _empty_category_counts() -> dict[str, int]:
    return {entity: 0 for entity in ALL_PII_TYPES}


def _line_count(text: str) -> int:
    if not text:
        return 0
    return len(text.replace("\r\n", "\n").replace("\r", "\n").split("\n"))


def _run_redaction_pipeline(
    text: str,
    mode: str,
    enabled_types: list[str],
    doc_format: str,
) -> RedactResponse:
    empty_counts = _empty_category_counts()
    lines = _line_count(text)

    if not text:
        return RedactResponse(
            detections=[],
            sanitized_text="",
            output_spans=[],
            total_detected=0,
            total_redacted=0,
            category_counts=empty_counts,
            processing_time_ms=0.0,
            input_chars=0,
            output_chars=0,
            line_count=0,
            csv_rows=0,
            csv_cols=0,
            csv_warnings=[],
        )

    t0 = time.perf_counter()

    if doc_format == "csv":
        csv_res = process_csv_document(text, enabled_types, mode)
        raw_detections = detect_all_pii(text, enabled_types)
        elapsed = max(0.1, round((time.perf_counter() - t0) * 1000, 2))

        if not csv_res["ok"]:
            return RedactResponse(
                detections=raw_detections,
                sanitized_text="",
                output_spans=[],
                total_detected=len(raw_detections),
                total_redacted=0,
                category_counts=empty_counts,
                processing_time_ms=elapsed,
                input_chars=len(text),
                output_chars=0,
                line_count=lines,
                csv_rows=0,
                csv_cols=0,
                csv_warnings=[csv_res["error"]],
            )

        counts = {**empty_counts, **csv_res["categoryCounts"]}
        max_cols = max((len(r) for r in csv_res["rows"]), default=0)
        return RedactResponse(
            detections=raw_detections,
            sanitized_text=csv_res["sanitizedText"],
            output_spans=[],
            total_detected=csv_res["totalDetections"],
            total_redacted=csv_res["redactedCount"],
            category_counts=counts,
            processing_time_ms=elapsed,
            input_chars=len(text),
            output_chars=len(csv_res["sanitizedText"]),
            line_count=lines,
            csv_rows=len(csv_res["rows"]),
            csv_cols=max_cols,
            csv_warnings=[],
        )

    detections = detect_all_pii(text, enabled_types)
    session = PseudonymSession() if mode == REDACTION_MODES["PSEUDONYM"] else None
    try:
        redacted = redact_text(text, detections, mode, session)
    finally:
        if session is not None:
            session.clear()

    elapsed = max(0.1, round((time.perf_counter() - t0) * 1000, 2))
    counts = {**empty_counts, **redacted["categoryCounts"]}

    return RedactResponse(
        detections=detections,
        sanitized_text=redacted["sanitizedText"],
        output_spans=redacted["spans"],
        total_detected=len(detections),
        total_redacted=redacted["redactedCount"],
        category_counts=counts,
        processing_time_ms=elapsed,
        input_chars=len(text),
        output_chars=len(redacted["sanitizedText"]),
        line_count=lines,
        csv_rows=0,
        csv_cols=0,
        csv_warnings=[],
    )


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="PrivacyGuard AI FastAPI Backend",
        version="1.0.0",
        processing_mode="ephemeral-in-memory",
        max_upload_bytes=MAX_UPLOAD_BYTES,
        supported_entities=list(ALL_PII_TYPES),
        supported_modes=list(REDACTION_MODES.values()),
        persistent_storage=False,
        privacy_note="Ephemeral memory processing only; no documents or raw PII are stored or logged.",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/api/detect", response_model=DetectResponse)
def detect_endpoint(payload: DetectRequest) -> DetectResponse:
    t0 = time.perf_counter()
    detections = detect_all_pii(payload.text, payload.enabled_types)
    elapsed = max(0.1, round((time.perf_counter() - t0) * 1000, 2))

    counts = _empty_category_counts()
    for det in detections:
        counts[det["type"]] = counts.get(det["type"], 0) + 1

    return DetectResponse(
        detections=detections,
        total_detected=len(detections),
        category_counts=counts,
        processing_time_ms=elapsed,
    )


@app.post("/api/redact", response_model=RedactResponse)
def redact_endpoint(payload: RedactRequest) -> RedactResponse:
    return _run_redaction_pipeline(
        text=payload.text,
        mode=payload.mode,
        enabled_types=payload.enabled_types,
        doc_format=payload.format,
    )


@app.post("/api/upload", response_model=RedactResponse)
async def upload_and_redact(
    file: UploadFile = File(...),
    mode: str = Form("pseudonym"),
    enabled_types: Optional[str] = Form(None),
):
    if mode not in set(REDACTION_MODES.values()):
        raise HTTPException(status_code=400, detail=f"Unsupported redaction mode: {mode}")

    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f'Unsupported file type "{ext or "unknown"}". Only .txt and .csv files are accepted.',
        )

    mime = (file.content_type or "").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f'Unsupported MIME type "{file.content_type}". Only plain text and CSV files are allowed.',
        )

    raw_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Uploaded file exceeds the 5 MB size limit.",
        )

    if b"\x00" in raw_bytes:
        raise HTTPException(
            status_code=400,
            detail="Binary null-byte content detected. Only plain UTF-8 text or CSV files are allowed.",
        )

    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to decode file as valid UTF-8 text.",
        ) from exc

    if text.startswith("\ufeff"):
        text = text[1:]

    if not text.strip():
        raise HTTPException(status_code=400, detail="Uploaded file contains only whitespace.")

    parsed_types = list(ALL_PII_TYPES)
    if enabled_types:
        try:
            decoded_types = json.loads(enabled_types)
            if not isinstance(decoded_types, list) or not all(
                t in ALL_PII_TYPES for t in decoded_types
            ):
                raise ValueError("Invalid entity category list")
            parsed_types = decoded_types
        except (json.JSONDecodeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Invalid enabled_types filter payload.") from exc

    doc_format = "csv" if ext == ".csv" else "txt"
    return _run_redaction_pipeline(
        text=text,
        mode=mode,
        enabled_types=parsed_types,
        doc_format=doc_format,
    )


@app.post("/api/audit-report")
def build_audit_report(payload: AuditReportRequest) -> JSONResponse:
    report = {
        "application": "PrivacyGuard AI",
        "processingMode": "FastAPI Ephemeral Server Processing (Zero Persistence)",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "settings": {
            "redactionMode": payload.mode,
            "inputFormat": payload.input_format,
            "enabledCategories": payload.enabled_types,
        },
        "summary": {
            "totalDetected": payload.total_detected,
            "totalRedacted": payload.total_redacted,
            "categoryCounts": payload.category_counts,
            "processingTimeMs": payload.processing_time_ms,
            "inputCharacters": payload.input_chars,
            "outputCharacters": payload.output_chars,
        },
        "auditEvents": [evt.model_dump() for evt in payload.events],
        "privacyNotice": (
            "No raw PII, original document text, or pseudonymization mappings are included in this report."
        ),
    }
    return JSONResponse(content=report)
