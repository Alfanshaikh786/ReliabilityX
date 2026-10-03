# ==============================================================================
# ReliabilityX — Vercel Serverless Entry Point
# ==============================================================================
import os
import sys

# Ensure project root is available in PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Ensure database is pre-seeded before serving any serverless request
from backend.core.config import CONFIG
from backend.core.db import ensure_db_ready

try:
    ensure_db_ready(CONFIG.db_path)
except Exception as e:
    import logging
    logging.getLogger("ReliabilityX").warning(f"Error ensuring DB ready in api/index.py: {e}")

from backend.main import app
