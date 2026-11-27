/**
 * Synthetic noisy sample fixtures for demonstration and testing.
 * Contains zero real-world personal data.
 */
export const SYNTHETIC_SAMPLE_TEXT = `# Synthetic Support & Compliance Log (100% Fake Demo Data)
Ticket #INC-2026-4091 | Timestamp: 14:35:00 | Order Ref: 9900112233445566 (Invalid Luhn - Must Ignore)

Primary Contact: Aarav.Sharma@example.com
Secondary Copy: aarav.sharma@example.com (Repeated Email for Pseudonym Check)
Billing Contact: priya.verma@demo-corp.in
Phone (Primary): +91 98765 43210
Phone (Repeated): +91-9876543210
Phone (Backup): 91234 56789

Network Telemetry:
- Client IPv4: 192.168.10.42
- Gateway IPv4: 10.0.4.18
- Invalid IPv4 (Ignore): 999.45.12.1
- Edge IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
- Link IPv6: fe80::1ff:fe23:4567:890a

Tax & Identity Formats (Synthetic Patterns Only):
- Applicant PAN: ABCDE1234F
- Co-Applicant PAN: pqrst5678k
- Aadhaar Format 1: 2345 6789 0123
- Aadhaar Format 2: 3456-7890-1234

Payment Card Checks:
- Valid Luhn Test Card 1: 4532 0151 1283 0366
- Valid Luhn Test Card 2: 5425-2334-3010-9903
- Invalid Luhn Card (Must Reject): 4532 0151 1283 0367
- Plain Counter (Must Reject): 1234567890123457
`;

export const SYNTHETIC_SAMPLE_CSV = `record_id,full_name,email,phone,pan_id,aadhaar_ref,card_test,ip_address,notes
101,Aarav Sharma,Aarav.Sharma@example.com,+91 98765 43210,ABCDE1234F,2345 6789 0123,4532 0151 1283 0366,192.168.10.42,"Escalated ticket, verified via callback"
102,Priya Verma,priya.verma@demo-corp.in,+91-9876543210,pqrst5678k,3456-7890-1234,5425-2334-3010-9903,2001:db8::1,"Quoted note with ""escaped quotes"" and
multiline detail; repeated phone"
103,Aarav Sharma,aarav.sharma@example.com,91234 56789,ABCDE1234F,2345 6789 0123,4532 0151 1283 0367,999.45.12.1,"Invalid Luhn card and invalid IPv4 must remain unredacted"
`;
