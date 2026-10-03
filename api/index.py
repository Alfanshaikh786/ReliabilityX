# ==============================================================================
# ReliabilityX — Vercel Serverless Entry Point & API Gateway
# SIH26170: Predictive Component Reliability Intelligence
# ==============================================================================
"""
Lightweight Zero-Dependency Vercel Serverless Gateway.
Uses Python Standard Library only (urllib.request) to proxy incoming /api/* requests
to the high-performance production Render backend (https://reliabilityx.onrender.com).
This guarantees:
1. Zero heavy dependency load in AWS Lambda / Vercel Serverless (avoids 250MB limit).
2. Sub-millisecond execution start.
3. Clean /api/* routing on Vercel domain.
"""
import os
import urllib.request
import urllib.error

BACKEND_URL = os.environ.get("RELIABILITYX_BACKEND_URL", "https://reliabilityx.onrender.com").rstrip("/")


def app(environ, start_response):
    path_info = environ.get("PATH_INFO", "")
    query_string = environ.get("QUERY_STRING", "")
    method = environ.get("REQUEST_METHOD", "GET")

    # Handle CORS preflight directly
    if method == "OPTIONS":
        start_response("200 OK", [
            ("Access-Control-Allow-Origin", "*"),
            ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
            ("Access-Control-Allow-Headers", "*"),
            ("Content-Length", "0"),
        ])
        return [b""]

    # Target path normalization
    if not path_info.startswith("/api"):
        target_path = f"/api{path_info}"
    else:
        target_path = path_info

    target_url = f"{BACKEND_URL}{target_path}"
    if query_string:
        target_url = f"{target_url}?{query_string}"

    content_length = int(environ.get("CONTENT_LENGTH", 0) or 0)
    body = environ["wsgi.input"].read(content_length) if content_length > 0 else None

    # Forward necessary headers
    headers = {}
    for key, value in environ.items():
        if key.startswith("HTTP_"):
            header_name = key[5:].replace("_", "-").title()
            if header_name.lower() not in ("host", "content-length"):
                headers[header_name] = value
        elif key in ("CONTENT_TYPE",):
            headers["Content-Type"] = value

    req = urllib.request.Request(target_url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status_code = f"{resp.status} {resp.reason}"
            resp_headers = [
                (k, v) for k, v in resp.getheaders()
                if k.lower() not in ("transfer-encoding", "content-encoding")
            ]
            resp_headers.append(("Access-Control-Allow-Origin", "*"))
            resp_headers.append(("Access-Control-Allow-Headers", "*"))
            resp_headers.append(("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"))
            start_response(status_code, resp_headers)
            return [resp.read()]
    except urllib.error.HTTPError as e:
        status_code = f"{e.code} {e.reason}"
        resp_headers = [
            (k, v) for k, v in e.headers.items()
            if k.lower() not in ("transfer-encoding", "content-encoding")
        ]
        resp_headers.append(("Access-Control-Allow-Origin", "*"))
        start_response(status_code, resp_headers)
        return [e.read()]
    except Exception as e:
        start_response("502 Bad Gateway", [
            ("Content-Type", "application/json"),
            ("Access-Control-Allow-Origin", "*")
        ])
        return [f'{{"status":"GATEWAY_ERROR","error":"{str(e)}","target":"{target_url}"}}'.encode("utf-8")]
