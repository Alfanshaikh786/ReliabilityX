"""
Local Outlier Factor (LOF) Anomaly Detector
Measures local density divergence relative to k-nearest lot peers.
Calibrates raw factor into a [0, 1] normalized anomaly score.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.neighbors import LocalOutlierFactor


class LOFDetector:
    def __init__(self, n_neighbors: int = 10, contamination: float = 0.08):
        self.n_neighbors = n_neighbors
        self.contamination = contamination

    def score(self, wide_features: pd.DataFrame, feature_cols: List[str]) -> List[Dict[str, Any]]:
        results = []
        n_samples = len(wide_features)
        
        # Need at least n_neighbors + 1 samples
        k = min(self.n_neighbors, max(2, n_samples - 1))
        if n_samples < 5:
            for comp_id in wide_features["component_id"]:
                results.append({
                    "component_id": comp_id,
                    "detector_name": "LOF",
                    "raw_score": 1.0,
                    "normalized_score": 0.0,
                    "is_anomalous": False,
                    "evidence": f"Sample size ({n_samples}) too small for density-based LOF.",
                    "detector_status": "FALLBACK"
                })
            return results

        X = wide_features[feature_cols].fillna(0.0).values
        
        lof = LocalOutlierFactor(n_neighbors=k, contamination=self.contamination)
        preds = lof.fit_predict(X) # -1 for outlier, 1 for inlier
        # negative_outlier_factor_: close to -1 is normal, large negative is outlier
        neg_factors = lof.negative_outlier_factor_
        # Convert to standard LOF score: -neg_factor (1.0 = normal, >1.5 = outlier)
        raw_factors = -neg_factors

        # Calibrate raw LOF score to [0, 1]
        # LOF of 1.0 maps to ~0.1, LOF of 2.0 maps to ~0.8
        norm_scores = 1.0 / (1.0 + np.exp(-3.0 * (raw_factors - 1.3)))

        for idx, row in wide_features.iterrows():
            comp_id = row["component_id"]
            is_anom = (preds[idx] == -1)
            raw_s = float(raw_factors[idx])
            norm_s = float(norm_scores[idx])

            evidence = (
                f"Local density outlier: LOF factor {raw_s:.2f} > neighborhood threshold"
                if is_anom else
                f"Local peer density consistent (LOF {raw_s:.2f})"
            )

            results.append({
                "component_id": comp_id,
                "detector_name": "LOF",
                "raw_score": round(raw_s, 4),
                "normalized_score": round(norm_s, 4),
                "is_anomalous": bool(is_anom),
                "evidence": evidence,
                "detector_status": "ACTIVE"
            })

        return results
