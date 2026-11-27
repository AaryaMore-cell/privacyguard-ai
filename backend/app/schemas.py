"""Pydantic request and response schemas for the PrivacyGuard AI FastAPI backend."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from .engine.detector import ALL_PII_TYPES

MAX_TEXT_LENGTH = 5 * 1024 * 1024  # 5 MB character cap

EntityTypeLiteral = Literal[
    "EMAIL",
    "PHONE",
    "IPV4",
    "IPV6",
    "INDIAN_PAN",
    "AADHAAR",
    "CREDIT_CARD",
]
RedactionModeLiteral = Literal["full", "partial", "pseudonym"]
DocumentFormatLiteral = Literal["txt", "csv"]


class DetectRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_LENGTH)
    enabled_types: list[EntityTypeLiteral] = Field(default_factory=lambda: list(ALL_PII_TYPES))


class DetectionItem(BaseModel):
    type: EntityTypeLiteral
    start: int
    end: int
    value: str
    normalized: str
    valid: bool
    explanation: str


class DetectResponse(BaseModel):
    detections: list[DetectionItem]
    total_detected: int
    category_counts: dict[str, int]
    processing_time_ms: float


class RedactRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_LENGTH)
    mode: RedactionModeLiteral = "pseudonym"
    enabled_types: list[EntityTypeLiteral] = Field(default_factory=lambda: list(ALL_PII_TYPES))
    format: DocumentFormatLiteral = "txt"


class OutputSpan(BaseModel):
    type: EntityTypeLiteral
    originalStart: int
    originalEnd: int
    outputStart: int
    outputEnd: int
    replacement: str


class RedactResponse(BaseModel):
    detections: list[DetectionItem]
    sanitized_text: str
    output_spans: list[OutputSpan]
    total_detected: int
    total_redacted: int
    category_counts: dict[str, int]
    processing_time_ms: float
    input_chars: int
    output_chars: int
    line_count: int
    csv_rows: int = 0
    csv_cols: int = 0
    csv_warnings: list[str] = Field(default_factory=list)


class AuditReportEvent(BaseModel):
    id: str
    timestamp: str
    action: str
    status: str
    detail: str


class AuditReportRequest(BaseModel):
    mode: RedactionModeLiteral
    input_format: DocumentFormatLiteral
    enabled_types: list[EntityTypeLiteral]
    total_detected: int
    total_redacted: int
    category_counts: dict[str, int]
    processing_time_ms: float
    input_chars: int
    output_chars: int
    events: list[AuditReportEvent] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    processing_mode: str
    max_upload_bytes: int
    supported_entities: list[str]
    supported_modes: list[str]
    persistent_storage: bool
    privacy_note: str
    timestamp: Optional[str] = None
