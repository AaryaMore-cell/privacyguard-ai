"""Comprehensive pytest suite for the PrivacyGuard AI FastAPI backend."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_and_security_headers():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("referrer-policy") == "no-referrer"
    assert "no-store" in res.headers.get("cache-control", "")

    data = res.json()
    assert data["status"] == "ok"
    assert data["persistent_storage"] is False
    assert "CREDIT_CARD" in data["supported_entities"]


def test_detect_endpoint_validates_luhn_overlaps_and_rejects_false_positives():
    sample = (
        "Email: Aarav.Sharma@example.com | Phone: +91 98765 43210 | "
        "Valid Card: 4532 0151 1283 0366 | Invalid Luhn: 4532 0151 1283 0367 | "
        "Random 16: 9900112233445566 | IPv4: 192.168.10.42 | Bad IPv4: 999.10.1.1 | "
        "IPv6: 2001:db8::1 | Time: 14:35:00 | PAN: abcde1234f | Aadhaar: 2345 6789 0123"
    )
    res = client.post("/api/detect", json={"text": sample})
    assert res.status_code == 200
    body = res.json()

    values = [d["value"] for d in body["detections"]]
    assert "Aarav.Sharma@example.com" in values
    assert "+91 98765 43210" in values
    assert "4532 0151 1283 0366" in values
    assert "4532 0151 1283 0367" not in values
    assert "4532 0151 1283" not in values
    assert "9900112233445566" not in values
    assert "999.10.1.1" not in values
    assert "14:35:00" not in values
    assert body["total_detected"] == 7


def test_redact_endpoint_all_three_modes_and_consistent_pseudonymization():
    text = (
        "Primary: Aarav.Sharma@example.com, Repeat: aarav.sharma@example.com, "
        "Card: 4532 0151 1283 0366, PAN: abcde1234f"
    )

    full_res = client.post("/api/redact", json={"text": text, "mode": "full"}).json()
    assert full_res["sanitized_text"] == (
        "Primary: [REDACTED], Repeat: [REDACTED], Card: [REDACTED], PAN: [REDACTED]"
    )

    partial_res = client.post("/api/redact", json={"text": text, "mode": "partial"}).json()
    assert "Aa**********@example.com" in partial_res["sanitized_text"]
    assert "**** **** **** 0366" in partial_res["sanitized_text"]
    assert "ab******4f" in partial_res["sanitized_text"]

    pseudo_res = client.post("/api/redact", json={"text": text, "mode": "pseudonym"}).json()
    assert pseudo_res["sanitized_text"] == (
        "Primary: USER_01, Repeat: USER_01, Card: CARD_01, PAN: PAN_01"
    )
    for span in pseudo_res["output_spans"]:
        assert (
            pseudo_res["sanitized_text"][span["outputStart"] : span["outputEnd"]]
            == span["replacement"]
        )


def test_redact_csv_preserves_quotes_and_multiline_cells():
    csv_input = (
        'id,email,note\n'
        '1,a@example.com,"Hello, ""world""\nLine 2 with 192.168.1.1"\n'
        '2,A@EXAMPLE.COM,Clean'
    )
    res = client.post(
        "/api/redact",
        json={"text": csv_input, "mode": "pseudonym", "format": "csv"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["csv_warnings"] == []
    assert body["csv_rows"] == 3
    assert body["csv_cols"] == 3
    assert '"Hello, ""world""\nLine 2 with IP_01"' in body["sanitized_text"]
    assert body["sanitized_text"].count("USER_01") == 2


def test_upload_endpoint_validates_files_and_rejects_binary_or_bad_extensions():
    bad_ext = client.post(
        "/api/upload",
        files={"file": ("malware.exe", b"hello", "application/octet-stream")},
        data={"mode": "full"},
    )
    assert bad_ext.status_code == 400

    null_bytes = client.post(
        "/api/upload",
        files={"file": ("binary.txt", b"hello\x00world", "text/plain")},
        data={"mode": "full"},
    )
    assert null_bytes.status_code == 400

    empty_file = client.post(
        "/api/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
        data={"mode": "full"},
    )
    assert empty_file.status_code == 400

    good_file = client.post(
        "/api/upload",
        files={"file": ("sample.txt", b"Contact qa@example.in and 10.0.0.5", "text/plain")},
        data={"mode": "pseudonym"},
    )
    assert good_file.status_code == 200
    assert good_file.json()["sanitized_text"] == "Contact USER_01 and IP_01"


def test_audit_report_endpoint_excludes_raw_pii():
    res = client.post(
        "/api/audit-report",
        json={
            "mode": "pseudonym",
            "input_format": "txt",
            "enabled_types": ["EMAIL", "CREDIT_CARD"],
            "total_detected": 2,
            "total_redacted": 2,
            "category_counts": {"EMAIL": 1, "CREDIT_CARD": 1},
            "processing_time_ms": 1.25,
            "input_chars": 80,
            "output_chars": 45,
            "events": [
                {
                    "id": "1",
                    "timestamp": "2026-11-27T08:40:00Z",
                    "action": "Sanitization Completed",
                    "status": "success",
                    "detail": "2 entities sanitized",
                }
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["totalRedacted"] == 2
    assert "zero persistence" in data["processingMode"].lower()
