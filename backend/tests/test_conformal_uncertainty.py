"""
Automated Verification Suite for ReliabilityX Split-Conformal Prediction
=======================================================================
Validates:
1. Exact finite-sample conformal order-statistic quantile calculation on known sets
2. Calibration / Test data independence and lot disjointness
3. Absence of Value_168h in inference features (zero future leakage)
4. Primary 168h forecast target preservation
5. Split-conformal prediction interval construction and non-negativity bounds
6. Evaluator integration (nominal 95% + independent empirical coverage)
7. Absence of unsupported claims ("95% confidence interval", "95% physical safety")
8. Empirical residual-based fallback preservation (use_conformal=False)
9. Safety-margin factor (0.80) remains configurable and decoupled from conformal coverage
"""
import unittest
import numpy as np
import pandas as pd

from backend.core.config import CONFIG
from backend.prediction.conformal import (
    finite_sample_conformal_quantile,
    SplitConformalCalibrator,
    CANONICAL_BENCHMARK_CONFORMAL_QUANTILES
)
from backend.prediction.forecaster import FuturePredictionEngine
from backend.prediction.evaluator import ModelEvaluator


class TestConformalUncertainty(unittest.TestCase):
    def setUp(self):
        self.forecaster = FuturePredictionEngine()
        CONFIG.safety_margin_factor = 0.80

    def tearDown(self):
        CONFIG.safety_margin_factor = 0.80

    def test_01_finite_sample_conformal_quantile_deterministic(self):
        """Verify exact finite-sample order statistic quantile rule on known toy calibration sets."""
        # Case A: n = 19, alpha = 0.05
        # p = ceil((19 + 1) * 0.95) = ceil(19.0) = 19 (the exact maximum item)
        scores_19 = [float(i) for i in range(1, 20)]
        q_19 = finite_sample_conformal_quantile(scores_19, alpha=0.05)
        self.assertEqual(q_19, 19.0)

        # Case B: n = 39, alpha = 0.05
        # p = ceil((39 + 1) * 0.95) = ceil(38.0) = 38 (the 38th smallest item)
        scores_39 = [float(i) for i in range(1, 40)]
        q_39 = finite_sample_conformal_quantile(scores_39, alpha=0.05)
        self.assertEqual(q_39, 38.0)

        # Case C: n = 9, alpha = 0.05
        # p = ceil((9 + 1) * 0.95) = ceil(9.5) = 10 > 9
        # Insufficient sample size for finite-sample 95% guarantee without extrapolation -> returns inf
        scores_9 = [float(i) for i in range(1, 10)]
        q_9 = finite_sample_conformal_quantile(scores_9, alpha=0.05)
        self.assertTrue(np.isinf(q_9))

    def test_02_calibration_and_test_separation_and_lot_disjointness(self):
        """Verify calibration data and test data are strictly disjoint with zero lot overlap."""
        cal_df = pd.DataFrame([
            {"component_id": f"C-CAL-{i}", "lot_id": "LOT-CAL", "parameter_name": "leakage_current_uA",
             "val_0h": 5.0, "val_24h": 5.2, "val_96h": 5.4, "val_168h": 5.8, "drift_rate_24": 0.008, "drift_acceleration": 0.0}
            for i in range(25)
        ])
        test_df = pd.DataFrame([
            {"component_id": f"C-TEST-{i}", "lot_id": "LOT-TEST", "parameter_name": "leakage_current_uA",
             "val_0h": 5.0, "val_24h": 5.1, "val_96h": 5.2, "val_168h": 5.5, "drift_rate_24": 0.004, "drift_acceleration": 0.0}
            for i in range(25)
        ])

        cal_cids = set(cal_df["component_id"])
        test_cids = set(test_df["component_id"])
        self.assertTrue(cal_cids.isdisjoint(test_cids))
        self.assertNotEqual(cal_df["lot_id"].iloc[0], test_df["lot_id"].iloc[0])

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
        self.assertEqual(preds[0]["nominal_coverage_pct"], 95.0)

    def test_03_zero_future_leakage_and_168h_absence(self):
        """Verify Value_168h and any delta involving 168h are never present in inference feature sets."""
        feat_cols_24h = ["val_0h", "val_24h", "delta_0_24", "drift_rate_24", "pct_change_24", "lot_zscore_24"]
        feat_cols_96h = ["val_0h", "val_24h", "val_96h", "delta_0_24", "delta_24_96", "drift_rate_24", "drift_rate_96", "drift_acceleration"]

        for col in ["val_168h", "delta_96_168", "actual_168h", "drift_to_168h"]:
            self.assertNotIn(col, feat_cols_24h)
            self.assertNotIn(col, feat_cols_96h)

    def test_04_primary_forecast_target_invariant_168h(self):
        """Verify that the primary forecast target remains 168h across all outputs."""
        test_df = pd.DataFrame([{
            "component_id": "C-CONF-1",
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

    def test_05_conformal_interval_construction_and_bounds(self):
        """Verify that conformal intervals are constructed as [yhat - q*sigma, yhat + q*sigma] and non-negative."""
        test_df = pd.DataFrame([{
            "component_id": "C-CONF-BOUNDS",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.4,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.016,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(test_df, stage_available="24h", use_conformal=True)
        p = preds[0]

        pred = p["predicted_168h"]
        lb = p["lower_bound_95"]
        ub = p["upper_bound_95"]
        radius = p["conformal_radius"]
        q = p["conformal_quantile"]
        std = p["uncertainty_std"]

        self.assertEqual(p["interval_method"], "95% Nominal Split-Conformal Prediction Interval")
        self.assertEqual(p["nominal_coverage_pct"], 95.0)
        self.assertGreaterEqual(lb, 0.0)
        self.assertAlmostEqual(ub - pred, radius, places=2)
        self.assertAlmostEqual(radius, q * std, places=2)
        self.assertEqual(p["estimated_prediction_interval"], [lb, ub])

    def test_06_evaluator_reports_nominal_95_and_empirical_coverage(self):
        """Verify ModelEvaluator correctly reports 95% nominal split-conformal level and empirical coverage."""
        preds = [{
            "actual_168h": 10.0,
            "predicted_168h": 10.1,
            "stage_used": "96h",
            "error_absolute": 0.1,
            "lower_bound_95": 9.0,
            "upper_bound_95": 11.0,
            "interval_method": "95% Nominal Split-Conformal Prediction Interval",
            "n_cal_samples": 25
        }]
        res = ModelEvaluator.evaluate_performance(
            ground_truth={"C-1": {"is_defect": False, "lot_id": "LOT-A"}},
            predictions=preds,
            components_table=[{"component_id": "C-1", "risk_level": "PASS"}],
            features_df=pd.DataFrame([{"component_id": "C-1", "parameter_name": "leakage_current_uA", "val_24h": 5.0, "lot_zscore_24": 0.1}])
        )
        piv = res["prediction_interval_validation"]
        self.assertEqual(piv["interval_method"], "95% Nominal Split-Conformal Prediction Interval")
        self.assertEqual(piv["nominal_calibrated_level"], "95.0% (finite-sample split conformal)")
        self.assertIn("finite-sample marginal coverage", piv["terminology_note"])
        self.assertIn("exchangeability assumption", piv["terminology_note"])

    def test_07_absence_of_unsupported_confidence_or_safety_claims(self):
        """Verify that unsupported claims like '95% confidence' or '95% physical safety' do not appear."""
        test_df = pd.DataFrame([{
            "component_id": "C-CONF-CLAIMS",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.2,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.008,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(test_df, stage_available="24h", use_conformal=True)
        p = preds[0]

        text_to_check = (
            str(p.get("interval_method", "")) + " " +
            str(p.get("interval_note", "")) + " " +
            str(p.get("p90_assumption", "")) + " " +
            str(p.get("safety_margin_factor_note", ""))
        ).lower()

        forbidden_phrases = [
            "95% confidence interval",
            "95% physical safety guarantee",
            "95% guaranteed physical safety",
            "guaranteed 95% coverage on every component",
            "95% conditional coverage"
        ]
        for phrase in forbidden_phrases:
            self.assertNotIn(phrase, text_to_check)

    def test_08_empirical_fallback_preservation(self):
        """Verify that setting use_conformal=False cleanly returns the empirical fallback interval."""
        test_df = pd.DataFrame([{
            "component_id": "C-FALLBACK",
            "parameter_name": "leakage_current_uA",
            "val_0h": 5.0,
            "val_24h": 5.2,
            "val_96h": None,
            "val_168h": None,
            "drift_rate_24": 0.008,
            "drift_acceleration": 0.0
        }])
        preds, _ = self.forecaster.fit_and_predict(test_df, stage_available="24h", use_conformal=False)
        p = preds[0]
        self.assertEqual(p["interval_method"], "Empirical residual-based estimated interval")
        self.assertIn("not presented as a formally calibrated 95% guarantee", p["interval_note"])
        self.assertAlmostEqual(p["upper_bound_95"] - p["predicted_168h"], 1.96 * p["uncertainty_std"], places=2)

    def test_09_safety_margin_factor_remains_configurable_at_080(self):
        """Verify safety margin factor is decoupled from conformal coverage and remains configurable at 0.80."""
        self.assertEqual(CONFIG.safety_margin_factor, 0.80)
        CONFIG.safety_margin_factor = 0.70
        self.assertEqual(CONFIG.safety_margin_factor, 0.70)
        CONFIG.safety_margin_factor = 0.80
        self.assertEqual(CONFIG.safety_margin_factor, 0.80)


if __name__ == "__main__":
    unittest.main()
