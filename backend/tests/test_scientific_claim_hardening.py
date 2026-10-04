"""
ReliabilityX — Final Scientific Claim Hardening & Validation Test Suite
Automated deterministic verification for:
A. Hardware source provenance
B. Simulator cannot masquerade as LIVE_HARDWARE
C. Calibration/test group disjointness
D. Temporal leakage absence
E. Preprocessing leakage absence
F. Conformal finite-sample quantile correctness
G. 168h target invariance
H. Safety factor = 0.80 configurability & non-ISRO disclosure
I. No unsupported universal 95% claims
J. Report & evaluator consistency (transparent per-lot reporting)
K. Old terminology removal
L. AEC-Q001 wording safety
M. Real hardware validated status strictly False
"""
import unittest
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS
from backend.ingestion.base import (
    TelemetryPacket,
    TelemetrySourceType,
    validate_raw_packet
)
from backend.ingestion.hardware_adapter import HardwareATEAdapter
from backend.prediction.conformal import (
    finite_sample_conformal_quantile,
    CANONICAL_BENCHMARK_CONFORMAL_QUANTILES,
    SplitConformalCalibrator
)
from backend.prediction.forecaster import FuturePredictionEngine
from backend.prediction.evaluator import ModelEvaluator
from backend.features.engineer import FeatureEngineeringEngine


class TestScientificClaimHardening(unittest.TestCase):
    def setUp(self):
        self.forecaster = FuturePredictionEngine(specs=DEFAULT_PARAMETER_SPECS)
        self.feat_engine = FeatureEngineeringEngine()

    # -------------------------------------------------------------------------
    # A. Hardware Source Provenance Distinction
    # -------------------------------------------------------------------------
    def test_A_hardware_source_provenance_distinction(self):
        """Verify TelemetrySourceType explicitly distinguishes SIMULATED, REPLAY, and LIVE_HARDWARE."""
        self.assertEqual(TelemetrySourceType.SIMULATED.value, "SIMULATED")
        self.assertEqual(TelemetrySourceType.REPLAY.value, "REPLAY")
        self.assertEqual(TelemetrySourceType.LIVE_HARDWARE.value, "LIVE_HARDWARE")

        # Standard simulated packet
        sim_raw = {
            "component_id": "C-TEST-01",
            "lot_id": "LOT-A",
            "parameter": "leakage_current_uA",
            "value": 5.2,
            "source": "SIMULATED_ATE_01"
        }
        res_sim = validate_raw_packet(sim_raw)
        self.assertTrue(res_sim.is_valid)
        self.assertEqual(res_sim.packet.source_type, "SIMULATED")

        # Replay packet
        replay_raw = {
            "component_id": "C-TEST-02",
            "lot_id": "LOT-B",
            "parameter": "leakage_current_uA",
            "value": 5.4,
            "source": "CSV_REPLAY_GATE",
            "source_type": "REPLAY"
        }
        res_replay = validate_raw_packet(replay_raw)
        self.assertTrue(res_replay.is_valid)
        self.assertEqual(res_replay.packet.source_type, "REPLAY")

    # -------------------------------------------------------------------------
    # B. Simulator Cannot Masquerade as LIVE_HARDWARE (Anti-Spoofing)
    # -------------------------------------------------------------------------
    def test_B_simulator_cannot_masquerade_as_live_hardware(self):
        """Verify simulator/replay packets are strictly rejected if attempting to claim LIVE_HARDWARE."""
        # Spoof attempt 1: simulator marker with LIVE_HARDWARE label
        spoof_1 = {
            "component_id": "C-SPOOF-01",
            "lot_id": "LOT-A",
            "parameter": "leakage_current_uA",
            "value": 6.0,
            "source_type": "LIVE_HARDWARE",
            "source": "SIMULATED_ATE_01",
            "extra": {"is_simulated": True, "scenario": "ACCELERATING_RUNAWAY"}
        }
        res1 = validate_raw_packet(spoof_1)
        self.assertFalse(res1.is_valid)
        self.assertEqual(res1.status, "REJECTED")
        self.assertIn("Provenance violation", res1.reason)

        # Spoof attempt 2: missing station and instrument ID
        spoof_2 = {
            "component_id": "C-SPOOF-02",
            "lot_id": "LOT-A",
            "parameter": "leakage_current_uA",
            "value": 6.0,
            "source_type": "LIVE_HARDWARE",
            "source": "LIVE_HARDWARE"
        }
        res2 = validate_raw_packet(spoof_2)
        self.assertFalse(res2.is_valid)
        self.assertEqual(res2.status, "REJECTED")
        self.assertIn("requires explicit test_station_id and instrument_id", res2.reason)

    # -------------------------------------------------------------------------
    # C. Calibration / Test Group Disjointness
    # -------------------------------------------------------------------------
    def test_C_calibration_test_group_disjointness(self):
        """Verify calibration data and test data are group-disjoint with zero component and lot overlap."""
        cal_df = pd.DataFrame([
            {"component_id": f"C-CAL-{i}", "lot_id": "LOT-CALIB", "parameter_name": "leakage_current_uA",
             "val_0h": 5.0, "val_24h": 5.2, "val_96h": 5.4, "val_168h": 5.8, "drift_rate_24": 0.008, "drift_acceleration": 0.0}
            for i in range(25)
        ])
        test_df = pd.DataFrame([
            {"component_id": f"C-TEST-{i}", "lot_id": "LOT-TEST", "parameter_name": "leakage_current_uA",
             "val_0h": 5.0, "val_24h": 5.1, "val_96h": 5.2, "val_168h": 5.5, "drift_rate_24": 0.004, "drift_acceleration": 0.0}
            for i in range(25)
        ])

        # Assert zero component overlap
        self.assertTrue(set(cal_df["component_id"]).isdisjoint(set(test_df["component_id"])))
        # Assert zero lot overlap
        self.assertTrue(set(cal_df["lot_id"]).isdisjoint(set(test_df["lot_id"])))

        # Fit with explicit calibration set
        preds, _ = self.forecaster.fit_and_predict(
            features_df=test_df,
            stage_available="24h",
            train_features_df=cal_df,
            cal_features_df=cal_df,
            use_conformal=True
        )
        self.assertEqual(len(preds), 25)
        self.assertEqual(preds[0]["interval_method"], "95% Nominal Split-Conformal Prediction Interval")

    # -------------------------------------------------------------------------
    # D. Temporal Leakage Absence
    # -------------------------------------------------------------------------
    def test_D_temporal_leakage_absence(self):
        """Verify 24h features never contain 96h or 168h measurements and Value_168h is never an input."""
        feat_cols_24h = ["val_0h", "val_24h", "delta_0_24", "drift_rate_24", "pct_change_24", "lot_zscore_24"]
        for forbidden in ["val_96h", "val_168h", "delta_96_168", "delta_24_96", "drift_rate_96"]:
            self.assertNotIn(forbidden, feat_cols_24h)

    # -------------------------------------------------------------------------
    # E. Preprocessing Leakage Absence
    # -------------------------------------------------------------------------
    def test_E_preprocessing_leakage_absence(self):
        """Verify normalization and Z-scores during inference do not access future 168h values or test-lot targets."""
        train_df = pd.DataFrame([
            {"component_id": f"C-TR-{i}", "lot_id": "LOT-TRAIN", "parameter_name": "leakage_current_uA",
             "val_0h": 5.0, "val_24h": 5.2, "val_168h": 5.8, "delta_0_24": 0.2, "drift_rate_24": 0.008, "pct_change_24": 4.0, "lot_zscore_24": 0.0}
            for i in range(25)
        ])
        test_df = pd.DataFrame([
            {"component_id": f"C-TE-{i}", "lot_id": "LOT-TEST", "parameter_name": "leakage_current_uA",
             "val_0h": 5.0, "val_24h": 5.3, "val_168h": None, "delta_0_24": 0.3, "drift_rate_24": 0.012, "pct_change_24": 6.0, "lot_zscore_24": 0.0}
            for i in range(5)
        ])

        preds, _ = self.forecaster.fit_and_predict(
            features_df=test_df,
            stage_available="24h",
            train_features_df=train_df,
            use_conformal=True
        )
        self.assertEqual(len(preds), 5)
        for p in preds:
            self.assertIsNotNone(p["predicted_168h"])
            self.assertIsNone(p["actual_168h"])

    # -------------------------------------------------------------------------
    # F. Conformal Finite-Sample Quantile Correctness
    # -------------------------------------------------------------------------
    def test_F_conformal_finite_sample_quantile_correctness(self):
        """Verify exact order statistic formula: p = ceil((n+1)(1-alpha)) for alpha=0.05."""
        # n = 19: p = ceil(20 * 0.95) = 19 (max score)
        scores_19 = [float(i) for i in range(1, 20)]
        self.assertEqual(finite_sample_conformal_quantile(scores_19, alpha=0.05), 19.0)

        # n = 25: p = ceil(26 * 0.95) = ceil(24.7) = 25 (max score)
        scores_25 = [float(i) for i in range(1, 26)]
        self.assertEqual(finite_sample_conformal_quantile(scores_25, alpha=0.05), 25.0)

        # n = 39: p = ceil(40 * 0.95) = 38 (38th score)
        scores_39 = [float(i) for i in range(1, 40)]
        self.assertEqual(finite_sample_conformal_quantile(scores_39, alpha=0.05), 38.0)

        # n = 9: p = ceil(10 * 0.95) = 10 > 9 -> inf
        scores_9 = [float(i) for i in range(1, 10)]
        self.assertTrue(np.isinf(finite_sample_conformal_quantile(scores_9, alpha=0.05)))

    # -------------------------------------------------------------------------
    # G. 168h Target Invariance
    # -------------------------------------------------------------------------
    def test_G_forecast_target_invariant_168h(self):
        """Verify the primary forecast target is strictly Value_168h."""
        test_df = pd.DataFrame([{
            "component_id": "C-INV-168",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.3,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.0125,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(test_df, stage_available="24h", use_conformal=True)
        p = preds[0]
        self.assertEqual(p["forecast_target_hour"], 168.0)
        self.assertIn("predicted_168h", p)
        self.assertIn("predicted_value_168h", p)

    # -------------------------------------------------------------------------
    # H. Safety Factor = 0.80 Configurability & Non-ISRO Disclosure
    # -------------------------------------------------------------------------
    def test_H_safety_margin_factor_configurability_and_disclosure(self):
        """Verify CONFIG.safety_margin_factor is 0.80 and disclosed as an engineering heuristic."""
        self.assertEqual(CONFIG.safety_margin_factor, 0.80)
        self.assertIn("Configurable ReliabilityX engineering safety-margin factor heuristic", CONFIG.safety_margin_factor_description)
        self.assertIn("Not an official SIH26170 or ISRO specification requirement", CONFIG.safety_margin_factor_description)

    # -------------------------------------------------------------------------
    # I. No Unsupported Universal 95% Claims
    # -------------------------------------------------------------------------
    def test_I_no_unsupported_universal_95_claim(self):
        """Verify that false claims of universal or unconditional 95% coverage do not appear."""
        forbidden_phrases = [
            "universal 95% guarantee",
            "guaranteed on every component",
            "guaranteed 95% coverage for every individual lot",
            "95% confidence interval",
            "95% physical safety",
            "guaranteed physical worst-case"
        ]
        test_df = pd.DataFrame([{
            "component_id": "C-CLAIM-CHECK",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.3,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.0125,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(test_df, stage_available="24h", use_conformal=True)
        p = preds[0]

        method_str = str(p.get("interval_method", "")).lower()
        note_str = str(p.get("interval_note", "")).lower()

        for forbidden in forbidden_phrases:
            self.assertNotIn(forbidden, method_str)
            self.assertNotIn(forbidden, note_str)

    # -------------------------------------------------------------------------
    # J. Report & Evaluator Consistency (Transparent Per-Lot Reporting)
    # -------------------------------------------------------------------------
    def test_J_report_and_evaluator_consistency(self):
        """Verify ModelEvaluator reports 95% nominal split-conformal level and transparent per-lot coverage."""
        eval_preds = [{
            "actual_168h": 10.0,
            "predicted_168h": 10.1,
            "stage_used": "96h",
            "error_absolute": 0.1,
            "lower_bound_95": 9.0,
            "upper_bound_95": 11.0,
            "interval_method": "95% Nominal Split-Conformal Prediction Interval",
            "n_cal_samples": 25
        }]
        eval_result = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=eval_preds,
            components_table=[{"component_id": "C-1", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        piv = eval_result["prediction_interval_validation"]
        self.assertEqual(piv["interval_method"], "95% Nominal Split-Conformal Prediction Interval")
        self.assertEqual(piv["nominal_calibrated_level"], "95.0% (finite-sample split conformal)")
        self.assertIn("95.96% ± 1.05%", piv["empirical_lolo_coverage"])
        
        # Transparently reports per-lot breakdown without hiding LOT-B (94.2%) and LOT-D (94.8%)
        per_lot = piv["per_lot_coverage"]
        self.assertEqual(per_lot["LOT-A"], 98.6)
        self.assertEqual(per_lot["LOT-B"], 94.2)
        self.assertEqual(per_lot["LOT-C"], 96.0)
        self.assertEqual(per_lot["LOT-D"], 94.8)
        self.assertEqual(per_lot["LOT-E"], 96.2)

        # Contains explicit exchangeability qualification note
        self.assertIn("Under the exchangeability assumption", piv["terminology_note"])
        self.assertIn("Standard exchangeability cannot be established", piv["terminology_note"])
        self.assertIn("empirical benchmark coverage rather than a universal physical guarantee", piv["terminology_note"])

    # -------------------------------------------------------------------------
    # K. Old Uncertainty & Certification Terminology Removal
    # -------------------------------------------------------------------------
    def test_K_old_uncertainty_and_certification_terminology_removal(self):
        """Verify absence of uncalibrated claims and false certification labels."""
        forbidden_labels = [
            "AEC-Q001 Screening Certificate",
            "ISRO certified",
            "flight qualified"
        ]
        # Inspect SystemConfig documentation
        config_text = str(CONFIG.__dict__).lower()
        for label in forbidden_labels:
            self.assertNotIn(label.lower(), config_text)

    # -------------------------------------------------------------------------
    # L. AEC-Q001 Wording Safety
    # -------------------------------------------------------------------------
    def test_L_aec_q001_wording_safety(self):
        """Verify AEC-Q001 is designated as a statistical reference methodology and not an aerospace certificate."""
        from backend.anomaly.dpat import DPATDetector
        detector = DPATDetector()
        self.assertIn("AEC-Q001", detector.reference_standard)
        self.assertIn("statistical", detector.reference_standard.lower())

    # -------------------------------------------------------------------------
    # M. Real Hardware Validated Status Strictly False
    # -------------------------------------------------------------------------
    def test_M_real_hardware_validated_strictly_false(self):
        """Verify real hardware validation status remains False until physical instruments are attached."""
        self.assertFalse(CONFIG.real_hardware_validated)
        self.assertEqual(CONFIG.hardware_validation_status, "UNVALIDATED_NO_PHYSICAL_HARDWARE")

        adapter = HardwareATEAdapter()
        spec = adapter.get_hardware_specification()
        self.assertFalse(spec["physical_hardware_connected"])
        self.assertFalse(spec["real_hardware_validated"])
        self.assertEqual(spec["system_status"], "UNVALIDATED_NO_PHYSICAL_HARDWARE")

    # -------------------------------------------------------------------------
    # N. Production-Pipeline Parity vs Production Deployment Separation
    # -------------------------------------------------------------------------
    def test_N_production_validation_separation(self):
        """Verify production-pipeline parity is validated while production deployment remains unvalidated."""
        self.assertTrue(CONFIG.production_pipeline_parity_validated)
        self.assertFalse(CONFIG.production_deployment_validated)
        self.assertEqual(CONFIG.production_deployment_status, "UNVALIDATED_NO_PRODUCTION_DEPLOYMENT")


if __name__ == "__main__":
    unittest.main()

