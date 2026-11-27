"""Rule-based and checksum-validated PII detection engine."""

import re
from typing import Iterable, Optional

from .luhn import luhn_check
from .overlaps import resolve_overlaps
from .validators import (
    is_valid_aadhaar_format,
    is_valid_ipv4,
    is_valid_ipv6,
    is_valid_pan,
    is_valid_phone,
    normalize_phone,
)

PII_TYPES = {
    "EMAIL": "EMAIL",
    "PHONE": "PHONE",
    "IPV4": "IPV4",
    "IPV6": "IPV6",
    "INDIAN_PAN": "INDIAN_PAN",
    "AADHAAR": "AADHAAR",
    "CREDIT_CARD": "CREDIT_CARD",
}

ALL_PII_TYPES = list(PII_TYPES.values())

EMAIL_REGEX = re.compile(
    r"(?<![A-Za-z0-9._%+-])[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?![A-Za-z0-9_-])"
)
PHONE_REGEX = re.compile(
    r"(?<![+\dA-Za-z])(?:\+91[\s.-]?[6-9]\d{4}[\s.-]?\d{5}|\+91[\s.-]?[6-9]\d{9}|0[6-9]\d{9}|[6-9]\d{4}[\s.-]\d{5}|[6-9]\d{9}|\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?(?:\d[\s.-]?){6,12}\d)(?![\dA-Za-z])"
)
IPV4_REGEX = re.compile(r"(?<![.\dA-Za-z])(?:\d{1,3}\.){3}\d{1,3}(?![.\dA-Za-z])")
IPV6_REGEX = re.compile(
    r"(?<![0-9a-fA-F:])(?:[0-9a-fA-F]{0,4}:){2,7}(?:[0-9a-fA-F]{0,4}|(?:\d{1,3}\.){3}\d{1,3})(?![0-9a-fA-F:])"
)
PAN_REGEX = re.compile(r"(?<![A-Za-z0-9])[A-Za-z]{5}[0-9]{4}[A-Za-z](?![A-Za-z0-9])")
AADHAAR_REGEX = re.compile(
    r"(?<![\dA-Za-z-])(?<!\d[\s-])(?:\d{4}\s\d{4}\s\d{4}|\d{4}-\d{4}-\d{4}|\d{12})(?![\dA-Za-z-])(?![\s-]\d)"
)
CARD_REGEX = re.compile(r"(?<![\dA-Za-z-])(?:\d[ -]?){12,18}\d(?![\dA-Za-z-])")


def detect_emails(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in EMAIL_REGEX.finditer(text):
        value = match.group(0)
        results.append(
            {
                "type": PII_TYPES["EMAIL"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": value.lower(),
                "valid": True,
                "explanation": "Matched standard email address pattern",
            }
        )
    return results


def detect_phones(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in PHONE_REGEX.finditer(text):
        value = match.group(0)
        if not is_valid_phone(value):
            continue
        if not value.startswith("+"):
            prev_chunk = text[max(0, match.start() - 5) : match.start()]
            next_chunk = text[match.end() : min(len(text), match.end() + 5)]
            if re.search(r"\d{2,}[\s.-]$", prev_chunk) or re.match(r"^[\s.-]\d{2,}", next_chunk):
                continue
        results.append(
            {
                "type": PII_TYPES["PHONE"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": normalize_phone(value),
                "valid": True,
                "explanation": "Matched validated phone number format",
            }
        )
    return results


def detect_ipv4(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in IPV4_REGEX.finditer(text):
        value = match.group(0)
        if not is_valid_ipv4(value):
            continue
        results.append(
            {
                "type": PII_TYPES["IPV4"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": value,
                "valid": True,
                "explanation": "All four IPv4 octets validated between 0 and 255",
            }
        )
    return results


def detect_ipv6(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in IPV6_REGEX.finditer(text):
        value = match.group(0)
        if not is_valid_ipv6(value):
            continue
        results.append(
            {
                "type": PII_TYPES["IPV6"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": value.lower(),
                "valid": True,
                "explanation": "Matched validated IPv6 address structure",
            }
        )
    return results


def detect_pan(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in PAN_REGEX.finditer(text):
        value = match.group(0)
        if not is_valid_pan(value):
            continue
        results.append(
            {
                "type": PII_TYPES["INDIAN_PAN"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": value.upper(),
                "valid": True,
                "explanation": "Matched Indian PAN structural format (5 letters, 4 digits, 1 letter)",
            }
        )
    return results


def detect_aadhaar(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in AADHAAR_REGEX.finditer(text):
        value = match.group(0)
        if not is_valid_aadhaar_format(value):
            continue
        results.append(
            {
                "type": PII_TYPES["AADHAAR"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": re.sub(r"[\s-]", "", value),
                "valid": True,
                "explanation": "Matched 12-digit Aadhaar format (pattern match only; does not verify issuance)",
            }
        )
    return results


def detect_credit_cards(text: str) -> list[dict]:
    if not text:
        return []
    results = []
    for match in CARD_REGEX.finditer(text):
        value = match.group(0)
        luhn = luhn_check(value)
        if not luhn["valid"]:
            continue
        results.append(
            {
                "type": PII_TYPES["CREDIT_CARD"],
                "start": match.start(),
                "end": match.end(),
                "value": value,
                "normalized": luhn["digits"],
                "valid": True,
                "explanation": luhn["reason"],
            }
        )
    return results


def detect_all_pii(text: str, enabled_types: Optional[Iterable[str]] = None) -> list[dict]:
    """Run all enabled PII detectors without modifying source text and resolve overlaps."""
    if not isinstance(text, str) or len(text) == 0:
        return []

    active = set(enabled_types) if enabled_types is not None else set(ALL_PII_TYPES)
    candidates: list[dict] = []

    if PII_TYPES["CREDIT_CARD"] in active:
        candidates.extend(detect_credit_cards(text))
    if PII_TYPES["IPV6"] in active:
        candidates.extend(detect_ipv6(text))
    if PII_TYPES["EMAIL"] in active:
        candidates.extend(detect_emails(text))
    if PII_TYPES["INDIAN_PAN"] in active:
        candidates.extend(detect_pan(text))
    if PII_TYPES["AADHAAR"] in active:
        candidates.extend(detect_aadhaar(text))
    if PII_TYPES["IPV4"] in active:
        candidates.extend(detect_ipv4(text))
    if PII_TYPES["PHONE"] in active:
        candidates.extend(detect_phones(text))

    return resolve_overlaps(candidates)
