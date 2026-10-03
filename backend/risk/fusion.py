"""
Risk Fusion Engine, Decision Logic, & Inspection Priority Ranker
Harmonizes all diagnostic pathways:
- Lot anomaly score (DPAT / Z-score)
- Multivariate anomaly score (Isolation Forest / Mahalanobis / LOF)
- Drift rate score
- Acceleration score
- 168h prediction risk & P90 worst-case
- Uncertainty margin
- Engineering limit proximity

Produces:
1. Decision: PASS, WATCH, REVIEW, HIGH RISK
2. Explicit 'rules_fired' list for 100% test-to-decision auditability
3. Inspection Priority Ranking (Priority 1, 2, 3...)
4. Lot Health pattern detection (Isolated Component vs Lot-Wide Systematic Defect)
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS, ParameterSpec


class RiskFusionEngine:
    def __init__(self, specs: Dict[str, ParameterSpec] = None):
        self.specs = specs or DEFAULT_PARAMETER_SPECS

    def assess_component_risk(
        self,
        comp_id: str,
        lot_id: str,
        features: pd.DataFrame,
        anomaly_scores: Dict[str, Any],
        behaviour_fingerprint: Dict[str, Any],
        predictions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates transparent risk level, evidence breakdown, and rules fired.
        """
        rules_fired = []
        comp_feats = features[features["component_id"] == comp_id]

        # Extract telemetry features
        max_limit_breach_now = False
        max_p90_breach = False
        max_nominal_pred_breach = False
        max_dist_to_limit_ratio = 1.0
        worst_param = None
        max_accel = 0.0
        max_drift_rate = 0.0
        max_z_score = 0.0

        for _, row in comp_feats.iterrows():
            param = row["parameter_name"]
            spec = self.specs.get(param)
            limit = spec.max_limit if spec else 999.0
            val_now = row["val_96h"] if pd.notnull(row["val_96h"]) else row["val_24h"]
            
            if val_now >= limit:
                max_limit_breach_now = True
                worst_param = param
                
            dist_ratio = (limit - val_now) / limit if limit > 0 else 1.0
            if dist_ratio < max_dist_to_limit_ratio:
                max_dist_to_limit_ratio = dist_ratio
                worst_param = param

            accel = row.get("drift_acceleration", 0.0)
            if accel > max_accel:
                max_accel = accel
                
            dr = abs(row.get("drift_rate_24", 0.0))
            if dr > max_drift_rate:
                max_drift_rate = dr

            z = abs(row.get("lot_zscore_24", 0.0))
            if z > max_z_score:
                max_z_score = z

        for p in predictions:
            if p.get("is_p90_breach"):
                max_p90_breach = True
            if p.get("is_nominal_breach"):
                max_nominal_pred_breach = True

        ens_anomaly = anomaly_scores.get("normalized_score", 0.0)
        overall_state = behaviour_fingerprint.get("overall_state", "NORMAL")

        # -------------------------------------------------------------
        # Transparent Rule Ladder (Never overrides hard official specs!)
        # -------------------------------------------------------------
        
        # Rule 1: Hard datasheet limit violation at current stage
        if max_limit_breach_now:
            rules_fired.append(f"RULE-01 [HARD LIMIT]: Current measurement in {worst_param} exceeds specification limit.")
            decision = "HIGH RISK"
            priority_score = 100.0

        # Rule 2: High statistical likelihood of limit breach at 168h (P90 worst case exceeds limit)
        elif max_p90_breach or max_nominal_pred_breach:
            rules_fired.append("RULE-02 [FORECAST BREACH]: Projected 168h worst-case boundary (P90) exceeds engineering specification.")
            decision = "HIGH RISK"
            priority_score = 85.0 + (1.0 - max(0.0, max_dist_to_limit_ratio)) * 10.0

        # Rule 3: Non-linear accelerating degradation approaching boundary
        elif max_accel > CONFIG.acceleration_warning_threshold and max_dist_to_limit_ratio < 0.35:
            rules_fired.append(f"RULE-03 [ACCELERATION DANGER]: Positive wearout acceleration (+{max_accel:.5f}/h²) within narrow limit margin.")
            decision = "HIGH RISK"
            priority_score = 80.0

        # Rule 4: Accelerating drift or elevated multivariate anomaly
        elif max_accel > CONFIG.acceleration_warning_threshold:
            rules_fired.append(f"RULE-04 [ACCELERATING DEGRADATION]: Non-linear drift acceleration detected (+{max_accel:.5f}/h²).")
            decision = "REVIEW"
            priority_score = 65.0 + max_accel * 5000.0

        # Rule 5: Significant lot-relative anomaly or high ensemble score
        elif ens_anomaly >= 0.70 or max_z_score >= 3.0:
            rules_fired.append(f"RULE-05 [LOT ANOMALY]: Multi-detector ensemble anomaly elevated ({ens_anomaly:.2f}) or Z-score > 3.0σ.")
            decision = "REVIEW"
            priority_score = 55.0 + ens_anomaly * 15.0

        # Rule 6: Monotonic drift or moderate lot deviation
        elif overall_state in ["DRIFTING", "UNSTABLE"] or ens_anomaly >= 0.45 or max_z_score >= 2.0:
            rules_fired.append(f"RULE-06 [DRIFT MONITOR]: Monotonic drift rate or moderate lot deviation (Z={max_z_score:.1f}σ).")
            decision = "WATCH"
            priority_score = 30.0 + ens_anomaly * 10.0

        # Rule 7: Nominal stable behavior
        else:
            rules_fired.append("RULE-07 [NOMINAL]: All telemetry parameters consistent with healthy lot population.")
            decision = "PASS"
            priority_score = 5.0 + ens_anomaly * 5.0

        # Categorized Evidence Breakdown
        def categorize_score(val, low_th=0.3, high_th=0.65):
            if val >= high_th:
                return "High"
            elif val >= low_th:
                return "Medium"
            return "Low"

        evidence_breakdown = {
            "lot_anomaly": categorize_score(max_z_score / 3.5),
            "multivariate_anomaly": categorize_score(ens_anomaly),
            "drift_severity": categorize_score(max_drift_rate / 0.08),
            "acceleration_severity": "High" if max_accel > CONFIG.acceleration_alarm_threshold else ("Medium" if max_accel > CONFIG.acceleration_warning_threshold else "Low"),
            "prediction_risk": "High" if (max_p90_breach or max_nominal_pred_breach) else ("Medium" if max_dist_to_limit_ratio < 0.3 else "Low"),
            "limit_proximity": "High" if max_dist_to_limit_ratio < 0.2 else ("Medium" if max_dist_to_limit_ratio < 0.5 else "Low"),
            "behaviour_state": overall_state
        }

        disposition_map = {
            "PASS": "No abnormal behaviour detected by ReliabilityX; subject to applicable engineering requirements.",
            "WATCH": "Monitoring recommended.",
            "REVIEW": "Engineering review recommended.",
            "HIGH RISK": "Engineering investigation / disposition required."
        }

        return {
            "component_id": comp_id,
            "lot_id": lot_id,
            "risk_level": decision,
            "priority_score": round(priority_score, 2),
            "rules_fired": rules_fired,
            "evidence_breakdown": evidence_breakdown,
            "worst_parameter": worst_param,
            "disposition_recommendation": disposition_map.get(decision, "Engineering review recommended.")
        }

    def generate_inspection_priorities(self, assessed_components: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sorts components by priority score and assigns Priority 1, Priority 2...
        with explicit human-readable engineering rationale.
        """
        # Sort descending by priority score
        sorted_comps = sorted(assessed_components, key=lambda x: x["priority_score"], reverse=True)
        ranked = []
        
        for rank, comp in enumerate(sorted_comps, start=1):
            c_copy = dict(comp)
            c_copy["inspection_priority"] = rank
            
            # Formulate concise priority reason
            reasons = []
            ev = comp.get("evidence_breakdown", {})
            if ev.get("acceleration_severity") in ["High", "Medium"]:
                reasons.append("accelerating drift")
            if ev.get("prediction_risk") == "High" or ev.get("limit_proximity") == "High":
                reasons.append("predicted limit proximity")
            if ev.get("multivariate_anomaly") == "High":
                reasons.append("multivariate correlation shift")
            if ev.get("lot_anomaly") == "High":
                reasons.append("abnormal lot deviation")

            c_copy["priority_reason"] = " + ".join(reasons) if reasons else "Nominal screening queue"
            ranked.append(c_copy)
            
        return ranked

    def evaluate_lot_health(self, components: List[Dict[str, Any]], features_df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """
        Detects whether an issue is an ISOLATED COMPONENT or a LOT-WIDE PATTERN.
        e.g., '7 of 25 components in LOT-2411C show similar leakage-current acceleration.'
        """
        lots_dict = {}
        for c in components:
            lid = c["lot_id"]
            if lid not in lots_dict:
                lots_dict[lid] = {
                    "lot_id": lid,
                    "total_components": 0,
                    "pass_count": 0,
                    "watch_count": 0,
                    "review_count": 0,
                    "high_risk_count": 0,
                    "accelerating_count": 0,
                    "drifting_count": 0,
                    "dominant_abnormal_param": None
                }

            l = lots_dict[lid]
            l["total_components"] += 1
            risk = c["risk_level"]
            if risk == "PASS":
                l["pass_count"] += 1
            elif risk == "WATCH":
                l["watch_count"] += 1
            elif risk == "REVIEW":
                l["review_count"] += 1
            elif risk == "HIGH RISK":
                l["high_risk_count"] += 1

            if c.get("evidence_breakdown", {}).get("acceleration_severity") in ["High", "Medium"]:
                l["accelerating_count"] += 1
            if c.get("evidence_breakdown", {}).get("drift_severity") in ["High", "Medium"]:
                l["drifting_count"] += 1

        # Classify Lot-Wide Pattern vs Isolated Anomaly
        for lid, l in lots_dict.items():
            tot = l["total_components"] or 1
            anom_pct = ((l["review_count"] + l["high_risk_count"]) / tot) * 100.0
            l["anomaly_percentage"] = round(anom_pct, 1)

            # Check if systematic
            accel_pct = (l["accelerating_count"] / tot) * 100.0
            if l["accelerating_count"] >= 4 and accel_pct >= 15.0:
                l["is_lot_wide_pattern"] = True
                l["pattern_description"] = (
                    f"CRITICAL LOT-WIDE PATTERN: {l['accelerating_count']} of {tot} components ({accel_pct:.1f}%) "
                    "exhibit correlated wearout acceleration. Indicates wafer-level fabrication or thermal screening defect."
                )
                l["lot_health_trend"] = "COMPROMISED"
            elif l["high_risk_count"] > 0 or l["review_count"] > 0:
                l["is_lot_wide_pattern"] = False
                l["pattern_description"] = (
                    f"ISOLATED COMPONENT ANOMALY: Issues confined to {l['high_risk_count'] + l['review_count']} individual "
                    f"unit(s) in lot of {tot}. Nominal lot population remains sound."
                )
                l["lot_health_trend"] = "MODERATE"
            else:
                l["is_lot_wide_pattern"] = False
                l["pattern_description"] = "HEALTHY LOT: All units exhibit nominal statistical behavior."
                l["lot_health_trend"] = "HEALTHY"

            l["dominant_abnormal_param"] = "leakage_current_uA"

        return lots_dict
