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
    tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def fallback(path: str):
        return JSONResponse(
            status_code=500,
            content={"status": "IMPORT_ERROR", "error": str(e), "traceback": tb}
        )
