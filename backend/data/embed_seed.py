import gzip
import base64
import os

raw_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_benchmark.db")
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data_blob.py")

with open(raw_path, "rb") as f:
    raw = f.read()

comp = gzip.compress(raw)
b64 = base64.b64encode(comp).decode("ascii")

content = f'''"""
Embedded Canonical Seed Database for Serverless Cold Starts
125 Components, 5 Lots, Full Telemetry and Predictions
Auto-generated from seed_benchmark.db (Arrhenius Physics Benchmark)
"""
import gzip
import base64

SEED_DATA_B64_GZ = "{b64}"

def get_seed_db_bytes() -> bytes:
    compressed = base64.b64decode(SEED_DATA_B64_GZ.encode("ascii"))
    return gzip.decompress(compressed)
'''

with open(out_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Generated {out_path}: {len(raw)} raw bytes -> {len(comp)} compressed bytes ({len(b64)} b64 chars)")
