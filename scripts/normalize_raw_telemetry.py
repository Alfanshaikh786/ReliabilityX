"""
Normalizes timestamps in live_telemetry_raw to 1.0s steps for realistic telemetry demo display.
"""
from datetime import datetime, timezone, timedelta
from backend.core.db import get_db_connection

def main():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM live_telemetry_raw WHERE component_id LIKE 'C-BURST%'")
    rows = cur.execute("SELECT id FROM live_telemetry_raw ORDER BY id DESC LIMIT 25").fetchall()
    base = datetime.now(timezone.utc).replace(microsecond=0)
    for i, r in enumerate(rows):
        t = base - timedelta(seconds=i)
        cur.execute("UPDATE live_telemetry_raw SET timestamp = ? WHERE id = ?", (t.strftime("%Y-%m-%dT%H:%M:%S.000Z"), r["id"]))
    conn.commit()
    conn.close()
    print("Successfully normalized live_telemetry_raw timestamps to 1.0s steps.")

if __name__ == "__main__":
    main()
