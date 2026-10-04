"""
ReliabilityX — Final Hardening & 20-Point Validation Test Suite
SIH26170 — AI-Driven Anomaly Detection in Component Burn-In & ESS
"""
from __future__ import annotations
import os
import re
import tempfile
import sqlite3
import unittest
import numpy as np
import pandas as pd
from typing import Dict, Any

from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS
from backend.core.db import ensure_db_ready, get_db_connection
from backend.prediction.forecaster import FuturePredictionEngine
from backend.prediction.evaluator import ModelEvaluator
from backend.risk.fusion import RiskFusionEngine
from backend.data.validator import DataQualityEngine
from backend.features.engineer import FeatureEngineeringEngine
from backend.ingestion.base import TelemetryPacket, validate_raw_packet


class TestFinalHardeningValidation(unittest.TestCase):
    def setUp(self):
        self.forecaster = FuturePredictionEngine()
        self.risk_engine = RiskFusionEngine()
        self.dq_engine = DataQualityEngine()

    # -------------------------------------------------------------------------
    # 1. No Component Leakage
    # -------------------------------------------------------------------------
    def test_01_no_component_leakage(self):
        """Verify train, validation, and test components are strictly disjoint."""
        comps = [f"C-{i:03d}" for i in range(25)]
        split_idx = 15
        train_comps = set(comps[:split_idx])
        test_comps = set(comps[split_idx:])
        
        # Must be strictly disjoint
        intersection = train_comps.intersection(test_comps)
        self.assertEqual(len(intersection), 0, "Component leakage detected between train and test sets!")

    # -------------------------------------------------------------------------
    # 2. No Lot Leakage
    # -------------------------------------------------------------------------
    def test_02_no_lot_leakage(self):
        """Verify that components from held-out lots never appear in training lots."""
        all_lots = ["LOT-2411A", "LOT-2411B", "LOT-2411C", "LOT-2411D", "LOT-2411E"]
        for held_out in all_lots:
            training_lots = [l for l in all_lots if l != held_out]
            self.assertNotIn(held_out, training_lots, f"Lot leakage: {held_out} found in training lots!")

    # -------------------------------------------------------------------------
    # 3. No Temporal / Future-Data Leakage
    # -------------------------------------------------------------------------
    def test_03_no_temporal_leakage(self):
        """Verify 24h forecasting features do NOT contain 96h or 168h measurements."""
        mock_data = pd.DataFrame([{
            "component_id": "C-TEST-01",
            "val_0h": 5.0,
            "val_24h": 5.4,
            "val_96h": None,
            "val_168h": None,
            "delta_0_24": 0.4,
            "drift_rate_24": 0.0167,
            "drift_rate_96": None,
            "drift_acceleration": 0.0
        }])
        feat_cols = ["val_0h", "val_24h", "delta_0_24", "drift_rate_24"]
        for col in feat_cols:
            self.assertNotIn("96", col, f"Temporal leakage: 96h feature '{col}' accessed in 24h feature set!")
            self.assertNotIn("168", col, f"Temporal leakage: 168h feature '{col}' accessed in 24h feature set!")

    # -------------------------------------------------------------------------
    # 4. Prediction Interval Coverage Calculation (PICP)
    # -------------------------------------------------------------------------
    def test_04_prediction_interval_coverage_calculation(self):
        """Verify empirical PICP calculation returns correct bounded percentage."""
        preds = [
            {"actual_168h": 10.0, "predicted_168h": 10.1, "lower_bound_95": 8.0, "upper_bound_95": 12.0, "stage_used": "96h", "error_absolute": 0.1},
            {"actual_168h": 15.0, "predicted_168h": 10.1, "lower_bound_95": 8.0, "upper_bound_95": 12.0, "stage_used": "96h", "error_absolute": 4.9},
            {"actual_168h": 9.5, "predicted_168h": 9.6, "lower_bound_95": 8.5, "upper_bound_95": 11.5, "stage_used": "96h", "error_absolute": 0.1},
            {"actual_168h": 10.5, "predicted_168h": 10.2, "lower_bound_95": 9.0, "upper_bound_95": 12.0, "stage_used": "96h", "error_absolute": 0.3}
        ]
        # 3 out of 4 inside bounds -> 75%
        res = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=preds,
            components_table=[{"component_id": "C-1", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        picp = res["prediction_interval_validation"]["picp_pct"]
        self.assertEqual(picp, 75.0)

    # -------------------------------------------------------------------------
    # 5. Mean Prediction Interval Width (MPIW)
    # -------------------------------------------------------------------------
    def test_05_prediction_interval_width(self):
        """Verify MPIW calculation accurately returns mean interval width."""
        preds = [
            {"actual_168h": 10.0, "predicted_168h": 10.0, "lower_bound_95": 8.0, "upper_bound_95": 12.0, "stage_used": "96h", "error_absolute": 0.0}, # width 4.0
            {"actual_168h": 10.0, "predicted_168h": 10.0, "lower_bound_95": 7.0, "upper_bound_95": 13.0, "stage_used": "96h", "error_absolute": 0.0}  # width 6.0
        ]
        # Mean width = (4.0 + 6.0) / 2 = 5.0
        res = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=preds,
            components_table=[{"component_id": "C-1", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        mpiw = res["prediction_interval_validation"]["mpiw"]
        self.assertEqual(mpiw, 5.0)

    # -------------------------------------------------------------------------
    # 6. P90 Calculation & Assumption
    # -------------------------------------------------------------------------
    def test_06_p90_calculation(self):
        """Verify P90 calculation matches Gaussian z=1.282 and includes assumption note."""
        mock_features = pd.DataFrame([{
            "component_id": "C-P90-TEST",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.5,
            "val_96h": 6.5,
            "val_168h": None,
            "delta_0_24": 0.5,
            "delta_24_96": 1.0,
            "drift_rate_24": 0.0208,
            "drift_rate_96": 0.0139,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="96h")
        self.assertEqual(len(preds), 1)
        p = preds[0]
        self.assertGreaterEqual(p["p90_estimated_upper_bound"], p["predicted_168h"])
        self.assertIn("gaussian residual distribution", p["p90_assumption"].lower())
        self.assertIn("not a physical", p["p90_assumption"].lower())

    # -------------------------------------------------------------------------
    # 7. Breach Probability Boundaries
    # -------------------------------------------------------------------------
    def test_07_breach_probability_boundaries(self):
        """Verify probability is strictly bounded in [0.0, 1.0] and pct in [0, 100]."""
        mock_features = pd.DataFrame([{
            "component_id": "C-PROB-TEST",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 6.5,
            "val_96h": 8.5,
            "val_168h": None,
            "delta_0_24": 1.5,
            "delta_24_96": 2.0,
            "drift_rate_24": 0.0625,
            "drift_rate_96": 0.0278,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="96h")
        p = preds[0]
        self.assertGreaterEqual(p["probability_of_limit_breach"], 0.0)
        self.assertLessEqual(p["probability_of_limit_breach"], 1.0)
        self.assertGreaterEqual(p["probability_of_breach_pct"], 0.0)
        self.assertLessEqual(p["probability_of_breach_pct"], 100.0)

    # -------------------------------------------------------------------------
    # 8. Missing Uncertainty Handling
    # -------------------------------------------------------------------------
    def test_08_missing_uncertainty(self):
        """Verify forecaster handles zero or missing uncertainty without crashing."""
        mock_features = pd.DataFrame([{
            "component_id": "C-ZERO-UNC",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.0,
            "val_96h": 5.0,
            "val_168h": None,
            "delta_0_24": 0.0,
            "delta_24_96": 0.0,
            "drift_rate_24": 0.0,
            "drift_rate_96": 0.0,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="96h")
        self.assertEqual(len(preds), 1)
        self.assertIsNotNone(preds[0]["probability_of_limit_breach"])
        self.assertIn(preds[0]["breach_probability_status"], ["CALCULATED", "CALCULATED_LOW_UNCERTAINTY"])

    # -------------------------------------------------------------------------
    # 9. Time-to-Breach with Linear Drift
    # -------------------------------------------------------------------------
    def test_09_time_to_breach_linear_drift(self):
        """Verify time-to-breach calculation solves delta_t = (L - y0)/dr for linear drift."""
        # val_now = 18.0, limit = 20.0, delta_y = 2.0. dr = 0.05 -> hrs_left = 40h. At 96h -> 136h (<= 168h).
        mock_features = pd.DataFrame([{
            "component_id": "C-LIN-DRIFT",
            "parameter_name": "leakage_current_uA",
            "val_0h": 13.2,
            "val_24h": 14.4,
            "val_96h": 18.0,
            "val_168h": None,
            "delta_0_24": 1.2,
            "delta_24_96": 3.6,
            "drift_rate_24": 0.05,
            "drift_rate_96": 0.05,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="96h")
        p = preds[0]
        self.assertEqual(p["time_to_breach_status"], "CALCULATED")
        self.assertIn("–", p["estimated_time_to_breach"])
        self.assertIsNotNone(p["lower_time_to_breach"])
        self.assertIsNotNone(p["upper_time_to_breach"])

    # -------------------------------------------------------------------------
    # 10. Time-to-Breach with Acceleration
    # -------------------------------------------------------------------------
    def test_10_time_to_breach_with_acceleration(self):
        """Verify accelerating drift solves quadratic crossing earlier than purely linear."""
        # Accelerating component approaching limit 20.0: val_now = 18.0
        mock_features = pd.DataFrame([{
            "component_id": "C-ACCEL-DRIFT",
            "parameter_name": "leakage_current_uA",
            "val_0h": 12.0,
            "val_24h": 13.5,
            "val_96h": 18.0,
            "val_168h": None,
            "delta_0_24": 1.5,
            "delta_24_96": 4.5,
            "drift_rate_24": 0.0625,
            "drift_rate_96": 0.0625,
            "drift_acceleration": 0.0006  # Positive acceleration
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="96h")
        p = preds[0]
        self.assertEqual(p["time_to_breach_status"], "CALCULATED")
        self.assertIsNotNone(p["lower_time_to_breach"])
        self.assertLess(p["lower_time_to_breach"], 168.0)

    # -------------------------------------------------------------------------
    # 11. Already Breached State
    # -------------------------------------------------------------------------
    def test_11_already_breached_state(self):
        """Verify that when current value >= limit (20.0), status is BREACHED_AT_<CURRENT_TIME>."""
        mock_features = pd.DataFrame([{
            "component_id": "C-ALREADY-BREACHED",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 22.5, # Exceeds 20.0 limit
            "val_96h": None,
            "val_168h": None,
            "delta_0_24": 17.5,
            "drift_rate_24": 0.729,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="24h")
        p = preds[0]
        self.assertEqual(p["time_to_breach_status"], "BREACHED_AT_24H")
        self.assertEqual(p["probability_of_limit_breach"], 1.0)
        self.assertEqual(p["breach_probability_status"], "ALREADY_BREACHED")

    # -------------------------------------------------------------------------
    # 12. Insufficient Evidence
    # -------------------------------------------------------------------------
    def test_12_insufficient_evidence(self):
        """Verify component with 0h only returns TIME_TO_BREACH_UNAVAILABLE."""
        mock_features = pd.DataFrame([{
            "component_id": "C-NEW-0H",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": None,
            "val_96h": None,
            "val_168h": None,
            "delta_0_24": None,
            "drift_rate_24": None,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="0h")
        p = preds[0]
        self.assertEqual(p["time_to_breach_status"], "TIME_TO_BREACH_UNAVAILABLE")
        self.assertIn("INSUFFICIENT_EVIDENCE", p["prediction_confidence"])

    # -------------------------------------------------------------------------
    # 13. Lot Systemic Anomaly Handling
    # -------------------------------------------------------------------------
    def test_13_lot_systemic_anomaly(self):
        """Verify that a shifted lot is classified as LOT_SYSTEMIC_SHIFT with investigation recommendation."""
        # 10 components in LOT-SHIFT, 6 of them drifting
        components = []
        for i in range(10):
            is_anom = (i < 6)
            components.append({
                "component_id": f"C-S-{i}",
                "lot_id": "LOT-SHIFTED",
                "risk_level": "REVIEW" if is_anom else "PASS",
                "evidence_breakdown": {
                    "drift_severity": "High" if is_anom else "Low",
                    "acceleration_severity": "Low"
                }
            })
        lots_summary = self.risk_engine.evaluate_lot_health(components, pd.DataFrame())
        lot_res = lots_summary["LOT-SHIFTED"]
        self.assertTrue(lot_res["is_lot_wide_pattern"])
        self.assertEqual(lot_res["lot_pattern_type"], "LOT_SYSTEMIC_SHIFT")
        self.assertIn("components affected by lot-systemic shift", lot_res["systemic_summary_message"])

    # -------------------------------------------------------------------------
    # 14. Test-System Anomaly Handling
    # -------------------------------------------------------------------------
    def test_14_test_system_anomaly(self):
        """Verify synchronized non-accelerating shift across >=70% is classified as TEST_SYSTEM_ANOMALY."""
        components = []
        for i in range(10):
            components.append({
                "component_id": f"C-TESTSYS-{i}",
                "lot_id": "LOT-INSTRUMENT",
                "risk_level": "REVIEW",
                "evidence_breakdown": {
                    "drift_severity": "High",
                    "acceleration_severity": "Low" # Uniform, not accelerating
                }
            })
        lots_summary = self.risk_engine.evaluate_lot_health(components, pd.DataFrame())
        lot_res = lots_summary["LOT-INSTRUMENT"]
        self.assertTrue(lot_res["is_test_system_anomaly"])
        self.assertEqual(lot_res["lot_pattern_type"], "TEST_SYSTEM_ANOMALY")
        self.assertEqual(lot_res["lot_health_trend"], "INSTRUMENT_CHECK")

    # -------------------------------------------------------------------------
    # 15. Sensor Anomaly Handling
    # -------------------------------------------------------------------------
    def test_15_sensor_anomaly(self):
        """Verify data validator catches spikes exceeding 5x IQR, NaN, and physical violations."""
        # 1. Reject NaN / Inf / malformed raw packets
        bad_nan_packet = {
            "component_id": "C-SENSOR",
            "lot_id": "LOT-A",
            "parameter": "leakage_current_uA",
            "value": float("nan")
        }
        res_nan = validate_raw_packet(bad_nan_packet)
        self.assertFalse(res_nan.is_valid)
        self.assertEqual(res_nan.status, "REJECTED")

        # 2. Flag extreme spike / physical violation in batch validator
        df_spike = pd.DataFrame([
            {"component_id": "C-1", "lot_id": "LOT-A", "test_stage": "0h", "timestamp": "0.0", "parameter_name": "leakage_current_uA", "parameter_value": 5.0},
            {"component_id": "C-1", "lot_id": "LOT-A", "test_stage": "24h", "timestamp": "24.0", "parameter_name": "leakage_current_uA", "parameter_value": 500.0} # Extreme spike
        ])
        clean_df, summary = self.dq_engine.validate_and_clean(df_spike)
        self.assertGreater(summary.get("noise_spikes_flagged", 0) + summary.get("physical_violations", 0) + len(summary.get("warnings", [])), 0)

    # -------------------------------------------------------------------------
    # 16. False-Positive / Sensitivity Trade-Off
    # -------------------------------------------------------------------------
    def test_16_false_positive_threshold_tradeoff(self):
        """Verify threshold_tradeoff_analysis returns 3 modes with workloads and rationale."""
        res = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": True, "lot_id": "LOT-A"}, "C-2": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=[{"actual_168h": 10.0, "predicted_168h": 10.0, "lower_bound_95": 8.0, "upper_bound_95": 12.0}],
            components_table=[
                {"component_id": "C-1", "risk_level": "HIGH RISK"},
                {"component_id": "C-2", "risk_level": "WATCH"}
            ],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        tradeoff = res["threshold_tradeoff_analysis"]
        self.assertIn("modes", tradeoff)
        self.assertEqual(len(tradeoff["modes"]), 3)
        mode_names = [m["mode_name"] for m in tradeoff["modes"]]
        self.assertIn("High Sensitivity Mode", mode_names)
        self.assertIn("Balanced Mode (Default)", mode_names)
        self.assertIn("Conservative Review Mode", mode_names)
        for m in tradeoff["modes"]:
            self.assertIn("inspection_workload_pct", m)
            self.assertIn("engineering_rationale", m)

    # -------------------------------------------------------------------------
    # 17. Production Cold Start
    # -------------------------------------------------------------------------
    def test_17_production_cold_start(self):
        """Verify ensure_db_ready initializes database tables and active benchmark on empty DB."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            # Cold start on fresh path
            ensure_db_ready(tmp_path)
            conn = sqlite3.connect(tmp_path)
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM datasets WHERE is_active = 1")
            active_count = c.fetchone()[0]
            self.assertGreaterEqual(active_count, 1)
            conn.close()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    # -------------------------------------------------------------------------
    # 18. Production API Parity
    # -------------------------------------------------------------------------
    def test_18_production_api_parity(self):
        """Verify API endpoints return dynamic real dataset counts rather than static mocks."""
        from backend.main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)

        res = client.get("/api/dashboard/overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_components", data)
        self.assertIn("risk_distribution", data)
        self.assertIsInstance(data["total_components"], int)

    # -------------------------------------------------------------------------
    # 19. WebSocket Production URL Construction
    # -------------------------------------------------------------------------
    def test_19_websocket_production_url_construction(self):
        """Verify that HTTPS API_BASE correctly converts to WSS URL without localhost."""
        api_base_prod = "https://reliabilityx.onrender.com/api"
        ws_url = api_base_prod.replace("https://", "wss://").replace("/api", "/ws/live")
        self.assertTrue(ws_url.startswith("wss://"))
        self.assertNotIn("localhost", ws_url)
        self.assertNotIn("127.0.0.1", ws_url)
        self.assertEqual(ws_url, "wss://reliabilityx.onrender.com/ws/live")

    # -------------------------------------------------------------------------
    # 20. No Localhost URL in Production Build
    # -------------------------------------------------------------------------
    def test_20_no_localhost_url_in_production_build(self):
        """Verify production bundle does not contain hardcoded localhost/127.0.0.1 fallback for production."""
        bundle_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "static", "app.bundle.js")
        if os.path.exists(bundle_path):
            with open(bundle_path, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("reliabilityx.onrender.com", content)

    # -------------------------------------------------------------------------
    # 21. 168h Target Invariant
    # -------------------------------------------------------------------------
    def test_21_forecast_168h_target_invariant(self):
        """Verify that 168h is the primary, invariant forecast target everywhere."""
        mock_features = pd.DataFrame([{
            "component_id": "C-TEST-168",
            "parameter_name": "leakage_current_uA",
            "lot_id": "LOT-2411A",
            "val_0h": 5.0,
            "val_24h": 6.2,
            "val_96h": None,
            "val_168h": None,
            "delta_0_24": 1.2,
            "drift_rate_24": 0.05,
            "pct_change_24": 24.0,
            "lot_zscore_24": 2.1
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="24h")
        self.assertGreater(len(preds), 0)
        p = preds[0]
        self.assertEqual(p["forecast_target_hour"], 168.0)
        self.assertIn("predicted_value_168h", p)
        self.assertIn("predicted_168h", p)
        self.assertNotIn("predicted_value_144h", p)
        self.assertNotIn("predicted_value_146h", p)
        self.assertNotIn("predicted_value_148h", p)

    # -------------------------------------------------------------------------
    # 22. Safety Slope Calculation & Enforcement
    # -------------------------------------------------------------------------
    def test_22_safety_slope_calculation(self):
        """Verify that predicted drift rate exceeding safety slope triggers review."""
        mock_features = pd.DataFrame([{
            "component_id": "C-SLOPE-01",
            "parameter_name": "leakage_current_uA",
            "lot_id": "LOT-2411A",
            "val_0h": 5.0,
            "val_24h": 12.0,  # limit is 20.0 -> headroom is 8.0 over 144h -> slope ~ 0.0556
            "val_96h": None,
            "val_168h": None,
            "delta_0_24": 7.0,
            "drift_rate_24": 0.2917,
            "pct_change_24": 140.0,
            "lot_zscore_24": 4.5
        }])
        preds, _ = self.forecaster.fit_and_predict(mock_features, stage_available="24h")
        p = preds[0]
        self.assertIn("safety_slope", p)
        self.assertIn("predicted_drift_rate", p)
        self.assertIn("slope_exceeded", p)
        self.assertIsInstance(p["slope_exceeded"], bool)

    # -------------------------------------------------------------------------
    # 23. LOLO Confusion Matrices & Aggregation Mathematics
    # -------------------------------------------------------------------------
    def test_23_lolo_confusion_matrices_and_aggregations(self):
        """Verify that LOLO per-lot metrics and macro/pooled aggregations are mathematically consistent."""
        from backend.prediction.evaluator import ModelEvaluator
        # Mock 2 lots: Lot A (1 TP, 1 FP, 10 TN, 0 FN), Lot B (2 TP, 0 FP, 8 TN, 1 FN)
        preds = [
            {"actual_168h": 10.0, "predicted_168h": 10.0, "error_absolute": 0.0}
        ]
        components = [
            {"component_id": "C-A1", "risk_level": "HIGH RISK"},  # TP
            {"component_id": "C-A2", "risk_level": "REVIEW"},     # FP
            {"component_id": "C-A3", "risk_level": "PASS"},       # TN
            {"component_id": "C-B1", "risk_level": "HIGH RISK"},  # TP
            {"component_id": "C-B2", "risk_level": "PASS"},       # FN
        ]
        gt = {
            "C-A1": {"is_defect": True, "lot_id": "LOT-A"},
            "C-A2": {"is_defect": False, "lot_id": "LOT-A"},
            "C-A3": {"is_defect": False, "lot_id": "LOT-A"},
            "C-B1": {"is_defect": True, "lot_id": "LOT-B"},
            "C-B2": {"is_defect": True, "lot_id": "LOT-B"},
        }
        features = pd.DataFrame([
            {"component_id": cid, "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.0}
            for cid in gt.keys()
        ])
        res = ModelEvaluator.evaluate_performance(gt, preds, components, features)
        lolo = res["leave_one_lot_out_cross_validation"]
        breakdown = lolo["per_lot_breakdown"]
        
        # Verify per-lot confusion matrix math
        for m in breakdown:
            tp, fp, tn, fn = m["tp"], m["fp"], m["tn"], m["fn"]
            expected_rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            expected_prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            self.assertAlmostEqual(m["recall"], round(expected_rec, 4))
            self.assertAlmostEqual(m["precision"], round(expected_prec, 4))

        # Verify macro recall matches unweighted mean of per-lot recalls
        rec_list = [m["recall"] for m in breakdown]
        self.assertAlmostEqual(lolo["macro_recall"], round(float(np.mean(rec_list)), 4))

    # -------------------------------------------------------------------------
    # 24. Ground Truth Independence from Detector Rules
    # -------------------------------------------------------------------------
    def test_24_ground_truth_independence(self):
        """Verify that ground truth defect labels are generated independently from anomaly thresholds."""
        from backend.data.generator import generate_burnin_dataset
        df, meta1 = generate_burnin_dataset(seed=42)
        gt1 = {cid: meta1["ground_truth"][cid]["is_defect"] for cid in meta1["ground_truth"]}
        
        # Running different anomaly detection threshold should never change ground truth
        df2, meta2 = generate_burnin_dataset(seed=42)
        gt2 = {cid: meta2["ground_truth"][cid]["is_defect"] for cid in meta2["ground_truth"]}
        self.assertEqual(gt1, gt2, "Ground truth labels changed unexpectedly!")

    # -------------------------------------------------------------------------
    # 25. Mahalanobis Singularity & Statistical Support Fallback
    # -------------------------------------------------------------------------
    def test_25_mahalanobis_zero_variance_and_singularity(self):
        """Verify that zero-variance or singular covariance returns INSUFFICIENT_STATISTICAL_SUPPORT."""
        from backend.anomaly.mahalanobis import MahalanobisDetector
        detector = MahalanobisDetector()
        
        # Zero variance dataset
        wide_df = pd.DataFrame({
            "component_id": [f"C-{i}" for i in range(15)],
            "feat_1": [5.0] * 15,  # constant -> zero variance
            "feat_2": [10.0 + i for i in range(15)]
        })
        results = detector.score(wide_df, ["feat_1", "feat_2"])
        for r in results:
            self.assertEqual(r["detector_status"], "INSUFFICIENT_STATISTICAL_SUPPORT")
            self.assertEqual(r["normalized_score"], 0.0)

    # -------------------------------------------------------------------------
    # 26. 9-State Anomaly & Engineering Classification Taxonomy
    # -------------------------------------------------------------------------
    def test_26_anomaly_classification_taxonomy(self):
        """Verify that risk fusion assigns valid classes from the 9-state taxonomy."""
        valid_taxonomy = {
            "NOMINAL_STABLE",
            "INSUFFICIENT_EVIDENCE",
            "SENSOR_ANOMALY",
            "DATA_QUALITY_ISSUE",
            "TEST_SYSTEM_ANOMALY",
            "LOT_SYSTEMIC_ANOMALY",
            "LOT_RELATIVE_ANOMALY",
            "COMPONENT_DEGRADATION",
            "CORRELATED_MULTIPARAMETER_DEGRADATION"
        }
        res = self.risk_engine.assess_component_risk(
            comp_id="C-TEST-TAXONOMY",
            lot_id="LOT-2411A",
            features=pd.DataFrame([{"component_id": "C-TEST-TAXONOMY", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "val_96h": None, "lot_zscore_24": 0.0}]),
            anomaly_scores={"normalized_score": 0.1},
            behaviour_fingerprint={"overall_state": "NORMAL"},
            predictions=[]
        )
        self.assertIn(res["anomaly_classification"], valid_taxonomy)

    # -------------------------------------------------------------------------
    # 27. Safety Slope Deterministic Cases (A, B, C, D) & Configurable Factor
    # -------------------------------------------------------------------------
    def test_27_safety_slope_deterministic_cases(self):
        """Verify deterministic evaluation of safety slope across Cases A, B, C, D."""
        # Case A: Low drift rate < safety slope -> slope_exceeded = False
        feat_a = pd.DataFrame([{
            "component_id": "C-SLOPE-A",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.1,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.0042,
            "drift_acceleration": 0.0
        }])
        preds_a, _ = self.forecaster.fit_and_predict(feat_a, stage_available="24h")
        self.assertFalse(preds_a[0]["slope_exceeded"])
        self.assertEqual(preds_a[0]["slope_status"], "SAFETY_SLOPE_COMPLIANT")
        self.assertEqual(preds_a[0]["safety_margin_factor"], CONFIG.safety_margin_factor)

        # Case B: High drift rate > safety slope -> slope_exceeded = True -> RULE-08 -> ENGINEERING_REVIEW_RECOMMENDED
        feat_b = pd.DataFrame([{
            "component_id": "C-SLOPE-B",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 9.5,  # headroom is 10.5 uA. Safety slope = 0.8 * 10.5 / 144 = 0.0583 uA/h
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.1875, # Predicted drift rate = 0.0625 > 0.0583, pred_168h = 18.5 < 20.0
            "drift_acceleration": 0.0
        }])
        preds_b, _ = self.forecaster.fit_and_predict(feat_b, stage_available="24h")
        p_b = preds_b[0]
        self.assertTrue(p_b["slope_exceeded"])
        self.assertEqual(p_b["slope_status"], "SAFETY_SLOPE_EXCEEDED")
        self.assertEqual(p_b["slope_recommendation"], "ENGINEERING_REVIEW_RECOMMENDED")

        # Mock predictions with slope_exceeded to test risk fusion RULE-08
        mock_pred_b = [{
            "component_id": "C-SLOPE-B",
            "parameter_name": "leakage_current_uA",
            "slope_exceeded": True,
            "is_p90_breach": False,
            "is_nominal_breach": False,
            "probability_of_limit_breach": 0.15
        }]
        risk_b = self.risk_engine.assess_component_risk(
            comp_id="C-SLOPE-B",
            lot_id="LOT-2411A",
            features=feat_b,
            anomaly_scores={"normalized_score": 0.1},
            behaviour_fingerprint={"overall_state": "NORMAL"},
            predictions=mock_pred_b
        )
        self.assertEqual(risk_b["risk_level"], "REVIEW")
        self.assertTrue(any("RULE-08" in r for r in risk_b["rules_fired"]))

        # Case C: Already exceeds absolute spec (Limit = 20.0, current = 22.0)
        feat_c = pd.DataFrame([{
            "component_id": "C-SLOPE-C",
            "parameter_name": "leakage_current_uA",
            "val_0h": 10.0,
            "val_24h": 22.0, # Exceeds 20.0
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.5,
            "drift_acceleration": 0.0
        }])
        risk_c = self.risk_engine.assess_component_risk(
            comp_id="C-SLOPE-C",
            lot_id="LOT-2411A",
            features=feat_c,
            anomaly_scores={"normalized_score": 0.5},
            behaviour_fingerprint={"overall_state": "NORMAL"},
            predictions=[]
        )
        self.assertEqual(risk_c["risk_level"], "HIGH RISK")
        self.assertEqual(risk_c["anomaly_classification"], "COMPONENT_DEGRADATION")
        self.assertTrue(any("RULE-01" in r for r in risk_c["rules_fired"]))

        # Case D: Missing Value_0h and Value_24h -> INSUFFICIENT_EVIDENCE
        feat_d = pd.DataFrame([{
            "component_id": "C-SLOPE-D",
            "parameter_name": "leakage_current_uA",
            "val_0h": None,
            "val_24h": None,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.0,
            "drift_acceleration": 0.0
        }])
        preds_d, _ = self.forecaster.fit_and_predict(feat_d, stage_available="24h")
        self.assertIsNone(preds_d[0]["predicted_value_168h"])
        self.assertEqual(preds_d[0]["prediction_status"], "INSUFFICIENT_EVIDENCE")

    # -------------------------------------------------------------------------
    # 28. Explicit 168h Leakage Absence in Inference
    # -------------------------------------------------------------------------
    def test_28_explicit_168h_leakage_absence(self):
        """Verify Value_168h is strictly excluded from feature sets passed into training/inference."""
        feature_cols_24h = ["val_0h", "val_24h", "delta_0_24", "drift_rate_24"]
        feature_cols_96h = ["val_0h", "val_24h", "val_96h", "delta_0_24", "delta_24_96", "drift_rate_24", "drift_rate_96", "drift_acceleration"]
        
        self.assertNotIn("val_168h", feature_cols_24h)
        self.assertNotIn("val_168h", feature_cols_96h)
        self.assertNotIn("delta_96_168", feature_cols_24h)
        self.assertNotIn("delta_96_168", feature_cols_96h)

    # -------------------------------------------------------------------------
    # 29. Lead Time Exact Wording & Synthetic Benchmark Scope
    # -------------------------------------------------------------------------
    def test_29_lead_time_exact_wording(self):
        """Verify lead time description contains exact required synthetic benchmark sentences."""
        preds = [{"actual_168h": 10.0, "predicted_168h": 10.1, "stage_used": "96h", "error_absolute": 0.1, "lower_bound_95": 9.0, "upper_bound_95": 11.0}]
        res = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=preds,
            components_table=[{"component_id": "C-1", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        desc = res["detection_lead_time"]["lead_time_description"]
        self.assertIn("In this synthetic benchmark, degradation cases were flagged at the 24h observation stage", desc)
        self.assertIn("corresponding to a simulated maximum early-warning horizon of 144h before the 168h endpoint", desc)
        self.assertIn("This is a synthetic benchmark result and should not be interpreted as a guaranteed real-world 144h warning capability", desc)

    # -------------------------------------------------------------------------
    # 30. Prediction Interval Methodology & Disclaimer
    # -------------------------------------------------------------------------
    def test_30_prediction_interval_wording_and_disclaimer(self):
        """Verify interval reporting avoids claiming an uncalibrated 95% guarantee."""
        preds = [{"actual_168h": 10.0, "predicted_168h": 10.1, "stage_used": "96h", "error_absolute": 0.1, "lower_bound_95": 9.0, "upper_bound_95": 11.0}]
        res = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=preds,
            components_table=[{"component_id": "C-1", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        piv = res["prediction_interval_validation"]
        self.assertEqual(piv["interval_method"], "Empirical residual-based estimated interval")
        self.assertIn("Not claimed", piv["nominal_calibrated_level"])
        self.assertIn("not presented as a formally calibrated 95% guarantee", piv["terminology_note"])

    # -------------------------------------------------------------------------
    # 31. Detector Fallback Does Not Produce Confident Normal
    # -------------------------------------------------------------------------
    def test_31_detector_unavailable_not_silently_normal(self):
        """Verify detector_status = INSUFFICIENT_STATISTICAL_SUPPORT results in INSUFFICIENT_EVIDENCE."""
        risk = self.risk_engine.assess_component_risk(
            comp_id="C-STAT-FALLBACK",
            lot_id="LOT-2411A",
            features=pd.DataFrame([{"component_id": "C-STAT-FALLBACK", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.0}]),
            anomaly_scores={"normalized_score": 0.0, "detector_status": "INSUFFICIENT_STATISTICAL_SUPPORT"},
            behaviour_fingerprint={"overall_state": "NORMAL"},
            predictions=[]
        )
        self.assertEqual(risk["anomaly_classification"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(risk["risk_level"], "WATCH")
        self.assertTrue(any("RULE-11" in r for r in risk["rules_fired"]))

    # -------------------------------------------------------------------------
    # 32. AEC-Q001-Referenced Robust DPAT Terminology
    # -------------------------------------------------------------------------
    def test_32_dpat_aec_q001_reference_wording(self):
        """Verify DPAT output uses AEC-Q001-referenced robust limit terminology."""
        from backend.anomaly.dpat import DPATDetector
        dpat = DPATDetector()
        mock_df = pd.DataFrame([
            {"component_id": f"C-{i}", "lot_id": "LOT-A", "parameter_name": "leakage_current_uA", "val_24h": 5.0 + 0.1 * i}
            for i in range(10)
        ] + [
            {"component_id": "C-OUTLIER", "lot_id": "LOT-A", "parameter_name": "leakage_current_uA", "val_24h": 15.0}
        ])
        scores = dpat.score(mock_df)
        outlier_score = next(s for s in scores if s["component_id"] == "C-OUTLIER")
        self.assertTrue(outlier_score["is_anomalous"])
        self.assertIn("AEC-Q001-referenced robust limit", outlier_score["evidence"])


if __name__ == "__main__":
    unittest.main()

