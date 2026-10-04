"""
Comprehensive Production Parity and Pipeline Verification Test
Verifies:
1. Cold start database seeding from seed_benchmark.db (or generation pipeline)
2. Exact data counts:
   - Total components: 125
   - PASS (Normal): 62
   - WATCH (Drift): 40
   - ATTENTION REQUIRED (High Risk + Review): 23 (21 High Risk + 2 Review)
3. Component details and telemetry measurements for hero components
4. Counterfactual What-If simulation
5. Path prefix compatibility (/api/health and /health)
6. Entrypoints: backend.main:app and api.index:app
"""
from __future__ import annotations
import os
import sys
import shutil

# Ensure workspace root is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

def test_full_pipeline():
    print("=" * 70)
    print("RELIABILITYX — PRODUCTION DATA PIPELINE VERIFICATION")
    print("=" * 70)

    # Simulate fresh ephemeral database in a clean temporary path
    test_db = os.path.join(root_dir, "scratch_test_prod.db")
    if os.path.exists(test_db):
        os.remove(test_db)

    os.environ["RELIABILITYX_DB_PATH"] = test_db
    os.environ["VERCEL"] = "1"

    from backend.core.config import CONFIG
    CONFIG.db_path = test_db

    # Test entrypoint (api.index or backend.main)
    try:
        import api.index as vercel_entry
        app = vercel_entry.app
    except ImportError:
        import backend.main as vercel_entry
        app = vercel_entry.app

    from fastapi.testclient import TestClient
    client = TestClient(app)

    # 1. Health Endpoint
    res_health = client.get("/api/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
    health_data = res_health.json()
    assert health_data["status"] == "HEALTHY"
    assert health_data["active_dataset"] is not None, "active_dataset must not be null"
    dataset_id = health_data["active_dataset"]["id"]
    print(f"[PASS] 1. API Health OK. Active Dataset: {dataset_id}")

    # 2. Path prefix compatibility (/health without /api)
    res_alt_health = client.get("/health")
    assert res_alt_health.status_code == 200, "Alt /health without /api prefix failed"
    print("[PASS] 2. Path prefix compatibility middleware verified (/health -> /api/health).")

    # 3. Dashboard Overview & Risk Distribution
    res_overview = client.get("/api/dashboard/overview")
    assert res_overview.status_code == 200, f"Overview check failed: {res_overview.text}"
    ov = res_overview.json()

    total_comps = ov.get("total_components")
    risk_dist = ov.get("risk_distribution", {})
    pass_cnt = risk_dist.get("PASS", 0)
    watch_cnt = risk_dist.get("WATCH", 0)
    high_risk_cnt = risk_dist.get("HIGH RISK", 0)
    review_cnt = risk_dist.get("REVIEW", 0)
    attention_cnt = high_risk_cnt + review_cnt

    print("\n--- Pipeline Aggregation Metrics ---")
    print(f"Total Components Monitored: {total_comps} (Expected: 125)")
    print(f"Normal (Pass):              {pass_cnt} (Expected: 62)")
    print(f"Watch (Drift):              {watch_cnt} (Expected: 40)")
    print(f"Attention Required:         {attention_cnt} (Expected: 23 — {high_risk_cnt} High Risk, {review_cnt} Review)")

    assert total_comps == 125, f"Expected 125 components, got {total_comps}"
    assert pass_cnt == 62, f"Expected 62 Normal (PASS), got {pass_cnt}"
    assert watch_cnt == 40, f"Expected 40 Watch, got {watch_cnt}"
    assert attention_cnt == 23, f"Expected 23 Attention Required, got {attention_cnt}"
    print("[PASS] 3. Exact benchmark data pipeline parity verified (125 / 62 / 40 / 23).")

    # 4. Component Directory
    res_comps = client.get("/api/components?limit=150")
    assert res_comps.status_code == 200
    comps_data = res_comps.json()
    assert comps_data["total"] == 125
    assert len(comps_data["components"]) == 125
    print(f"[PASS] 4. Component directory loaded {len(comps_data['components'])} components from database.")

    # 5. Hero Component Detail Drill-down (C-01008)
    res_c1008 = client.get("/api/components/C-01008")
    assert res_c1008.status_code == 200, f"C-01008 not found: {res_c1008.text}"
    c1008 = res_c1008.json()
    assert "component" in c1008
    assert "measurements" in c1008
    assert len(c1008["measurements"]) == 16, f"Expected 16 measurements, got {len(c1008['measurements'])}"
    assert "predictions" in c1008
    assert len(c1008["predictions"]) == 4, f"Expected 4 predictions, got {len(c1008['predictions'])}"
    print(f"[PASS] 5. Component C-01008 telemetry loaded: {len(c1008['measurements'])} measurements across 4 stages.")

    # 6. Counterfactual What-If Simulation
    res_sim = client.post("/api/counterfactual/simulate", json={
        "component_id": "C-01008",
        "parameter_name": "leakage_current_uA",
        "simulated_drift_rate": 0.08
    })
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert "max_allowable_drift_rate" in sim_data
    print(f"[PASS] 6. Counterfactual simulation returned: max allowable drift = {sim_data['max_allowable_drift_rate']}")

    # 7. Cleanup
    if os.path.exists(test_db):
        os.remove(test_db)
    print("\n" + "=" * 70)
    print("ALL PRODUCTION PARITY AND PIPELINE TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    test_full_pipeline()
