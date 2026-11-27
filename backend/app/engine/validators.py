"""Structural and format validators for PII candidates.

Note: Pattern and checksum matching never establishes real-world identity or official issuance.
"""

import ipaddress
import re


def is_valid_ipv4(value: str) -> bool:
    """Validate an IPv4 dotted-quad string (each octet 0-255, no leading zeros)."""
    if not isinstance(value, str):
        return False
    parts = value.split(".")
    if len(parts) != 4:
        return False

    for part in parts:
        if not re.fullmatch(r"\d{1,3}", part):
            return False
        if len(part) > 1 and part.startswith("0"):
            return False
        num = int(part)
        if num < 0 or num > 255:
            return False
    return True


def is_valid_ipv6(value: str) -> bool:
    """Validate full, compressed (::), and IPv4-mapped IPv6 addresses, rejecting lone :: and MACs."""
    if not isinstance(value, str):
        return False
    trimmed = value.strip()
    if ":" not in trimmed or trimmed == "::" or "%" in trimmed:
        return False

    if "." in trimmed:
        last_colon = trimmed.rfind(":")
        if last_colon != -1 and not is_valid_ipv4(trimmed[last_colon + 1 :]):
            return False

    try:
        ipaddress.IPv6Address(trimmed)
        return True
    except ValueError:
        return False


def is_valid_pan(value: str) -> bool:
    """Validate Indian PAN format (5 letters, 4 digits, 1 letter, case-insensitive)."""
    if not isinstance(value, str):
        return False
    return bool(re.fullmatch(r"[A-Za-z]{5}[0-9]{4}[A-Za-z]", value.strip()))


def is_valid_aadhaar_format(value: str) -> bool:
    """Validate 12-digit Aadhaar-format candidate (pattern match only; does not prove issuance)."""
    if not isinstance(value, str):
        return False
    trimmed = value.strip()
    if not re.fullmatch(r"(?:\d{12}|\d{4}\s\d{4}\s\d{4}|\d{4}-\d{4}-\d{4})", trimmed):
        return False
    digits = re.sub(r"[\s-]", "", trimmed)
    if len(set(digits)) == 1:
        return False
    return len(digits) == 12


def normalize_phone(value: str) -> str:
    """Normalize a phone number to digits with optional leading '+'."""
    if not isinstance(value, str):
        return ""
    trimmed = value.strip()
    has_plus = trimmed.startswith("+")
    digits = re.sub(r"\D", "", trimmed)
    return f"+{digits}" if has_plus else digits


def is_valid_phone(value: str) -> bool:
    """Validate Indian and clearly formatted international phone numbers."""
    if not isinstance(value, str):
        return False
    trimmed = value.strip()

    if re.fullmatch(r"\d{4}[-/.]\d{2}[-/.]\d{2}", trimmed):
        return False
    if re.fullmatch(r"\d{2}[-/.]\d{2}[-/.]\d{4}", trimmed):
        return False
    if re.fullmatch(r"\d{1,3}(?:\.\d{1,3}){3}", trimmed):
        return False

    digits = re.sub(r"\D", "", trimmed)
    if not digits or len(set(digits)) == 1:
        return False

    if re.fullmatch(r"(?:\+?91|0)?[6-9]\d{9}", digits):
        return True

    if trimmed.startswith("+") and 8 <= len(digits) <= 15:
        return True

    return False
