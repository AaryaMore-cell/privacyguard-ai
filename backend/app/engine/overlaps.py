"""Deterministic interval overlap resolution for PII candidates."""

ENTITY_PRIORITY = {
    "CREDIT_CARD": 70,
    "IPV6": 60,
    "EMAIL": 50,
    "INDIAN_PAN": 40,
    "AADHAAR": 30,
    "IPV4": 20,
    "PHONE": 10,
}


def spans_overlap(a: dict, b: dict) -> bool:
    """Return True when half-open intervals [a.start, a.end) and [b.start, b.end) intersect."""
    return a["start"] < b["end"] and b["start"] < a["end"]


def resolve_overlaps(detections: list[dict]) -> list[dict]:
    """Resolve overlapping detections deterministically and return sorted non-overlapping spans."""
    if not detections:
        return []

    ranked = sorted(
        detections,
        key=lambda item: (
            not bool(item.get("valid")),
            -(ENTITY_PRIORITY.get(item.get("type"), 0)),
            -(item["end"] - item["start"]),
            item["start"],
        ),
    )

    accepted: list[dict] = []
    for candidate in ranked:
        if not any(spans_overlap(existing, candidate) for existing in accepted):
            accepted.append(candidate)

    return sorted(accepted, key=lambda item: (item["start"], item["end"]))
