"""
ReliabilityX — Production Entrypoint for Vercel & Cloud Runtimes
Exposes `app` from `backend.main` with diagnostic exception handling and robust path resolution.
"""
import os
import sys

# Ensure root and backend are both present in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.main import app
except Exception as e:
    import traceback
    tb = traceback.format_exc()
    try:
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        app = FastAPI(title="ReliabilityX Diagnostic Fallback")

        @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        async def diag_route(path: str):
            return JSONResponse(
                status_code=500,
                content={
                    "status": "IMPORT_ERROR",
                    "error": str(e),
                    "traceback": tb,
                    "sys_path": sys.path,
                    "files_in_root": os.listdir(root_dir) if os.path.exists(root_dir) else []
                }
            )
    except Exception:
        def app(environ, start_response):
            status = '500 Internal Server Error'
            headers = [('Content-type', 'application/json')]
            start_response(status, headers)
            import json
            return [json.dumps({"status": "CRITICAL_IMPORT_ERROR", "error": str(e), "traceback": tb}).encode()]
