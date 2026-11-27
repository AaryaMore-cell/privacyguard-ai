"""Luhn (mod-10) checksum validation for payment card candidates."""

import re


def luhn_check(raw_candidate: str) -> dict:
    """Validate a card number candidate using Luhn checksum and length bounds (13-19 digits)."""
    if not isinstance(raw_candidate, str):
        return {"valid": False, "digits": "", "reason": "Input is not a string"}

    digits = re.sub(r"[\s-]", "", raw_candidate)

    if not digits.isdigit():
        return {"valid": False, "digits": digits, "reason": "Contains non-digit characters"}

    if len(digits) < 13 or len(digits) > 19:
        return {
            "valid": False,
            "digits": digits,
            "reason": f"Invalid card length ({len(digits)}); expected 13-19 digits",
        }

    if len(set(digits)) == 1:
        return {
            "valid": False,
            "digits": digits,
            "reason": "Rejected degenerate repeated-digit sequence",
        }

    total = 0
    should_double = False
    for ch in reversed(digits):
        digit = ord(ch) - 48
        if should_double:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
        should_double = not should_double

    valid = total % 10 == 0
    return {
        "valid": valid,
        "digits": digits,
        "reason": (
            "Passed Luhn checksum and length validation (13-19 digits)"
            if valid
            else "Failed Luhn checksum validation"
        ),
    }
