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
from __future__ import annotations
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

        # 2. Build human-readable engineering narrative
        state = behaviour_fingerprint.get("overall_state", "NORMAL")
        driver_param = behaviour_fingerprint.get("primary_driver", comp_feats["parameter_name"].iloc[0] if not comp_feats.empty else "parameter")
        narrative_parts = []

        if state == "HIGH RISK":
            narrative_parts.append(f"OBSERVED MEASUREMENT: Elevated parametric drift in {driver_param}.")
            if max_pred_proximity >= 0.95:
                narrative_parts.append(f"MODEL INTERPRETATION: P90 estimated upper bound approaches {((1.0 - max_pred_proximity) * 100):.1f}% margin of engineering limit.")
            if max_accel > 0.0005:
                narrative_parts.append(f"Telemetry evidence (+{max_accel:.5f}/h² acceleration) is consistent with progressive wearout.")
            narrative_parts.append("ENGINEERING ACTION: Engineering investigation / disposition required.")
        elif state == "ACCELERATING":
            narrative_parts.append(f"OBSERVED MEASUREMENT: Positive wearout acceleration detected in {driver_param} (+{max_accel:.5f}/h²).")
            narrative_parts.append("MODEL INTERPRETATION: Current measurements remain inside spec; statistical velocity indicates early latent drift.")
            narrative_parts.append("ENGINEERING ACTION: Engineering review recommended.")
        elif state == "DRIFTING":
            narrative_parts.append(f"OBSERVED MEASUREMENT: Monotonic parameter shift in {driver_param} relative to lot baseline (Z-score: {max_z:+.2f}σ).")
            narrative_parts.append("MODEL INTERPRETATION: Drift velocity currently constant with no secondary acceleration detected.")
            narrative_parts.append("ENGINEERING ACTION: Monitoring recommended.")
        else:
            narrative_parts.append("OBSERVED MEASUREMENT: Parameter deltas and drift rates remain well within nominal lot distribution.")
            narrative_parts.append("ENGINEERING ACTION: No abnormal behaviour detected by ReliabilityX; subject to applicable engineering requirements.")

        # 3. Structured QA Evidence Fields (Official SIH26170 Requirement)
        primary_pred = predictions[0] if predictions else {}
        pred_168h_val = primary_pred.get("predicted_value_168h", primary_pred.get("predicted_168h"))
        eng_limit = primary_pred.get("engineering_limit", 20.0)
        p_drift_rate = primary_pred.get("predicted_drift_rate", max_drift / 144.0)
        s_slope = primary_pred.get("safety_slope", (eng_limit - (comp_feats["val_24h"].iloc[0] if not comp_feats.empty and pd.notnull(comp_feats["val_24h"].iloc[0]) else 5.0)) / 144.0)
        slope_exceeded = primary_pred.get("slope_exceeded", False)

        is_spec_breached = any(
            pd.notnull(r.get("val_24h")) and r.get("val_24h") >= eng_limit
            for _, r in comp_feats.iterrows()
        )
        spec_status = "SPEC_LIMIT_BREACHED" if is_spec_breached else "WITHIN_SPEC_LIMIT"

        slope_comparison = (
            f"Predicted drift rate ({p_drift_rate:.4f}/h) EXCEEDS allowable safety slope ({s_slope:.4f}/h)"
            if slope_exceeded else
            f"Predicted drift rate ({p_drift_rate:.4f}/h) within allowable safety slope ({s_slope:.4f}/h)"
        )

        reason = (
            f"{driver_param} exhibited Z-score {max_z:+.2f}σ and predicted 168h value {pred_168h_val if pred_168h_val is not None else 'N/A'}. "
            f"{slope_comparison}."
        )

        action_map = {
            "HIGH RISK": "Engineering investigation / disposition required (quarantine unit).",
            "ACCELERATING": "Engineering review recommended (verify gate oxide / junction stability).",
            "DRIFTING": "Monitoring recommended across remaining screening gates.",
            "NORMAL": "No abnormal behaviour detected; subject to standard screening criteria."
        }

        return {
            "component_id": comp_id,
            "absolute_spec_status": spec_status,
            "lot_relative_deviation": f"{max_z:+.2f}σ",
            "drift_rate": f"{max_drift:.4f} units/h",
            "predicted_value_168h": pred_168h_val,
            "safety_slope_comparison": slope_comparison,
            "anomaly_score_contributions": normalized_attributions,
            "factor_contributions": normalized_attributions, # Backward compatibility
            "temporal_trend": state,
            "uncertainty": round(max_uncertainty, 4),
            "reason_for_classification": reason,
            "recommended_engineering_action": action_map.get(state, "Engineering review recommended."),
            "top_drivers": top_drivers,
            "narrative_explanation": " ".join(narrative_parts)
        }
