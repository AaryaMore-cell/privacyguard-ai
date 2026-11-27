"""RFC-4180 CSV parser, serializer, and cell-by-cell sanitization."""

from typing import Iterable

from .detector import detect_all_pii
from .redactor import PseudonymSession, REDACTION_MODES, redact_text


def parse_csv(text: str) -> dict:
    """Parse RFC-4180 CSV supporting quotes, escaped quotes, commas, and multiline fields."""
    if not isinstance(text, str):
        return {"ok": False, "error": "CSV input must be a string."}
    if len(text) == 0:
        return {"ok": True, "rows": []}

    rows: list[list[str]] = []
    current_row: list[str] = []
    current_chars: list[str] = []
    in_quotes = False
    field_started = False
    i = 0
    length = len(text)

    while i < length:
        ch = text[i]
        if in_quotes:
            if ch == '"':
                if i + 1 < length and text[i + 1] == '"':
                    current_chars.append('"')
                    i += 2
                    continue
                in_quotes = False
            else:
                current_chars.append(ch)
            i += 1
            continue

        if ch == '"':
            if field_started:
                return {
                    "ok": False,
                    "error": f"Malformed CSV: unexpected quote inside unquoted field at row {len(rows) + 1}.",
                }
            in_quotes = True
            field_started = True
        elif ch == ",":
            current_row.append("".join(current_chars))
            current_chars = []
            field_started = False
        elif ch in ("\r", "\n"):
            if ch == "\r" and i + 1 < length and text[i + 1] == "\n":
                i += 1
            current_row.append("".join(current_chars))
            rows.append(current_row)
            current_row = []
            current_chars = []
            field_started = False
        else:
            current_chars.append(ch)
            field_started = True
        i += 1

    if in_quotes:
        return {
            "ok": False,
            "error": f"Malformed CSV: unclosed quotation mark starting in row {len(rows) + 1}.",
        }

    if field_started or current_row or current_chars:
        current_row.append("".join(current_chars))
        rows.append(current_row)

    return {"ok": True, "rows": rows}


def serialize_csv(rows: list[list[str]]) -> str:
    """Serialize 2D string rows back into RFC-4180 CSV text."""
    if not rows:
        return ""
    out_rows = []
    for row in rows:
        out_cells = []
        for cell in row:
            val = "" if cell is None else str(cell)
            if any(c in val for c in ('"', ",", "\r", "\n")):
                escaped = val.replace('"', '""')
                out_cells.append(f'"{escaped}"')
            else:
                out_cells.append(val)
        out_rows.append(",".join(out_cells))
    return "\n".join(out_rows)


def process_csv_document(
    csv_text: str,
    enabled_types: Iterable[str],
    mode: str,
) -> dict:
    """Detect and sanitize PII per CSV cell while sharing an ephemeral pseudonym session."""
    parsed = parse_csv(csv_text)
    if not parsed["ok"]:
        return {"ok": False, "error": parsed["error"]}

    enabled_list = list(enabled_types)
    session = PseudonymSession() if mode == REDACTION_MODES["PSEUDONYM"] else None
    total_detections = 0
    redacted_count = 0
    category_counts: dict[str, int] = {}
    sanitized_rows: list[list[str]] = []

    try:
        for row in parsed["rows"]:
            out_row = []
            for cell in row:
                detections = detect_all_pii(cell, enabled_list)
                total_detections += len(detections)
                result = redact_text(cell, detections, mode, session)
                redacted_count += result["redactedCount"]
                for entity_type, count in result["categoryCounts"].items():
                    category_counts[entity_type] = category_counts.get(entity_type, 0) + count
                out_row.append(result["sanitizedText"])
            sanitized_rows.append(out_row)
    finally:
        if session is not None:
            session.clear()

    return {
        "ok": True,
        "rows": parsed["rows"],
        "sanitizedRows": sanitized_rows,
        "sanitizedText": serialize_csv(sanitized_rows),
        "totalDetections": total_detections,
        "redactedCount": redacted_count,
        "categoryCounts": category_counts,
    }
