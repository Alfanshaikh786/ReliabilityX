"""
Mahalanobis Distance Multivariate Anomaly Detector
Computes robust covariance matrix (using MinCovDet / EmpiricalCovariance)
and maps squared Mahalanobis distance through Chi-Square CDF for exact [0, 1] calibration.
Gracefully falls back when lot size is small or covariance matrix is ill-conditioned.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy.stats import chi2
from sklearn.covariance import MinCovDet, EmpiricalCovariance


class MahalanobisDetector:
    def __init__(self, significance_level: float = 0.01):
        self.significance_level = significance_level

    def score(self, wide_features: pd.DataFrame, feature_cols: List[str]) -> List[Dict[str, Any]]:
        results = []
        n_samples = len(wide_features)
        n_features = len(feature_cols)

        # Fallback condition
        if n_samples <= n_features + 2:
            for comp_id in wide_features["component_id"]:
                results.append({
                    "component_id": comp_id,
                    "detector_name": "Mahalanobis",
                    "raw_score": 0.0,
                    "normalized_score": 0.0,
                    "is_anomalous": False,
                    "evidence": f"Sample size ({n_samples}) insufficient for {n_features} multivariate features.",
                    "detector_status": "FALLBACK"
                })
            return results

        X = wide_features[feature_cols].fillna(0.0).values
        
        import warnings
        try:
            # Try Minimum Covariance Determinant (robust estimator)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                mcd = MinCovDet(random_state=42).fit(X)
            diff = X - mcd.location_
            inv_cov = mcd.precision_
            # D^2 = sum_j (diff * inv_cov)_j * diff_j
            d_squared = np.sum(np.dot(diff, inv_cov) * diff, axis=1)
            status = "ACTIVE"
        except Exception:
            try:
                # Fallback to standard empirical covariance with regularization
                emp = EmpiricalCovariance().fit(X)
                diff = X - emp.location_
                inv_cov = emp.precision_
                d_squared = np.sum(np.dot(diff, inv_cov) * diff, axis=1)
                status = "ACTIVE_REGULARIZED"
            except Exception as e:
                # Ultimate fallback to diagonal variance
                variances = np.var(X, axis=0) + 1e-5
                diff = X - np.mean(X, axis=0)
                d_squared = np.sum((diff ** 2) / variances, axis=1)
                status = "FALLBACK_DIAGONAL"

        # Chi-square calibration: CDF of D^2 with n_features degrees of freedom
        # CDF gives probability of observing a value <= d_squared under normal assumption.
        # High CDF (e.g. > 0.99) means extreme multivariate outlier!
        cdf_probs = chi2.cdf(d_squared, df=n_features)
        critical_d2 = chi2.ppf(1.0 - self.significance_level, df=n_features)

        for idx, row in wide_features.iterrows():
            comp_id = row["component_id"]
            d2_val = float(d_squared[idx])
            prob = float(cdf_probs[idx])
            is_anom = d2_val > critical_d2
            
            evidence = (
                f"Multivariate correlation anomaly: Mahalanobis D²={d2_val:.2f} > critical {critical_d2:.2f} (p={1.0-prob:.4f})"
                if is_anom else
                f"Multivariate distribution nominal (D²={d2_val:.2f}, p={1.0-prob:.3f})"
            )

            results.append({
                "component_id": comp_id,
                "detector_name": "Mahalanobis",
                "raw_score": round(d2_val, 4),
                "normalized_score": round(prob, 4),
                "is_anomalous": bool(is_anom),
                "evidence": evidence,
                "detector_status": status
            })

        return results
