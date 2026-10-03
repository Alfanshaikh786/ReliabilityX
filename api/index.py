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

from backend.main import app
