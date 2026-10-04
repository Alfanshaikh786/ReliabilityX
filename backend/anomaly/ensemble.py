"""
Ensemble Anomaly Engine for ReliabilityX
Harmonizes and fuses calibrated anomaly scores across:
1. DPAT (AEC-Q001 parametric lot screening)
2. Isolation Forest (multidimensional drift isolation)
3. Mahalanobis Distance (multivariate correlation & covariance)
4. Local Outlier Factor (peer neighborhood density)

Applies dynamically weighted fusion based on active detector statuses,
preventing raw-scale distortion and providing full detector-level traceability.
"""
from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.anomaly.dpat import DPATDetector
from backend.anomaly.isolation_forest import IsolationForestDetector
from backend.anomaly.mahalanobis import MahalanobisDetector
from backend.anomaly.lof import LOFDetector


class AnomalyEnsembleEngine:
    # Base fusion weights
    DEFAULT_WEIGHTS = {
        "DPAT": 0.35,              # Robust lot-relative statistical screening (PAT-inspired)
        "Isolation_Forest": 0.25,  # Strong multi-feature tree isolation
        "Mahalanobis": 0.25,       # Strong for cross-parameter covariance shifts
        "LOF": 0.15                # Local peer density verification
    }

    def __init__(self, k_dpat: float = 3.0):
        self.dpat_detector = DPATDetector(k_factor=k_dpat)
        self.iso_detector = IsolationForestDetector()
        self.maha_detector = MahalanobisDetector()
        self.lof_detector = LOFDetector()

    def run_all(self, features_df: pd.DataFrame) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Runs all detectors, calibrates their scores, integrates multi-reference frames,
        and produces an ensemble score per component.
        """
        all_results = []

        # 1. DPAT (runs per parameter and lot)
        dpat_results = self.dpat_detector.score(features_df)
        all_results.extend(dpat_results)

        # Aggregate max DPAT score per component
        dpat_by_comp = {}
        for r in dpat_results:
            cid = r["component_id"]
            if cid not in dpat_by_comp or r["normalized_score"] > dpat_by_comp[cid]["normalized_score"]:
                dpat_by_comp[cid] = r

        # 2. Build wide feature representation for multivariate detectors
        # Features used: val_0h, val_24h, delta_0_24, drift_rate_24, lot_zscore_24 for each parameter
        wide_pivoted = features_df.pivot_table(
            index="component_id",
            columns="parameter_name",
            values=["val_24h", "delta_0_24", "drift_rate_24", "lot_zscore_24"],
            aggfunc="first"
        )
        wide_pivoted.columns = [f"{col[0]}_{col[1]}" for col in wide_pivoted.columns]
        wide_features = wide_pivoted.reset_index()
        feature_cols = [c for c in wide_features.columns if c != "component_id"]

        # 3. Isolation Forest
        iso_results = self.iso_detector.score(wide_features, feature_cols)
        all_results.extend(iso_results)
        iso_by_comp = {r["component_id"]: r for r in iso_results}

        # 4. Mahalanobis Distance (with shrinkage and statistical support safeguards)
        maha_results = self.maha_detector.score(wide_features, feature_cols)
        all_results.extend(maha_results)
        maha_by_comp = {r["component_id"]: r for r in maha_results}

        # 5. Local Outlier Factor (windowed batch peer density)
        lof_results = self.lof_detector.score(wide_features, feature_cols)
        all_results.extend(lof_results)
        lof_by_comp = {r["component_id"]: r for r in lof_results}

        # 6. Ensemble Fusion per component with Multi-Reference Frame Integration (Phase 6)
        ensemble_scores = []
        for comp_id in wide_features["component_id"]:
            scores = {}
            active_weights = {}

            # Gather calibrated normalized scores with status discounting
            if comp_id in dpat_by_comp:
                st = dpat_by_comp[comp_id]["detector_status"]
                scores["DPAT"] = dpat_by_comp[comp_id]["normalized_score"]
                active_weights["DPAT"] = self.DEFAULT_WEIGHTS["DPAT"] if st == "ACTIVE" else 0.05

            if comp_id in iso_by_comp:
                st = iso_by_comp[comp_id]["detector_status"]
                scores["Isolation_Forest"] = iso_by_comp[comp_id]["normalized_score"]
                active_weights["Isolation_Forest"] = self.DEFAULT_WEIGHTS["Isolation_Forest"] if st == "ACTIVE" else 0.05

            if comp_id in maha_by_comp:
                st = maha_by_comp[comp_id]["detector_status"]
                scores["Mahalanobis"] = maha_by_comp[comp_id]["normalized_score"]
                # Zero out weight if covariance support was insufficient
                active_weights["Mahalanobis"] = self.DEFAULT_WEIGHTS["Mahalanobis"] if "ACTIVE" in st else 0.0

            if comp_id in lof_by_comp:
                st = lof_by_comp[comp_id]["detector_status"]
                scores["LOF"] = lof_by_comp[comp_id]["normalized_score"]
                active_weights["LOF"] = self.DEFAULT_WEIGHTS["LOF"] if st == "ACTIVE" else 0.0

            # Weighted sum normalized by sum of active weights
            total_weight = sum(active_weights.values())
            if total_weight > 0:
                fused_score = sum(scores[k] * active_weights[k] for k in scores) / total_weight
            else:
                fused_score = scores.get("DPAT", 0.0)

            # Check historical reference baseline shift from feature slice
            c_feats = features_df[features_df["component_id"] == comp_id]
            max_hist_dev = 0.0
            for _, f_row in c_feats.iterrows():
                # Distance to limit ratio
                dtl = f_row.get("distance_to_limit", 999.0)
                if pd.notnull(dtl) and dtl < 2.0:
                    max_hist_dev = max(max_hist_dev, 0.4)

            # Combine lot-relative with absolute and historical frames
            fused_score = min(1.0, fused_score + max_hist_dev * 0.25)
            is_anomalous = fused_score >= 0.55 or scores.get("DPAT", 0) > 0.85 or scores.get("Mahalanobis", 0) > 0.90

            # Generate natural language evidence summary
            flagged_detectors = []
            if dpat_by_comp.get(comp_id, {}).get("is_anomalous"):
                flagged_detectors.append("PAT-inspired lot-relative screening")
            if iso_by_comp.get(comp_id, {}).get("is_anomalous"):
                flagged_detectors.append("multi-parameter Isolation Forest")
            if maha_by_comp.get(comp_id, {}).get("is_anomalous"):
                flagged_detectors.append("Mahalanobis covariance shift")
            if lof_by_comp.get(comp_id, {}).get("is_anomalous"):
                flagged_detectors.append("LOF local peer density divergence")

            if flagged_detectors:
                evidence = f"Ensemble anomaly detected (score: {fused_score:.2f}) flagged by {', '.join(flagged_detectors)}."
            else:
                evidence = f"Ensemble anomaly score nominal ({fused_score:.2f})."

            ensemble_record = {
                "component_id": comp_id,
                "detector_name": "Ensemble",
                "raw_score": round(fused_score, 4),
                "normalized_score": round(fused_score, 4),
                "is_anomalous": bool(is_anomalous),
                "evidence": evidence,
                "detector_status": "ACTIVE"
            }
            all_results.append(ensemble_record)
            ensemble_scores.append(ensemble_record)

        ensemble_df = pd.DataFrame(ensemble_scores)
        return ensemble_df, all_results
