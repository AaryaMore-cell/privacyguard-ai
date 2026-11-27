"""Redaction engine implementing Full Mask, Partial Mask, and ephemeral Consistent Pseudonymization."""

import re
from typing import Optional

from .detector import PII_TYPES

REDACTION_MODES = {
    "FULL": "full",
    "PARTIAL": "partial",
    "PSEUDONYM": "pseudonym",
}

PSEUDONYM_PREFIX = {
    PII_TYPES["EMAIL"]: "USER",
    PII_TYPES["PHONE"]: "PHONE",
    PII_TYPES["INDIAN_PAN"]: "PAN",
    PII_TYPES["AADHAAR"]: "AADHAAR",
    PII_TYPES["CREDIT_CARD"]: "CARD",
    PII_TYPES["IPV4"]: "IP",
    PII_TYPES["IPV6"]: "IPV6",
}


class PseudonymSession:
    """Ephemeral in-memory pseudonymization table scoped to one request/document."""

    def __init__(self) -> None:
        self._category_maps: dict[str, dict[str, str]] = {}
        self._category_counters: dict[str, int] = {}

    def get_placeholder(self, entity_type: str, normalized_value: str) -> str:
        if entity_type not in self._category_maps:
            self._category_maps[entity_type] = {}
            self._category_counters[entity_type] = 0

        mapping = self._category_maps[entity_type]
        if normalized_value in mapping:
            return mapping[normalized_value]

        next_count = self._category_counters[entity_type] + 1
        self._category_counters[entity_type] = next_count
        prefix = PSEUDONYM_PREFIX.get(entity_type, entity_type)
        placeholder = f"{prefix}_{next_count:02d}"
        mapping[normalized_value] = placeholder
        return placeholder

    def clear(self) -> None:
        for mapping in self._category_maps.values():
            mapping.clear()
        self._category_maps.clear()
        self._category_counters.clear()


def _mask_all_digits_except_last(value: str, keep_last: int = 4, mask_char: str = "*") -> str:
    total_digits = sum(1 for ch in value if ch.isdigit())
    digits_to_mask = max(0, total_digits - keep_last)
    seen = 0
    out = []
    for ch in value:
        if ch.isdigit():
            seen += 1
            out.append(mask_char if seen <= digits_to_mask else ch)
        else:
            out.append(ch)
    return "".join(out)


def partial_mask_entity(entity_type: str, value: str) -> str:
    """Apply category-specific partial masking."""
    if entity_type == PII_TYPES["EMAIL"]:
        at_idx = value.find("@")
        if at_idx <= 0:
            return "[REDACTED]"
        local = value[:at_idx]
        domain = value[at_idx + 1 :]
        prefix_len = 2 if len(local) > 3 else 1
        prefix = local[:prefix_len]
        masked_count = max(3, len(local) - prefix_len)
        return f"{prefix}{'*' * masked_count}@{domain}"

    if entity_type in (PII_TYPES["PHONE"], PII_TYPES["CREDIT_CARD"], PII_TYPES["AADHAAR"]):
        return _mask_all_digits_except_last(value, 4, "*")

    if entity_type == PII_TYPES["INDIAN_PAN"]:
        trimmed = value.strip()
        if len(trimmed) != 10:
            return "[REDACTED]"
        return f"{trimmed[:2]}******{trimmed[8:]}"

    if entity_type == PII_TYPES["IPV4"]:
        parts = value.split(".")
        if len(parts) != 4:
            return "***.***.***.***"
        return f"{parts[0]}.***.***.***"

    if entity_type == PII_TYPES["IPV6"]:
        first_non_empty = next((p for p in value.split(":") if p), "")
        if not first_non_empty:
            return "****:****:****:****"
        return f"{first_non_empty}:****:****:****"

    return "[REDACTED]"


def format_redacted_token(
    detection: dict,
    mode: str,
    session: Optional[PseudonymSession] = None,
) -> str:
    if mode == REDACTION_MODES["FULL"]:
        return "[REDACTED]"
    if mode == REDACTION_MODES["PARTIAL"]:
        return partial_mask_entity(detection["type"], detection["value"])
    if mode == REDACTION_MODES["PSEUDONYM"]:
        if session is None:
            raise ValueError("Pseudonymization mode requires an active PseudonymSession")
        return session.get_placeholder(detection["type"], detection["normalized"])
    return "[REDACTED]"


def redact_text(
    text: str,
    detections: list[dict],
    mode: str = REDACTION_MODES["FULL"],
    session: Optional[PseudonymSession] = None,
) -> dict:
    """Redact resolved non-overlapping detections in `text` while preserving whitespace and punctuation."""
    if not isinstance(text, str) or len(text) == 0:
        return {
            "sanitizedText": text if isinstance(text, str) else "",
            "redactedCount": 0,
            "categoryCounts": {},
            "spans": [],
        }

    if not detections:
        return {
            "sanitizedText": text,
            "redactedCount": 0,
            "categoryCounts": {},
            "spans": [],
        }

    active_session = session
    owned_session = False
    if mode == REDACTION_MODES["PSEUDONYM"] and active_session is None:
        active_session = PseudonymSession()
        owned_session = True

    try:
        sorted_detections = sorted(detections, key=lambda d: d["start"])
        cursor = 0
        output_len = 0
        parts: list[str] = []
        spans: list[dict] = []
        category_counts: dict[str, int] = {}

        for item in sorted_detections:
            if item["start"] < cursor or item["end"] > len(text) or item["start"] >= item["end"]:
                continue

            unchanged = text[cursor : item["start"]]
            parts.append(unchanged)
            output_len += len(unchanged)

            replacement = format_redacted_token(item, mode, active_session)
            output_start = output_len
            parts.append(replacement)
            output_len += len(replacement)
            output_end = output_len

            spans.append(
                {
                    "type": item["type"],
                    "originalStart": item["start"],
                    "originalEnd": item["end"],
                    "outputStart": output_start,
                    "outputEnd": output_end,
                    "replacement": replacement,
                }
            )
            category_counts[item["type"]] = category_counts.get(item["type"], 0) + 1
            cursor = item["end"]

        parts.append(text[cursor:])
        return {
            "sanitizedText": "".join(parts),
            "redactedCount": len(spans),
            "categoryCounts": category_counts,
            "spans": spans,
        }
    finally:
        if owned_session and active_session is not None:
            active_session.clear()
