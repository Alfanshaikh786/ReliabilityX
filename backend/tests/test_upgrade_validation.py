"""
ReliabilityX — Upgrade Validation Test Suite (Phase 32)
Automated verification for all 36-phase upgrade requirements:
1. Telemetry validation (clean, malformed, missing, NaN, Inf, empty ID)
2. Common-mode sensor & test-system anomaly detection (TEST_SYSTEM_ANOMALY)
3. Lot-wide systemic degradation (LOT_SYSTEMIC_SHIFT) vs individual anomalies
4. Temporal acceleration persistence requirement (noise filter)
5. Early prediction gating & INSUFFICIENT_EVIDENCE handling
6. Mahalanobis covariance safeguards (INSUFFICIENT_STATISTICAL_SUPPORT)
7. LOF windowed sample support (INSUFFICIENT_STATISTICAL_SUPPORT)
8. Anti-leakage lot-based split & detection lead time evaluation
9. Model/data drift monitoring framework
10. 7 Demo scenarios contract for SIH presentation
11. API backward compatibility preservation
"""
from __future__ import annotations
import os
import sys
import unittest
import numpy as np
import pandas as pd
from datetime import datetime, timezone

# Ensure project root is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS
from backend.ingestion.base import validate_raw_packet
from backend.anomaly.mahalanobis import MahalanobisDetector
from backend.anomaly.lof import LOFDetector
from backend.anomaly.ensemble import AnomalyEnsembleEngine
from backend.timeseries.behaviour import BehaviourEngine
from backend.prediction.forecaster import FuturePredictionEngine
from backend.prediction.evaluator import ModelEvaluator
from backend.risk.fusion import RiskFusionEngine
from backend.data.generator import generate_burnin_dataset
from backend.features.engineer import FeatureEngineeringEngine
from backend.data.validator import DataQualityEngine


class TestReliabilityXUpgradeValidation(unittest.TestCase):

    def setUp(self):
        self.risk_engine = RiskFusionEngine()
        self.behaviour_engine = BehaviourEngine()
        self.prediction_engine = FuturePredictionEngine()

    # -------------------------------------------------------------
    # 1. Clean & Malformed Telemetry, Duplicates, Disorder, Spikes
    # -------------------------------------------------------------
    def test_clean_telemetry_accepted(self):
        pkt_dict = {
            "component_id": "C-TEST-001",
            "lot_id": "LOT-TEST-A",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "parameter": "leakage_current_uA",
            "value": 4.52,
            "timestamp_hours": 24.0,
            "test_stage": "24h"
        }
        res = validate_raw_packet(pkt_dict)
        self.assertTrue(res.is_valid, f"Expected clean packet to be valid, got: {res.reason}")
        self.assertEqual(res.status, "GOOD")

    def test_malformed_telemetry_rejected(self):
        # NaN measurement
        bad_nan = {
            "component_id": "C-TEST-001",
            "lot_id": "LOT-TEST-A",
            "parameter": "leakage_current_uA",
            "value": float("nan"),
            "test_stage": "24h"
        }
        res_nan = validate_raw_packet(bad_nan)
        self.assertFalse(res_nan.is_valid)
        self.assertEqual(res_nan.status, "REJECTED")

        # Inf measurement
        bad_inf = {
            "component_id": "C-TEST-001",
            "lot_id": "LOT-TEST-A",
            "parameter": "leakage_current_uA",
            "value": float("inf"),
            "test_stage": "24h"
        }
        res_inf = validate_raw_packet(bad_inf)
        self.assertFalse(res_inf.is_valid)
        self.assertEqual(res_inf.status, "REJECTED")

        # Missing component ID
        bad_id = {
            "component_id": "",
            "lot_id": "LOT-TEST-A",
            "parameter": "leakage_current_uA",
            "value": 5.0,
            "test_stage": "24h"
        }
        res_id = validate_raw_packet(bad_id)
        self.assertFalse(res_id.is_valid)
        self.assertEqual(res_id.status, "REJECTED")

    # -------------------------------------------------------------
    # 2. Common-Mode Sensor / Test-System Anomaly (Phase 5)
    # -------------------------------------------------------------
    def test_common_mode_test_system_anomaly(self):
        # Simulate 10 components in lot LOT-SYS where 8 (80%) show simultaneous drift
        comps = []
        for i in range(10):
            is_affected = i < 8
            comps.append({
                "component_id": f"C-SYS-{i:02d}",
                "lot_id": "LOT-SYS",
                "risk_level": "REVIEW" if is_affected else "PASS",
                "evidence_breakdown": {
                    "drift_severity": "High" if is_affected else "None",
                    "acceleration_severity": "None",
                    "lot_anomaly": "High" if is_affected else "Low"
                }
            })
        
        lot_health = self.risk_engine.evaluate_lot_health(comps, pd.DataFrame())
        lot_sys = lot_health["LOT-SYS"]
        self.assertTrue(lot_sys["is_test_system_anomaly"])
        self.assertEqual(lot_sys["lot_pattern_type"], "TEST_SYSTEM_ANOMALY")
        self.assertIn("POSSIBLE TEST-SYSTEM", lot_sys["pattern_description"])

        # Verify that assess_component_risk fires RULE-00 [INSTRUMENT ANOMALY] when test_system_status="TEST_SYSTEM_ANOMALY"
        sample_feat = pd.DataFrame([{
            "component_id": "C-SYS-01",
            "parameter_name": "leakage_current_uA",
            "val_24h": 7.5,
            "val_96h": 7.5,
            "drift_rate_24": 0.05,
            "drift_acceleration": 0.0,
            "lot_zscore_24": 1.2
        }])
        risk_result = self.risk_engine.assess_component_risk(
            comp_id="C-SYS-01",
            lot_id="LOT-SYS",
            features=sample_feat,
            anomaly_scores={"normalized_score": 0.65},
            behaviour_fingerprint={"overall_state": "DRIFTING"},
            predictions=[],
            test_system_status="TEST_SYSTEM_ANOMALY"
        )
        self.assertEqual(risk_result["risk_level"], "REVIEW")
        self.assertTrue(any("INSTRUMENT ANOMALY" in r for r in risk_result["rules_fired"]))

    # -------------------------------------------------------------
    # 3. Lot-Wide Systemic Degradation (Phase 7)
    # -------------------------------------------------------------
    def test_lot_wide_systemic_degradation(self):
        # 4 out of 10 units accelerating (40% >= 15% threshold)
        comps = []
        for i in range(10):
            is_accel = i < 4
            comps.append({
                "component_id": f"C-WEAROUT-{i:02d}",
                "lot_id": "LOT-WEAROUT",
                "risk_level": "HIGH RISK" if is_accel else "PASS",
                "evidence_breakdown": {
                    "acceleration_severity": "High" if is_accel else "None",
                    "drift_severity": "High" if is_accel else "None"
                }
            })
        
        lot_health = self.risk_engine.evaluate_lot_health(comps, pd.DataFrame())
        lot_w = lot_health["LOT-WEAROUT"]
        self.assertEqual(lot_w["lot_pattern_type"], "LOT_SYSTEMIC_SHIFT")
        self.assertIn("LOT SYSTEMIC SHIFT", lot_w["pattern_description"])
        self.assertEqual(lot_w["lot_health_trend"], "COMPROMISED")

    # -------------------------------------------------------------
    # 4. Temporal Acceleration Persistence Requirement (Phase 10)
    # -------------------------------------------------------------
    def test_temporal_acceleration_persistence(self):
        fe = FeatureEngineeringEngine()
        
        # Test 1: Stable series with negligible thermal noise
        df_noise = pd.DataFrame([
            {"component_id": "C-NOISE", "lot_id": "L1", "test_stage": "0h", "timestamp": 0.0, "parameter_name": "leakage_current_uA", "parameter_value": 10.0, "is_valid": 1, "raw_value": 10.0, "processed_value": 10.0},
            {"component_id": "C-NOISE", "lot_id": "L1", "test_stage": "24h", "timestamp": 24.0, "parameter_name": "leakage_current_uA", "parameter_value": 10.05, "is_valid": 1, "raw_value": 10.05, "processed_value": 10.05},
            {"component_id": "C-NOISE", "lot_id": "L1", "test_stage": "96h", "timestamp": 96.0, "parameter_name": "leakage_current_uA", "parameter_value": 10.08, "is_valid": 1, "raw_value": 10.08, "processed_value": 10.08},
        ])
        feats_noise, _ = fe.extract_features(df_noise)
        behaviour_noise = self.behaviour_engine.analyze_component_behaviour(feats_noise, {"normalized_score": 0.1})
        self.assertNotEqual(behaviour_noise["overall_state"], "ACCELERATING")

        # Test 2: Persistent accelerating wearout trajectory
        df_accel = pd.DataFrame([
            {"component_id": "C-ACCEL", "lot_id": "L1", "test_stage": "0h", "timestamp": 0.0, "parameter_name": "leakage_current_uA", "parameter_value": 10.0, "is_valid": 1, "raw_value": 10.0, "processed_value": 10.0},
            {"component_id": "C-ACCEL", "lot_id": "L1", "test_stage": "24h", "timestamp": 24.0, "parameter_name": "leakage_current_uA", "parameter_value": 10.5, "is_valid": 1, "raw_value": 10.5, "processed_value": 10.5},
            {"component_id": "C-ACCEL", "lot_id": "L1", "test_stage": "96h", "timestamp": 96.0, "parameter_name": "leakage_current_uA", "parameter_value": 14.0, "is_valid": 1, "raw_value": 14.0, "processed_value": 14.0},
        ])
        feats_accel, _ = fe.extract_features(df_accel)
        behaviour_accel = self.behaviour_engine.analyze_component_behaviour(feats_accel, {"normalized_score": 0.7})
        self.assertEqual(behaviour_accel["overall_state"], "ACCELERATING")

    # -------------------------------------------------------------
    # 5. Early 168h Forecast & Insufficient Evidence (Phase 11-15)
    # -------------------------------------------------------------
    def test_insufficient_evidence_forecast(self):
        df_incomplete = pd.DataFrame([{
            "component_id": "C-INSUFFICIENT",
            "lot_id": "L1",
            "parameter_name": "leakage_current_uA",
            "val_0h": 4.5,
            "val_24h": np.nan,
            "val_96h": np.nan,
            "val_168h": np.nan,
            "delta_0_24": np.nan,
            "drift_rate_24": np.nan,
            "pct_change_24": np.nan,
            "lot_zscore_24": np.nan
        }])
        preds, _ = self.prediction_engine.fit_and_predict(df_incomplete, stage_available="24h")
        self.assertEqual(len(preds), 1)
        p0 = preds[0]
        self.assertEqual(p0["prediction_confidence"], "INSUFFICIENT_EVIDENCE")
        self.assertIn(p0["estimated_time_to_breach"], ["TIME_TO_BREACH_UNAVAILABLE", "TIME-TO-BREACH UNAVAILABLE"])

    def test_trajectory_and_breach_probability_forecast(self):
        df_forecast = pd.DataFrame([{
            "component_id": "C-VALID",
            "lot_id": "L1",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 8.0,
            "val_96h": 15.5,
            "val_168h": 22.0,
            "delta_0_24": 3.0,
            "delta_24_96": 7.5,
            "drift_rate_24": 0.125,
            "drift_rate_96": 0.104,
            "drift_acceleration": 0.0004,
            "pct_change_24": 60.0,
            "lot_zscore_24": 2.5
        }])
        preds, _ = self.prediction_engine.fit_and_predict(df_forecast, stage_available="96h")
        p0 = preds[0]
        self.assertIn(p0["prediction_confidence"], ["HIGH EVIDENCE", "MODERATE EVIDENCE"])
        self.assertGreater(p0["predicted_168h_value"], 16.0)
        self.assertIsNotNone(p0["probability_of_limit_breach"])
        self.assertGreater(len(p0["estimated_trajectory"]), 2)

    # -------------------------------------------------------------
    # 6. Mahalanobis Covariance Safeguards (Phase 8)
    # -------------------------------------------------------------
    def test_mahalanobis_covariance_safeguards(self):
        detector = MahalanobisDetector()
        
        # Test 1: Tiny sample size (< min_samples)
        small_df = pd.DataFrame({
            "component_id": ["C1", "C2"],
            "lot_id": ["LOT_TINY", "LOT_TINY"],
            "val_24h": [4.0, 4.1],
            "val_96h": [4.2, 4.3],
            "drift_rate_24": [0.01, 0.01]
        })
        results = detector.score(small_df, feature_cols=["val_24h", "val_96h", "drift_rate_24"])
        self.assertEqual(results[0]["detector_status"], "INSUFFICIENT_STATISTICAL_SUPPORT")

        # Test 2: Collinear/identical measurements
        collinear_df = pd.DataFrame({
            "component_id": [f"C{i}" for i in range(15)],
            "lot_id": ["LOT_COLL"] * 15,
            "val_24h": [5.0] * 15,
            "val_96h": [5.0] * 15,
            "drift_rate_24": [0.0] * 15
        })
        results_col = detector.score(collinear_df, feature_cols=["val_24h", "val_96h", "drift_rate_24"])
        self.assertTrue(all(np.isfinite([r["normalized_score"] for r in results_col])))

    # -------------------------------------------------------------
    # 7. LOF Windowed / Batch Support (Phase 9)
    # -------------------------------------------------------------
    def test_lof_windowed_sample_support(self):
        detector = LOFDetector()
        small_df = pd.DataFrame({
            "component_id": ["C1", "C2", "C3"],
            "lot_id": ["LOT_S"] * 3,
            "val_24h": [4.0, 4.1, 4.2],
            "drift_rate_24": [0.01, 0.01, 0.02]
        })
        results = detector.score(small_df, feature_cols=["val_24h", "drift_rate_24"])
        self.assertEqual(results[0]["detector_status"], "INSUFFICIENT_STATISTICAL_SUPPORT")

    # -------------------------------------------------------------
    # 8. Anti-Leakage Lot-Based Split & Lead Time Evaluation (Phase 17-20)
    # -------------------------------------------------------------
    def test_anti_leakage_lot_based_split(self):
        df, meta = generate_burnin_dataset(num_lots=5, components_per_lot=10, seed=42)
        gt = meta["ground_truth"]
        clean_df, _ = DataQualityEngine().validate_and_clean(df)
        features, _ = FeatureEngineeringEngine().extract_features(clean_df)
        preds, _ = self.prediction_engine.fit_and_predict(features)
        
        # Prepare components table
        comps_table = []
        for cid in df["component_id"].unique():
            lid = df[df["component_id"] == cid]["lot_id"].iloc[0]
            comps_table.append({
                "component_id": cid,
                "lot_id": lid,
                "risk_level": "HIGH RISK" if gt.get(cid, {}).get("is_defect") else "PASS",
                "current_state": "DRIFTING" if gt.get(cid, {}).get("is_defect") else "NORMAL",
                "drift_rate": 0.05 if gt.get(cid, {}).get("is_defect") else 0.005,
                "first_flag_hour": 24.0 if gt.get(cid, {}).get("is_defect") else 168.0
            })

        metrics = ModelEvaluator.evaluate_performance(gt, preds, comps_table, features)
        
        # Verify split isolation
        train_lots = set(metrics["lot_split"]["training_lots"])
        test_lots = set(metrics["lot_split"]["test_lots"])
        self.assertEqual(len(train_lots.intersection(test_lots)), 0, "Data leakage detected: train and test lots overlap!")
        
        # Verify 3 baselines are evaluated
        baselines = metrics["baselines_comparison"]
        self.assertEqual(len(baselines), 3)
        self.assertEqual(baselines[0]["baseline_id"], 1)
        self.assertEqual(baselines[1]["baseline_id"], 2)
        self.assertEqual(baselines[2]["baseline_id"], 3)
        
        # Verify detection lead time is quantified
        self.assertIn("average_lead_time_hours", metrics["detection_lead_time"])
        self.assertGreater(metrics["detection_lead_time"]["average_lead_time_hours"], 0)

    # -------------------------------------------------------------
    # 9. Model and Data Drift Monitoring Framework (Phase 25)
    # -------------------------------------------------------------
    def test_data_drift_monitoring_framework(self):
        from backend.main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        res = client.get("/api/drift/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("drift_status", data)
        self.assertIn("drift_detected", data)
        self.assertIn("metrics", data)
        self.assertIn("anomaly_rate_spread_pct", data["metrics"])
        self.assertIn("mean_prediction_residual", data["metrics"])
        self.assertIn("governance_note", data)

    # -------------------------------------------------------------
    # 10. Demo Scenarios Contract (Phase 33)
    # -------------------------------------------------------------
    def test_sih_demo_scenarios_contract(self):
        from backend.main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        res = client.get("/api/demo/scenarios")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        scenarios = data["scenarios"]
        self.assertEqual(len(scenarios), 7)
        for s in scenarios:
            for field in ["id", "title", "component_id", "lot_id", "observed_behaviour", "detected_evidence", "prediction", "uncertainty", "risk", "recommended_action"]:
                self.assertIn(field, s)

    # -------------------------------------------------------------
    # 11. API Backward Compatibility (Phase 26-27)
    # -------------------------------------------------------------
    def test_api_backward_compatibility(self):
        from backend.main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)

        # 1. Dashboard Overview
        r_dash = client.get("/api/dashboard/overview")
        self.assertEqual(r_dash.status_code, 200)
        dash_data = r_dash.json()
        for field in ["total_components", "total_lots", "risk_distribution", "state_distribution"]:
            self.assertIn(field, dash_data)

        # 2. Components list
        r_comps = client.get("/api/components?limit=5")
        self.assertEqual(r_comps.status_code, 200)
        comps = r_comps.json()["components"]
        self.assertGreater(len(comps), 0)
        c0 = comps[0]
        for field in ["component_id", "lot_id", "risk_level"]:
            self.assertIn(field, c0)

        # 3. Models performance
        r_perf = client.get("/api/models/performance")
        self.assertEqual(r_perf.status_code, 200)
        perf_data = r_perf.json()
        self.assertIn("baselines_comparison", perf_data)
        self.assertIn("detection_lead_time_hours", perf_data)


if __name__ == "__main__":
    unittest.main()
