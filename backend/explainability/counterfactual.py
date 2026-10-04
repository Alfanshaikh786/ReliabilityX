"""
Counterfactual & What-If Analysis Engine for ReliabilityX
Calculates engineering margin limits and drift boundaries:
"To remain below the configured limit of 20.0 µA at 168h, the component's future drift rate must remain below X µA/h."
Purely engineering decision support; does not simulate physical prevention.
"""
from __future__ import annotations
from typing import Dict, Any, List
from backend.core.config import DEFAULT_PARAMETER_SPECS, ParameterSpec


class CounterfactualEngine:
    def __init__(self, specs: Dict[str, ParameterSpec] = None):
        self.specs = specs or DEFAULT_PARAMETER_SPECS

    def analyze_what_if(
        self,
        current_value: float,
        current_hour: float,
        current_drift_rate: float,
        parameter_name: str,
        target_limit: float = None
    ) -> Dict[str, Any]:
        """
        Computes maximum allowable future drift rate and sensitivity analysis.
        """
        spec = self.specs.get(parameter_name)
        limit = target_limit if target_limit is not None else (spec.max_limit if spec else 20.0)
        unit = spec.unit if spec else "units"

        remaining_hours = max(1.0, 168.0 - current_hour)
        headroom = limit - current_value

        if headroom <= 0:
            max_allowed_rate = 0.0
            is_already_breached = True
            margin_status = "BREACHED"
            recommendation = (
                f"Parameter has already reached or exceeded the engineering limit ({limit:.2f} {unit}). "
                "Component cannot recover within specification."
            )
        else:
            is_already_breached = False
            max_allowed_rate = headroom / remaining_hours
            rate_ratio = current_drift_rate / max_allowed_rate if max_allowed_rate > 0 else 999.0

            if rate_ratio > 1.0:
                margin_status = "INSUFFICIENT_MARGIN"
                recommendation = (
                    f"Current drift rate ({current_drift_rate:.4f} {unit}/h) exceeds the critical safety threshold "
                    f"({max_allowed_rate:.4f} {unit}/h). At this velocity, the component is projected to breach the "
                    f"limit before 168h."
                )
            elif rate_ratio > 0.70:
                margin_status = "NARROW_MARGIN"
                recommendation = (
                    f"To remain below the limit ({limit:.2f} {unit}), future drift rate must remain below "
                    f"{max_allowed_rate:.4f} {unit}/h. Current drift is at {rate_ratio * 100:.0f}% of this critical threshold."
                )
            else:
                margin_status = "HEALTHY_MARGIN"
                recommendation = (
                    f"Headroom of {headroom:.2f} {unit} remains. Future drift rate can reach up to "
                    f"{max_allowed_rate:.4f} {unit}/h before violating the 168h specification."
                )

        # Resulting estimated trajectory curve under assumed drift
        resulting_trajectory = [
            {"hour": current_hour, "value": round(current_value, 3)},
            {"hour": 168.0, "value": round(current_value + current_drift_rate * remaining_hours, 3)}
        ]

        return {
            "parameter_name": parameter_name,
            "current_value": round(current_value, 3),
            "current_hour": current_hour,
            "remaining_hours": remaining_hours,
            "engineering_limit": round(limit, 3),
            "headroom": round(headroom, 3),
            "current_drift_rate": round(current_drift_rate, 4),
            "max_allowable_drift_rate": round(max_allowed_rate, 4),
            "margin_status": margin_status,
            "is_already_breached": is_already_breached,
            "calculation_type": "MATHEMATICAL_SENSITIVITY_ANALYSIS",
            "assumptions": "Linear velocity extrapolation from current screening checkpoint under constant thermal stress conditions.",
            "disclaimer": "Mathematical engineering sensitivity calculation under stated model assumptions, not a guaranteed physical outcome.",
            "resulting_trajectory": resulting_trajectory,
            "engineering_guidance": recommendation
        }
