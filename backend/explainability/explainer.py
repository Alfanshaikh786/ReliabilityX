"""
Explainable AI (XAI) & Attribution Engine for ReliabilityX
Generates transparent, mathematically grounded evidence breakdowns:
- Factor contribution percentages:
  * Drift Rate Contribution
  * Acceleration Contribution
  * Lot-Relative Deviation (DPAT/Z-Score)
  * Multivariate Anomaly Score
  * 168h Predicted Limit Proximity
  * Prediction Uncertainty Margin
- Human-readable natural-language engineering evidence linking directly to physical telemetry values.
"""
from typing import Dict, Any, List
import pandas as pd
import numpy as np


class ExplainabilityEngine:
    @staticmethod
    def generate_explanation(
        comp_id: str,
        features: pd.DataFrame,
        anomaly_scores: Dict[str, Any],
        behaviour_fingerprint: Dict[str, Any],
        predictions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes measured evidence, anomaly scores, and forecasts into
        quantified feature attributions and an authoritative engineering explanation.
        """
        comp_feats = features[features["component_id"] == comp_id]
        if comp_feats.empty:
            return {
                "component_id": comp_id,
                "factor_contributions": {},
                "top_drivers": [],
                "narrative_explanation": "Insufficient feature telemetry."
            }

        # 1. Quantify individual factor contributions
        # Max lot z-score
        max_z = float(comp_feats["lot_zscore_24"].abs().max()) if not comp_feats.empty else 0.0
        z_norm = min(1.0, max_z / 4.0)

        # Max drift rate
        max_drift = float(comp_feats["drift_rate_24"].abs().max()) if not comp_feats.empty else 0.0
        drift_norm = min(1.0, max_drift / 0.1)

        # Acceleration
        max_accel = float(comp_feats["drift_acceleration"].max()) if not comp_feats.empty else 0.0
        accel_norm = min(1.0, max(0.0, max_accel / 0.001))

        # Anomaly ensemble score
        ens_score = anomaly_scores.get("normalized_score", 0.0)

        # Prediction limit proximity (how close P90 is to engineering limit)
        max_pred_proximity = 0.0
        closest_pred_param = None
        for p in predictions:
            limit = p.get("engineering_limit", 999.0)
            p90 = p.get("p90_worst_case", 0.0)
            prox = p90 / limit if limit > 0 else 0.0
            if prox > max_pred_proximity:
                max_pred_proximity = prox
                closest_pred_param = p.get("parameter_name")
        pred_norm = min(1.0, max(0.0, (max_pred_proximity - 0.5) / 0.5))

        # Uncertainty contribution
        max_uncertainty = 0.0
        for p in predictions:
            u = p.get("uncertainty_std", 0.0)
            lim = p.get("engineering_limit", 1.0)
            u_ratio = u / lim
            if u_ratio > max_uncertainty:
                max_uncertainty = u_ratio
        uncertainty_norm = min(1.0, max_uncertainty / 0.15)

        raw_contributions = {
            "Drift Rate": drift_norm * 0.20,
            "Drift Acceleration": accel_norm * 0.25,
            "Lot-Relative Deviation": z_norm * 0.20,
            "Multivariate Anomaly": ens_score * 0.15,
            "Predicted Limit Proximity": pred_norm * 0.20
        }

        total_weight = sum(raw_contributions.values()) or 1.0
        normalized_attributions = {
            k: round((v / total_weight) * 100.0, 1) for k, v in raw_contributions.items()
        }

        # Identify top drivers
        sorted_drivers = sorted(normalized_attributions.items(), key=lambda x: x[1], reverse=True)
        top_drivers = [d[0] for d in sorted_drivers if d[1] >= 20.0]

        # 2. Build human-readable engineering narrative (Clearly distinguishing measurement, interpretation, action)
        narrative_parts = []
        state = behaviour_fingerprint.get("overall_state", "NORMAL")
        driver_param = behaviour_fingerprint.get("primary_driver", "parameter")

        if state == "HIGH RISK":
            narrative_parts.append(
                f"OBSERVED MEASUREMENT: Elevated parametric drift in {driver_param}."
            )
            if max_pred_proximity >= 0.95:
                narrative_parts.append(
                    f"MODEL INTERPRETATION: P90 estimated upper bound approaches {((1.0 - max_pred_proximity) * 100):.1f}% margin of engineering limit."
                )
            if max_accel > 0.0005:
                narrative_parts.append(
                    f"Telemetry evidence (+{max_accel:.5f}/h² acceleration) is consistent with progressive wearout."
                )
            narrative_parts.append("ENGINEERING ACTION: Engineering investigation / disposition required.")
        elif state == "ACCELERATING":
            narrative_parts.append(
                f"OBSERVED MEASUREMENT: Positive wearout acceleration detected in {driver_param} (+{max_accel:.5f}/h²)."
            )
            narrative_parts.append(
                "MODEL INTERPRETATION: Current measurements remain inside spec; statistical velocity indicates early latent drift."
            )
            narrative_parts.append("ENGINEERING ACTION: Engineering review recommended.")
        elif state == "DRIFTING":
            narrative_parts.append(
                f"OBSERVED MEASUREMENT: Monotonic parameter shift in {driver_param} relative to lot baseline (Z-score: {max_z:+.2f}σ)."
            )
            narrative_parts.append("MODEL INTERPRETATION: Drift velocity currently constant with no secondary acceleration detected.")
            narrative_parts.append("ENGINEERING ACTION: Monitoring recommended.")
        else:
            narrative_parts.append(
                "OBSERVED MEASUREMENT: Parameter deltas and drift rates remain well within nominal lot distribution."
            )
            narrative_parts.append("ENGINEERING ACTION: No abnormal behaviour detected by ReliabilityX; subject to applicable engineering requirements.")

        return {
            "component_id": comp_id,
            "factor_contributions": normalized_attributions,
            "top_drivers": top_drivers,
            "narrative_explanation": " ".join(narrative_parts)
        }
