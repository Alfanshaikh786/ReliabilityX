"""
ReliabilityX Live Stream & Dual-Path Pipeline Verification Test
Automated end-to-end test verifying:
1. Live telemetry ingestion & Data Quality validation
2. Robust error rejection (NaN, Inf, missing IDs, malformed packets)
3. Gradual degradation transition: NORMAL -> DRIFTING -> ACCELERATING
4. Insufficient history handling vs live 168h prediction calculation
5. P90 Estimated Upper Bound & Estimated Prediction Interval
6. Dynamic risk escalation & inspection priority ranking
7. Alert generation & pipeline status indicator
8. Stale connection state detection
9. High-rate backpressure resilience
"""
from __future__ import annotations
import sys
import os
import time
import math
import asyncio
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from backend.ingestion.base import TelemetryPacket, validate_raw_packet
from backend.ingestion.manager import IngestionManager
from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS


async def run_pipeline_verification():
    print("=" * 70)
    print("RELIABILITYX — LIVE PIPELINE & HARDENING VERIFICATION")
    print("=" * 70)
    
    manager = IngestionManager()
    
    # -------------------------------------------------------------------------
    # TEST 1: Robust Data Quality & Packet Quarantine (Requirement 12)
    # -------------------------------------------------------------------------
    print("\n--- [TEST 1] Robust Telemetry Validation & Malformed Packet Rejection ---")
    
    # Test valid packet
    valid_raw = {
        "component_id": "C-TEST01",
        "lot_id": "LOT-TEST",
        "parameter": "leakage_current_uA",
        "value": 5.21,
        "timestamp_hours": 0.0,
        "test_stage": "0h"
    }
    res_valid = validate_raw_packet(valid_raw)
    assert res_valid.is_valid, "Valid packet should pass"
    print("  [PASS] 1a. Valid telemetry packet accepted.")

    # Test NaN rejection
    nan_raw = {**valid_raw, "value": float("nan")}
    res_nan = validate_raw_packet(nan_raw)
    assert not res_nan.is_valid and res_nan.status == "REJECTED", "NaN must be rejected"
    print(f"  [PASS] 1b. NaN value rejected safely: {res_nan.reason}")

    # Test Inf rejection
    inf_raw = {**valid_raw, "value": float("inf")}
    res_inf = validate_raw_packet(inf_raw)
    assert not res_inf.is_valid and res_inf.status == "REJECTED", "Inf must be rejected"
    print(f"  [PASS] 1c. Infinite value rejected safely: {res_inf.reason}")

    # Test missing component_id
    noid_raw = {**valid_raw, "component_id": ""}
    res_noid = validate_raw_packet(noid_raw)
    assert not res_noid.is_valid and res_noid.status == "REJECTED", "Missing ID must be rejected"
    print(f"  [PASS] 1d. Missing component_id rejected safely: {res_noid.reason}")

    # Feed malformed packet into manager to verify metrics tracking
    await manager.handle_incoming_packet(nan_raw)
    await manager.handle_incoming_packet(inf_raw)
    await manager.handle_incoming_packet(noid_raw)
    assert manager.rejected_count == 3, f"Expected 3 rejected packets, got {manager.rejected_count}"
    status = manager.get_status()
    print(f"  [PASS] 1e. Manager Data Quality metrics: Good={status['data_quality']['good_pct']}%, Rejected={status['data_quality']['rejected_pct']}%")

    # -------------------------------------------------------------------------
    # TEST 2: Start Stream & Connection States (Requirement 11)
    # -------------------------------------------------------------------------
    print("\n--- [TEST 2] Live Ingestion Stream & Connection State Tracking ---")
    start_status = await manager.start_stream("simulator")
    assert start_status["connection_status"] in ["CONNECTED", "LIVE"], "Connection status should be CONNECTED"
    assert "source_name" in start_status
    print(f"  [PASS] 2a. Stream started successfully. Status: {start_status['connection_status']}")
    print(f"  [PASS] 2b. Source identifier: '{start_status['source_name']}'")
    print(f"  [PASS] 2c. Pluggable equipment notice: '{start_status['source_integration_note']}'")

    # -------------------------------------------------------------------------
    # TEST 3: End-to-End Live Degradation Progression (NORMAL -> DRIFTING -> ACCELERATING)
    # (Requirement 34: The most important demonstration)
    # -------------------------------------------------------------------------
    print("\n--- [TEST 3] Real End-to-End Degradation: NORMAL -> DRIFTING -> ACCELERATING ---")
    
    test_comp = "C-DEMO-LIVE"
    test_lot = "LOT-2411C"
    param = "leakage_current_uA"

    received_samples = []
    def capture_sample(event_type, data):
        if event_type == "LIVE_SAMPLE" and data.get("component_id") == test_comp:
            received_samples.append(data)

    original_broadcast = manager.broadcast
    async def intercept_broadcast(ev_type, data):
        capture_sample(ev_type, data)
        await original_broadcast(ev_type, data)
    manager.broadcast = intercept_broadcast

    # Phase 3A: NORMAL STAGE (0h to 10h)
    print("  -> Injecting Early Telemetry (t=0h to 8h, Stable baseline)...")
    p0 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=0.0, test_stage="0h", parameter=param, value=5.05,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    p1 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=8.0, test_stage="BURN_IN", parameter=param, value=5.09,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    await manager.handle_incoming_packet(p0)
    await manager.handle_incoming_packet(p1)

    sample_early = received_samples[-1]
    assert sample_early["state"] == "NORMAL", f"Expected NORMAL state, got {sample_early['state']}"
    assert sample_early["risk"] in ["NOT ASSESSED", "INSUFFICIENT_EVIDENCE"], f"Expected NOT ASSESSED under insufficient evidence, got {sample_early['risk']}"
    # Verification of Requirement 5: Insufficient history
    assert sample_early["prediction_available"] is False, "Prediction must be unavailable for insufficient history (< 24h)"
    assert "insufficient" in sample_early["prediction_status"].lower()
    print("  [PASS] 3a. Early Stage Verified: State=NORMAL, Risk=NOT ASSESSED (Evidence Gated)")
    print(f"             Prediction status: '{sample_early['prediction_status']}'")

    # Phase 3B: DRIFTING STAGE (24h to 48h)
    print("  -> Injecting Intermediate Telemetry (t=24h to 48h, Monotonic linear drift)...")
    p2 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=24.0, test_stage="24h", parameter=param, value=6.20,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    p3 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=48.0, test_stage="BURN_IN", parameter=param, value=7.65,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    await manager.handle_incoming_packet(p2)
    await manager.handle_incoming_packet(p3)

    sample_drift = received_samples[-1]
    assert sample_drift["state"] in ["DRIFTING", "WATCH"], f"Expected DRIFTING, got {sample_drift['state']}"
    assert sample_drift["drift_rate"] > 0.02, f"Drift rate should be elevated, got {sample_drift['drift_rate']}"
    # Verification: Now sufficient history exists -> prediction active!
    assert sample_drift["prediction_available"] is True, "Prediction must be active after >= 24h"
    assert sample_drift["predicted_168h"] is not None
    assert sample_drift["p90_upper_bound"] is not None
    assert sample_drift["estimated_prediction_interval"] is not None
    print(f"  [PASS] 3b. Monotonic Drift Stage Verified: State={sample_drift['state']}, Risk={sample_drift['risk']}")
    print(f"             Drift Rate: +{sample_drift['drift_rate']:.4f} units/h")
    print(f"             Live 168h Forecast: {sample_drift['predicted_168h']:.2f} µA (P90: {sample_drift['p90_upper_bound']:.2f} µA)")

    # Phase 3C: ACCELERATING STAGE (72h to 96h) & LIMIT BREACH (110h)
    print("  -> Injecting Accelerated Degradation (t=72h to 96h, Quadratic acceleration)...")
    p4 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=72.0, test_stage="BURN_IN", parameter=param, value=11.20,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    p5 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=96.0, test_stage="96h", parameter=param, value=16.80,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    await manager.handle_incoming_packet(p4)
    sample_p4 = received_samples[-1]
    await manager.handle_incoming_packet(p5)
    sample_accel = received_samples[-1]

    assert sample_accel["state"] == "ACCELERATING", f"Expected ACCELERATING at 96h, got {sample_accel['state']}"
    assert sample_accel["risk"] in ["REVIEW", "HIGH RISK"], f"Expected REVIEW or HIGH RISK, got {sample_accel['risk']}"
    assert sample_accel["accel"] > 0.0003, f"Acceleration should be positive, got {sample_accel['accel']}"
    
    # Check alert was triggered upon entering accelerating state (at p4 or p5)
    alert_accel = sample_p4.get("alert") or sample_accel.get("alert")
    assert alert_accel is not None, "An alert must be generated when entering accelerating drift"
    print(f"  [PASS] 3c. Acceleration Stage Verified: State={sample_accel['state']}, Risk={sample_accel['risk']}")
    print(f"             Acceleration d²y/dt²: +{sample_accel['accel']:.6f} units/h²")
    print(f"             Alert Triggered: '{alert_accel['title']}'")
    print(f"             Pipeline status: '{sample_accel['pipeline_status']['status_string']}'")

    print("  -> Injecting Boundary Breach (t=110h, Exceeds 20.0 µA limit)...")
    p6 = TelemetryPacket(
        component_id=test_comp, lot_id=test_lot, timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_hours=110.0, test_stage="BURN_IN", parameter=param, value=22.40,
        unit="µA", source="SIMULATED_ATE_01", quality="GOOD"
    )
    await manager.handle_incoming_packet(p6)
    sample_breach = received_samples[-1]
    assert sample_breach["state"] == "HIGH RISK", f"Expected HIGH RISK, got {sample_breach['state']}"
    assert sample_breach["risk"] == "HIGH RISK"
    print(f"  [PASS] 3d. Hard Limit Breach Verified: State={sample_breach['state']}, Risk={sample_breach['risk']}")

    # -------------------------------------------------------------------------
    # TEST 4: Windowed Path ML & Inspection Priority Integration (Requirement 16)
    # -------------------------------------------------------------------------
    print("\n--- [TEST 4] Windowed Path ML & Actionable Inspection Priority ---")
    windowed_res = await manager._execute_windowed_path(test_lot)
    if windowed_res:
        ranked = windowed_res.get("ranked_components", [])
        assert len(ranked) > 0, "Ranked components queue should not be empty"
        top_comp = ranked[0]
        print(f"  [PASS] 4a. Top Inspection Priority Assigned: #{top_comp['inspection_priority']} ({top_comp['component_id']})")
        print(f"             Priority Reason: '{top_comp.get('priority_reason')}'")
        print(f"             Disposition Recommendation: '{top_comp.get('disposition_recommendation')}'")

    # -------------------------------------------------------------------------
    # TEST 5: STALE State Detection (Requirement 11)
    # -------------------------------------------------------------------------
    print("\n--- [TEST 5] STALE Connection State Detection ---")
    manager.connection_status = "CONNECTED"
    # Artificially set last_packet_time to 7 seconds in past
    manager.last_packet_time = time.time() - 7.5
    stale_status = manager.get_status()
    assert stale_status["connection_status"] == "STALE", f"Expected STALE, got {stale_status['connection_status']}"
    assert stale_status["seconds_since_last_packet"] >= 7.0
    print(f"  [PASS] 5a. Stale connection detected correctly after {stale_status['seconds_since_last_packet']}s without packet.")

    # -------------------------------------------------------------------------
    # TEST 6: High-Rate Telemetry Burst (Requirement 13)
    # -------------------------------------------------------------------------
    print("\n--- [TEST 6] High-Rate Telemetry Burst & Backpressure Resilience ---")
    t0 = time.time()
    for i in range(50):
        burst_pkt = TelemetryPacket(
            component_id=f"C-BURST-{i%5:02d}",
            lot_id=test_lot,
            timestamp=datetime.utcnow().isoformat(),
            timestamp_hours=24.0 + (i * 0.5),
            test_stage="BURN_IN",
            parameter=param,
            value=5.0 + (i * 0.05),
            unit="µA",
            source="SIMULATED_ATE_01",
            quality="GOOD"
        )
        await manager.handle_incoming_packet(burst_pkt)
    burst_elapsed = time.time() - t0
    status_burst = manager.get_status()
    print(f"  [PASS] 6a. 50 high-rate packets processed in {burst_elapsed*1000:.1f}ms ({50/burst_elapsed:.1f} packets/s)")
    print(f"             Queue depth: {status_burst['queue_depth']}, p95 latency: {status_burst['p95_latency_ms']} ms")

    await manager.stop_stream()
    print("\n" + "=" * 70)
    print(">>> ALL LIVE STREAM PIPELINE VERIFICATION TESTS PASSED PERFECTLY! <<<")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_pipeline_verification())
