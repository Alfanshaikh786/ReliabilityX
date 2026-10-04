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
from sklearn.covariance import MinCovDet, EmpiricalCovariance, LedoitWolf, OAS
import warnings


class MahalanobisDetector:
    def __init__(self, significance_level: float = 0.01, min_samples: int = 8, max_condition_number: float = 1e4):
        self.significance_level = significance_level
        self.min_samples = min_samples
        self.max_condition_number = max_condition_number

    def score(self, wide_features: pd.DataFrame, feature_cols: List[str]) -> List[Dict[str, Any]]:
        results = []
        n_samples = len(wide_features)
        n_features = len(feature_cols)

        # 1. Minimum sample size validation (Phase 8)
        min_required = max(n_features * 2, self.min_samples)
        if n_samples < min_required or n_samples <= n_features + 1:
            for comp_id in wide_features["component_id"]:
                results.append({
                    "component_id": comp_id,
                    "detector_name": "Mahalanobis",
                    "raw_score": 0.0,
                    "normalized_score": 0.0,
                    "is_anomalous": False,
                    "evidence": (
                        f"Sample size ({n_samples}) insufficient for statistically robust {n_features}-feature "
                        f"covariance estimation (minimum {min_required} required). Neutral score assigned."
                    ),
                    "detector_status": "INSUFFICIENT_STATISTICAL_SUPPORT"
                })
            return results

        X = wide_features[feature_cols].fillna(0.0).values

        # 2. Feature Standardization & Zero-Variance Safeguard (Phase 10)
        variances = np.var(X, axis=0)
        if np.any(variances < 1e-12):
            for comp_id in wide_features["component_id"]:
                results.append({
                    "component_id": comp_id,
                    "detector_name": "Mahalanobis",
                    "raw_score": 0.0,
                    "normalized_score": 0.0,
                    "is_anomalous": False,
                    "evidence": "Zero-variance feature detected; covariance matrix is singular. Neutral score assigned.",
                    "detector_status": "INSUFFICIENT_STATISTICAL_SUPPORT"
                })
            return results

        means = np.mean(X, axis=0)
        stds = np.sqrt(variances)
        X_std = (X - means) / stds

        # 3. Covariance Regularization & Shrinkage (Ledoit-Wolf / OAS / MCD)
        d_squared = None
        status = "ACTIVE"
        evidence_note = ""

        try:
            # Primary: Ledoit-Wolf analytical shrinkage for optimal well-conditioned covariance
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                lw = LedoitWolf().fit(X_std)
                cov_mat = lw.covariance_
                rank = np.linalg.matrix_rank(cov_mat)
                cond_num = np.linalg.cond(cov_mat)

                if rank < n_features:
                    raise np.linalg.LinAlgError(f"Rank deficient covariance (rank {rank} < {n_features})")
                if np.isnan(cond_num) or cond_num > self.max_condition_number:
                    raise np.linalg.LinAlgError(f"High condition number ({cond_num:.1e}) exceeding {self.max_condition_number:.1e}")

                diff = X_std - lw.location_
                inv_cov = lw.precision_
                d_squared = np.sum(np.dot(diff, inv_cov) * diff, axis=1)
                status = "ACTIVE_SHRUNK"
                evidence_note = f"Ledoit-Wolf shrinkage (cond={cond_num:.1f}, rank={rank})"
        except Exception:
            try:
                # Secondary: Oracle Approximating Shrinkage (OAS)
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    oas = OAS().fit(X_std)
                    cov_oas = oas.covariance_
                    rank_oas = np.linalg.matrix_rank(cov_oas)
                    cond_oas = np.linalg.cond(cov_oas)
                    if rank_oas < n_features or cond_oas > self.max_condition_number or np.isnan(cond_oas):
                        raise np.linalg.LinAlgError("OAS ill-conditioned")
                    diff = X_std - oas.location_
                    inv_cov = oas.precision_
                    d_squared = np.sum(np.dot(diff, inv_cov) * diff, axis=1)
                    status = "ACTIVE_SHRUNK_OAS"
                    evidence_note = f"OAS shrinkage (cond={cond_oas:.1f}, rank={rank_oas})"
            except Exception:
                try:
                    # Tertiary: MinCovDet robust estimator with condition check
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        mcd = MinCovDet(random_state=42).fit(X_std)
                        cond_mcd = np.linalg.cond(mcd.covariance_)
                        rank_mcd = np.linalg.matrix_rank(mcd.covariance_)
                        if rank_mcd < n_features or np.isnan(cond_mcd) or cond_mcd > self.max_condition_number:
                            raise np.linalg.LinAlgError("MCD ill-conditioned")
                        diff = X_std - mcd.location_
                        inv_cov = mcd.precision_
                        d_squared = np.sum(np.dot(diff, inv_cov) * diff, axis=1)
                        status = "ACTIVE_ROBUST"
                        evidence_note = "MCD robust covariance"
                except Exception:
                    # Final safety fallback: diagonal variance with INSUFFICIENT_STATISTICAL_SUPPORT
                    diff = X_std
                    d_squared = np.sum(diff ** 2, axis=1)
                    status = "INSUFFICIENT_STATISTICAL_SUPPORT"
                    evidence_note = "Ill-conditioned/singular covariance; standardized diagonal fallback applied"

        # 3. Chi-square calibration
        cdf_probs = chi2.cdf(d_squared, df=n_features)
        critical_d2 = chi2.ppf(1.0 - self.significance_level, df=n_features)

        for idx, row in wide_features.iterrows():
            comp_id = row["component_id"]
            d2_val = float(d_squared[idx])
            prob = float(cdf_probs[idx])
            is_anom = (d2_val > critical_d2) and (status != "INSUFFICIENT_STATISTICAL_SUPPORT")

            if status == "INSUFFICIENT_STATISTICAL_SUPPORT":
                evidence = (
                    f"Multivariate covariance ill-conditioned (insufficient statistical support). "
                    f"Diagonal D²={d2_val:.2f}, p={1.0-prob:.3f}. Requires review."
                )
            elif is_anom:
                evidence = (
                    f"Multivariate covariance anomaly: Mahalanobis D²={d2_val:.2f} > critical {critical_d2:.2f} "
                    f"(p={1.0-prob:.4f}, {evidence_note})."
                )
            else:
                evidence = (
                    f"Multivariate distribution nominal (D²={d2_val:.2f}, p={1.0-prob:.3f}, {evidence_note})."
                )

            results.append({
                "component_id": comp_id,
                "detector_name": "Mahalanobis",
                "raw_score": round(d2_val, 4),
                "normalized_score": round(prob, 4) if status != "INSUFFICIENT_STATISTICAL_SUPPORT" else 0.0,
                "is_anomalous": bool(is_anom),
                "evidence": evidence,
                "detector_status": status
            })

        return results

