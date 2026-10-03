"""
Isolation Forest Anomaly Detector with Score Calibration
Builds an isolation tree ensemble over parametric delta and drift features.
Calibrates raw decision function into a unified [0, 1] anomaly probability.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest


class IsolationForestDetector:
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state

    def score(self, wide_features: pd.DataFrame, feature_cols: List[str]) -> List[Dict[str, Any]]:
        """
        wide_features: DataFrame indexed by component_id, containing numeric feature_cols.
        Returns list of score dicts per component.
        """
        results = []
        n_samples = len(wide_features)
        
        if n_samples < 6:
            # Fallback if too few samples
            for comp_id in wide_features["component_id"]:
                results.append({
                    "component_id": comp_id,
                    "detector_name": "Isolation_Forest",
                    "raw_score": 0.0,
                    "normalized_score": 0.0,
                    "is_anomalous": False,
                    "evidence": f"Sample size ({n_samples}) too small for Isolation Forest.",
                    "detector_status": "FALLBACK"
                })
            return results

        X = wide_features[feature_cols].fillna(0.0).values
        
        # Fit Isolation Forest
        iso = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100
        )
        iso.fit(X)
        
        # Raw decision function: higher is normal, lower is anomalous
        raw_scores = iso.decision_function(X)
        preds = iso.predict(X) # -1 for anomaly, 1 for inlier
        
        # Calibrate: min-max inverted so that 1 = highly anomalous, 0 = normal
        min_s, max_s = raw_scores.min(), raw_scores.max()
        range_s = max_s - min_s if (max_s - min_s) > 1e-6 else 1.0
        normalized = 1.0 - ((raw_scores - min_s) / range_s)
        
        for idx, row in wide_features.iterrows():
            comp_id = row["component_id"]
            is_anom = (preds[idx] == -1)
            norm_s = float(normalized[idx])
            raw_s = float(raw_scores[idx])
            
            evidence = (
                f"Isolation Forest flagged multi-feature anomaly (calibrated score: {norm_s:.2f})"
                if is_anom else
                f"Isolation Forest nominal (calibrated score: {norm_s:.2f})"
            )
            
            results.append({
                "component_id": comp_id,
                "detector_name": "Isolation_Forest",
                "raw_score": round(raw_s, 4),
                "normalized_score": round(norm_s, 4),
                "is_anomalous": bool(is_anom),
                "evidence": evidence,
                "detector_status": "ACTIVE"
            })
            
        return results
