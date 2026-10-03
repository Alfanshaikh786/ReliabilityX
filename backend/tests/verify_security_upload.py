"""
Verification script for Section 18 File Upload Security & Hardening
"""
import io
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_upload_security():
    print("--- [TEST 1] File Extension Whitelist: Reject .exe ---")
    files = {"file": ("malicious_payload.exe", io.BytesIO(b"MZ\\x90\\x00\\x03FAKEEXE"), "application/octet-stream")}
    r = requests.post(f"{BASE_URL}/api/data/upload", files=files)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"  [PASS] Rejected .exe with HTTP {r.status_code}: {r.json()['detail']}")

    print("--- [TEST 2] Reject Empty File ---")
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/data/upload", files=files)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"  [PASS] Rejected empty file with HTTP {r.status_code}: {r.json()['detail']}")

    print("--- [TEST 3] Reject Corrupted / Malformed CSV Content ---")
    files = {"file": ("corrupted.csv", io.BytesIO(b"\x00\xff\xfe\x12NOT_A_CSV"), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/data/upload", files=files)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"  [PASS] Rejected corrupted file with HTTP {r.status_code}: {r.json()['detail']}")

    print("--- [TEST 4] Reject Dataset with Missing Schema Columns ---")
    bad_schema_csv = b"component_id,lot_id,bad_col\nC-01,LOT-A,123\n"
    files = {"file": ("bad_schema.csv", io.BytesIO(bad_schema_csv), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/data/upload", files=files)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"  [PASS] Missing schema rejected cleanly with HTTP 400: {r.json()['detail']}")

    print("--- [TEST 5] Path Traversal Filename Sanitization & Valid Upload ---")
    # Valid CSV covering burn-in stages for 1 component
    valid_csv = (
        b"component_id,lot_id,test_stage,timestamp,parameter_name,parameter_value\n"
        b"C-01001,LOT-2411A,0h,0.0,leakage_current_uA,5.1\n"
        b"C-01001,LOT-2411A,24h,24.0,leakage_current_uA,5.5\n"
        b"C-01001,LOT-2411A,96h,96.0,leakage_current_uA,6.2\n"
        b"C-01001,LOT-2411A,168h,168.0,leakage_current_uA,7.0\n"
    )
    files = {"file": ("../../../../etc/passwd.csv", io.BytesIO(valid_csv), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/data/upload", files=files)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "passwd.csv" in data["dataset_name"], f"Path traversal not stripped: {data['dataset_name']}"
    assert ".." not in data["dataset_name"], f"Path traversal dots still present: {data['dataset_name']}"
    print(f"  [PASS] Path traversal sanitized safely: dataset_name='{data['dataset_name']}'")

    print("--- [TEST 6] Rate Limiting Protection ---")
    print("  Testing abuse protection rate limiting on expensive upload endpoint...")
    hit_429 = False
    for i in range(15):
        files = {"file": ("test_rate.csv", io.BytesIO(valid_csv), "text/csv")}
        resp = requests.post(f"{BASE_URL}/api/data/upload", files=files)
        if resp.status_code == 429:
            hit_429 = True
            print(f"  [PASS] Rate limiter triggered at request #{i+1}: HTTP 429 - {resp.json()['detail']}")
            break
    assert hit_429, "Rate limiter did not trigger after rapid upload burst"

    print("\n=======================================================")
    print("ALL FILE UPLOAD & RATE LIMIT SECURITY TESTS PASSED [OK]")
    print("=======================================================")

if __name__ == "__main__":
    test_upload_security()
