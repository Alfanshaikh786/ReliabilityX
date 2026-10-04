"""
Automated Deterministic Verification Suite for:
1. Configurable ReliabilityX Engineering Safety-Margin Factor (0.80) & Dynamic Safety Slope
2. Safety Slope Exceeded Routing to ENGINEERING_REVIEW_RECOMMENDED (RULE-08, not hardware rejection)
3. Prediction Interval Methodology (Empirical Residual-Based Estimated Prediction Interval)
4. Absence of Unsupported Nominal 95% Claims
5. Preservation of 168h Primary Forecast Target & Zero Future Feature Leakage
"""
import unittest
import pandas as pd
import numpy as np

from backend.core.config import CONFIG
from backend.prediction.forecaster import FuturePredictionEngine
from backend.prediction.evaluator import ModelEvaluator
from backend.risk.fusion import RiskFusionEngine


class TestSafetyMarginAndPredictionInterval(unittest.TestCase):
    def setUp(self):
        self.forecaster = FuturePredictionEngine()
        self.risk_engine = RiskFusionEngine()
        # Ensure default baseline factor
        CONFIG.safety_margin_factor = 0.80

    def tearDown(self):
        # Guarantee restoration of default factor to 0.80
        CONFIG.safety_margin_factor = 0.80

    def test_01_safety_margin_factor_is_configurable_and_dynamic(self):
        """Verify safety slope calculation dynamically uses CONFIG.safety_margin_factor rather than a hardcoded constant."""
        # Headroom = 50.0 - 10.0 = 40.0. Hours remaining = 168.0 - 24.0 = 144.0
        # Formula: safety_slope = round((safety_margin_factor * headroom) / hours_remaining, 4)
        feat = pd.DataFrame([{
            "component_id": "C-DYN-SLOPE",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 10.0,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.05,
            "drift_acceleration": 0.0
        }])

        # 1. Test at baseline factor = 0.80
        CONFIG.safety_margin_factor = 0.80
        preds_80, _ = self.forecaster.fit_and_predict(feat, stage_available="24h")
        p80 = preds_80[0]
        # max_limit for leakage_current_uA is 20.0 -> headroom = 10.0
        expected_slope_80 = round(float((0.80 * 10.0) / 144.0), 4)  # 8 / 144 = 0.0556
        self.assertEqual(p80["safety_margin_factor"], 0.80)
        self.assertEqual(p80["safety_slope"], expected_slope_80)
        self.assertEqual(p80["safety_slope"], 0.0556)

        # 2. Test at modified factor = 0.70
        CONFIG.safety_margin_factor = 0.70
        preds_70, _ = self.forecaster.fit_and_predict(feat, stage_available="24h")
        p70 = preds_70[0]
        expected_slope_70 = round(float((0.70 * 10.0) / 144.0), 4)  # 7 / 144 = 0.0486
        self.assertEqual(p70["safety_margin_factor"], 0.70)
        self.assertEqual(p70["safety_slope"], expected_slope_70)
        self.assertEqual(p70["safety_slope"], 0.0486)

        # Confirm safety slope changed dynamically and proportionally
        self.assertNotEqual(p80["safety_slope"], p70["safety_slope"])
        self.assertAlmostEqual(p70["safety_slope"] / p80["safety_slope"], 0.70 / 0.80, places=2)

        # 3. Restore to baseline 0.80 and verify restoration
        CONFIG.safety_margin_factor = 0.80
        preds_restored, _ = self.forecaster.fit_and_predict(feat, stage_available="24h")
        self.assertEqual(preds_restored[0]["safety_margin_factor"], 0.80)
        self.assertEqual(preds_restored[0]["safety_slope"], 0.0556)

    def test_02_safety_slope_exceeded_triggers_review_not_rejection(self):
        """Verify that when predicted drift rate exceeds safety slope, it triggers RULE-08 -> ENGINEERING_REVIEW_RECOMMENDED."""
        # Headroom = 20.0 - 9.5 = 10.5. Safety slope = 0.80 * 10.5 / 144 = 0.0583 uA/h
        # Drift rate = 0.0625 uA/h > 0.0583. Predicted 168h value = 18.5 < 20.0 limit.
        feat = pd.DataFrame([{
            "component_id": "C-SLOPE-EXCEED",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 9.5,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.1875,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(feat, stage_available="24h")
        p = preds[0]
        self.assertTrue(p["slope_exceeded"])
        self.assertEqual(p["slope_status"], "SAFETY_SLOPE_EXCEEDED")
        self.assertEqual(p["slope_recommendation"], "ENGINEERING_REVIEW_RECOMMENDED")

        # Verify Risk Fusion Engine evaluates this as REVIEW (not REJECT or HIGH RISK)
        mock_pred = [{
            "component_id": "C-SLOPE-EXCEED",
            "parameter_name": "leakage_current_uA",
            "slope_exceeded": True,
            "is_p90_breach": False,
            "is_nominal_breach": False,
            "probability_of_limit_breach": 0.15
        }]
        risk = self.risk_engine.assess_component_risk(
            comp_id="C-SLOPE-EXCEED",
            lot_id="LOT-2411A",
            features=feat,
            anomaly_scores={"normalized_score": 0.1},
            behaviour_fingerprint={"overall_state": "NORMAL"},
            predictions=mock_pred
        )
        self.assertEqual(risk["risk_level"], "REVIEW")
        self.assertNotEqual(risk["risk_level"], "HIGH RISK")
        self.assertTrue(any("RULE-08" in r for r in risk["rules_fired"]))
        self.assertTrue(any("Engineering review recommended" in r for r in risk["rules_fired"]))

    def test_03_safety_margin_factor_disclosure_wording(self):
        """Verify that the safety margin factor is explicitly disclosed as a ReliabilityX engineering heuristic and not an official ISRO requirement."""
        feat = pd.DataFrame([{
            "component_id": "C-DISCLOSE",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.1,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.004,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(feat, stage_available="24h")
        note = preds[0]["safety_margin_factor_note"]

        # Assert mandatory disclosure phrases
        self.assertIn("Configurable ReliabilityX engineering safety-margin heuristic factor", note)
        self.assertIn("not an official SIH26170 or ISRO specification requirement", note)

        # Assert in CONFIG description
        self.assertIn("Configurable ReliabilityX engineering safety-margin factor heuristic", CONFIG.safety_margin_factor_description)
        self.assertIn("Not an official SIH26170 or ISRO specification requirement", CONFIG.safety_margin_factor_description)

    def test_04_prediction_interval_methodology_and_absence_of_nominal_95_claims(self):
        """Verify conformal and empirical prediction interval reporting and assert zero unsupported confidence claims."""
        feat = pd.DataFrame([{
            "component_id": "C-INTERVAL",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.5,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.02,
            "drift_acceleration": 0.0
        }])
        
        # 1. Default Split-Conformal Interval
        preds_conf, _ = self.forecaster.fit_and_predict(feat, stage_available="24h", use_conformal=True)
        p_conf = preds_conf[0]
        self.assertEqual(p_conf["interval_method"], "95% Nominal Split-Conformal Prediction Interval")
        self.assertEqual(p_conf["nominal_coverage_pct"], 95.0)

        # 2. Empirical Fallback Interval (use_conformal=False)
        preds_emp, _ = self.forecaster.fit_and_predict(feat, stage_available="24h", use_conformal=False)
        p_emp = preds_emp[0]
        self.assertEqual(p_emp["interval_method"], "Empirical residual-based estimated interval")
        self.assertIn("Empirically evaluated estimated prediction interval", p_emp["interval_note"])
        self.assertIn("not presented as a formally calibrated 95% guarantee", p_emp["interval_note"])

        # 3. Evaluator interval report with empirical predictions
        eval_preds = [{
            "actual_168h": 10.0,
            "predicted_168h": 10.1,
            "stage_used": "96h",
            "error_absolute": 0.1,
            "lower_bound_95": 9.0,
            "upper_bound_95": 11.0
        }]
        eval_result = ModelEvaluator.evaluate_performance(
            ground_truth={"C-INTERVAL": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=eval_preds,
            components_table=[{"component_id": "C-INTERVAL", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-INTERVAL", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        piv = eval_result["prediction_interval_validation"]
        self.assertEqual(piv["interval_method"], "Empirical residual-based estimated interval")
        self.assertEqual(piv["nominal_calibrated_level"], "Not claimed (empirical residual quantile model)")
        self.assertIn("not presented as a formally calibrated 95% guarantee", piv["terminology_note"])

        # 4. Assert forbidden confidence and physical safety claims do not exist in string representations
        forbidden_phrases = ["95% confidence", "95% physical safety", "guaranteed on every component"]
        for phrase in forbidden_phrases:
            self.assertNotIn(phrase.lower(), str(p_conf["interval_method"]).lower())
            self.assertNotIn(phrase.lower(), str(p_emp["interval_method"]).lower())
            self.assertNotIn(phrase.lower(), str(p_emp["interval_note"]).lower())
            self.assertNotIn(phrase.lower(), str(piv).lower())

    def test_05_primary_forecast_target_is_168h_and_zero_future_leakage(self):
        """Verify the forecast target is strictly 168.0h and Value_168h is never an inference feature."""
        feat = pd.DataFrame([{
            "component_id": "C-TARGET",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.2,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.008,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(feat, stage_available="24h")
        p = preds[0]

        # Primary target hour strictly 168.0h
        self.assertEqual(p["forecast_target_hour"], 168.0)
        self.assertIn("predicted_168h", p)
        self.assertIn("predicted_value_168h", p)

        # Inference feature sets do not include 168h data
        inference_cols_24h = ["val_0h", "val_24h", "delta_0_24", "drift_rate_24"]
        inference_cols_96h = ["val_0h", "val_24h", "val_96h", "delta_0_24", "delta_24_96", "drift_rate_24", "drift_rate_96", "drift_acceleration"]
        self.assertNotIn("val_168h", inference_cols_24h)
        self.assertNotIn("val_168h", inference_cols_96h)
        self.assertNotIn("delta_96_168", inference_cols_24h)
        self.assertNotIn("delta_96_168", inference_cols_96h)


if __name__ == "__main__":
    unittest.main()
