"""
Time-Series Behaviour Engine & Drift Acceleration Intelligence
Classifies component temporal dynamics into 5 distinct physical states:
1. NORMAL       (negligible drift, zero or negative acceleration, within lot baseline)
2. DRIFTING     (steady linear drift rate, near-zero acceleration, elevated slope)
3. ACCELERATING (positive drift rate AND positive drift acceleration d^2y/dt^2 > 0, runaway wearout)
4. UNSTABLE     (erratic oscillations or abrupt sensor divergence)
5. HIGH RISK    (drift trajectory or acceleration projected to breach engineering limit)

Generates an explainable Behaviour Fingerprint for every component.
"""
from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS, ParameterSpec


class BehaviourEngine:
    def __init__(self, specs: Dict[str, ParameterSpec] = None):
        self.specs = specs or DEFAULT_PARAMETER_SPECS

    def analyze_component_behaviour(
        self,
        comp_features: pd.DataFrame,
        anomaly_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        comp_features: slice of features DataFrame for a single component across its parameters.
        anomaly_scores: dict containing ensemble and individual detector normalized scores.
        """
        comp_id = comp_features["component_id"].iloc[0]
        lot_id = comp_features["lot_id"].iloc[0]

        worst_state = "NORMAL"
        state_severity = {"NORMAL": 0, "DRIFTING": 1, "ACCELERATING": 2, "UNSTABLE": 3, "HIGH RISK": 4}
        
        param_behaviours = {}
        primary_driver = None
        max_driver_severity = -1
        evidence_points = []

        for _, row in comp_features.iterrows():
            param = row["parameter_name"]
            spec = self.specs.get(param)
            max_limit = spec.max_limit if spec else 999.0

            v0 = row["val_0h"]
            v24 = row["val_24h"]
            v96 = row["val_96h"]
            v168 = row["val_168h"]

            drift_rate_24 = row["drift_rate_24"]
            drift_rate_96 = row["drift_rate_96"]
            accel = row["drift_acceleration"]
            pct_24 = row["pct_change_24"]
            dist_limit = row["distance_to_limit"]
            safety_slope = row["safety_slope"]
            z_score = row["lot_zscore_24"]

            # Physical classification logic:
            # 1. Check if current value already violates limit
            current_val = v96 if pd.notnull(v96) else v24
            if current_val >= max_limit:
                p_state = "HIGH RISK"
                p_evidence = f"{param} ({current_val:.2f}) has breached hard engineering limit ({max_limit:.2f})."
            
            # 2. Check for runaway acceleration towards limit
            elif accel > CONFIG.acceleration_warning_threshold and drift_rate_24 > 0:
                if dist_limit < (max_limit * 0.3) or drift_rate_96 > safety_slope:
                    p_state = "HIGH RISK"
                    p_evidence = f"Accelerating degradation (+{accel:.5f}/h²) with acute limit proximity ({dist_limit:.2f} {spec.unit if spec else ''} margin remaining)."
                else:
                    p_state = "ACCELERATING"
                    p_evidence = f"Non-linear wearout detected: drift rate increased from {drift_rate_24:.4f} to {drift_rate_96:.4f} (accel: +{accel:.5f}/h²)."

            # 3. Check for steady linear drift
            elif abs(drift_rate_24) > 0.02 or pct_24 > 15.0 or abs(z_score) > 2.2:
                # Distinguish if erratic / unstable
                if pd.notnull(v96) and ((v24 - v0) * (v96 - v24) < -0.2): # Direction reversal / erratic oscillation
                    p_state = "UNSTABLE"
                    p_evidence = f"Erratic trajectory detected: direction flipped from {v0:.2f}->{v24:.2f} to {v24:.2f}->{v96:.2f}."
                else:
                    p_state = "DRIFTING"
                    p_evidence = f"Monotonic drift: {pct_24:+.1f}% shift at 24h (rate: {drift_rate_24:+.4f}/h, Z: {z_score:+.2f})."

            # 4. Otherwise stable / normal
            else:
                p_state = "NORMAL"
                p_evidence = f"Stable telemetry ({pct_24:+.1f}% drift, acceleration within thermal noise boundary)."

            param_behaviours[param] = {
                "state": p_state,
                "drift_rate_24": round(float(drift_rate_24), 5),
                "drift_rate_96": round(float(drift_rate_96), 5),
                "drift_acceleration": round(float(accel), 6),
                "distance_to_limit": round(float(dist_limit), 3),
                "safety_slope": round(float(safety_slope), 5),
                "evidence": p_evidence
            }

            # Update overall component state
            sev = state_severity[p_state]
            if sev > state_severity[worst_state]:
                worst_state = p_state
            if sev > max_driver_severity:
                max_driver_severity = sev
                primary_driver = param

            if p_state != "NORMAL":
                evidence_points.append(f"{param}: {p_evidence}")

        # If overall ensemble anomaly score is very high (>0.8) and state is still normal, elevate to DRIFTING
        ens_score = anomaly_scores.get(comp_id, 0.0)
        if ens_score > 0.80 and worst_state == "NORMAL":
            worst_state = "DRIFTING"
            evidence_points.append(f"Elevated ensemble anomaly score ({ens_score:.2f}) indicates subtle multi-parameter divergence.")

        # Trajectory type for UI visualization indicator
        trajectory_type = "stable"
        if worst_state in ["HIGH RISK", "ACCELERATING"]:
            trajectory_type = "accelerating degradation"
        elif worst_state in ["DRIFTING", "UNSTABLE"]:
            trajectory_type = "increasing drift"

        fingerprint = {
            "component_id": comp_id,
            "lot_id": lot_id,
            "overall_state": worst_state,
            "trajectory_type": trajectory_type,
            "primary_driver": primary_driver,
            "parameter_behaviours": param_behaviours,
            "summary_evidence": " | ".join(evidence_points) if evidence_points else "All monitored parameters exhibit stable, nominal burn-in behavior."
        }
        return fingerprint
