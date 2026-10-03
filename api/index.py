# ==============================================================================
# ReliabilityX — Vercel Serverless Entry Point
# ==============================================================================
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for p in [parent_dir, current_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.main import app
except Exception as e:
    import traceback
    err_msg = str(e)
    tb = traceback.format_exc()
    try:
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        app = FastAPI()

        @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        async def fallback(path: str):
            return JSONResponse(
                status_code=500,
                content={"status": "IMPORT_ERROR", "error": err_msg, "traceback": tb}
            )
    except Exception:
        # Ultimate fallback using Python stdlib WSGI app
        def app(environ, start_response):
            status = '500 Internal Server Error'
            headers = [('Content-type', 'application/json')]
            start_response(status, headers)
            import json
            return [json.dumps({"status": "CRITICAL_IMPORT_ERROR", "error": err_msg, "traceback": tb}).encode()]
