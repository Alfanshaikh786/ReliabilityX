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
from __future__ import annotations
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
        predictions: List[Dict[str, Any]],
        test_system_status: Optional[str] = "NOMINAL"
    ) -> Dict[str, Any]:
        """
        Calculates transparent risk level, multi-frame evidence breakdown, and rules fired.
        Distinguishes intrinsic component degradation from test-system / instrument anomalies.
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
        max_prob_breach = 0.0

        for _, row in comp_feats.iterrows():
            param = row["parameter_name"]
            spec = self.specs.get(param)
            limit = spec.max_limit if spec else 999.0
            val_now = float(row.get("val_96h")) if pd.notnull(row.get("val_96h")) else float(row.get("val_24h", 0.0))
            
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
            pb = p.get("probability_of_limit_breach")
            if pb is not None and pb > max_prob_breach:
                max_prob_breach = pb

        ens_anomaly = anomaly_scores.get("normalized_score", 0.0)
        overall_state = behaviour_fingerprint.get("overall_state", "NORMAL")

        # Check safety slope flag and evidence completeness from predictions
        has_slope_exceeded = any(p.get("slope_exceeded", False) for p in predictions)
        has_insufficient_evidence = any(p.get("prediction_status") in ["INSUFFICIENT_EVIDENCE", "FORECAST_UNAVAILABLE"] for p in predictions)
        has_data_quality_issue = False

        # Check feature-level completeness and data quality
        if features is None or len(features) == 0:
            has_insufficient_evidence = True
        else:
            for _, r in features.iterrows():
                if r.get("data_quality_issue") or (pd.notnull(r.get("is_valid")) and r.get("is_valid") == 0):
                    has_data_quality_issue = True
                if pd.isnull(r.get("val_0h")) and pd.isnull(r.get("val_24h")):
                    has_insufficient_evidence = True

        # Check statistical detector status (unavailable or fallback should not be treated as normal)
        det_status = anomaly_scores.get("detector_status", "ACTIVE")
        detector_unavailable = det_status in ["UNAVAILABLE", "INSUFFICIENT_STATISTICAL_SUPPORT"]

        is_sensor_flatline = (overall_state == "UNSTABLE" and max_drift_rate < 0.0001)

        # -------------------------------------------------------------
        # Transparent Rule Ladder (Never overrides hard official specs!)
        # -------------------------------------------------------------
        is_instrument_issue = (test_system_status == "TEST_SYSTEM_ANOMALY")
        
        # Rule 1: Hard datasheet limit violation at current stage (Authoritative)
        if max_limit_breach_now:
            rules_fired.append(f"RULE-01 [HARD LIMIT]: Current measurement in {worst_param} exceeds specification limit.")
            decision = "HIGH RISK"
            priority_score = 100.0

        # Rule 0: Test-System / Sensor Health Anomaly (Phase 5)
        # If common-mode test-equipment anomaly is active, avoid false scrap classification
        elif is_instrument_issue:
            rules_fired.append(
                "RULE-00 [INSTRUMENT ANOMALY]: Synchronized cross-component shift detected across test channel/lot. "
                "Engineering investigation of test fixture, DAQ, or thermal chamber required before condemning unit."
            )
            decision = "REVIEW"
            priority_score = 60.0

        # Rule 2: High statistical likelihood of limit breach at 168h (P90 worst case exceeds limit)
        elif max_p90_breach or max_nominal_pred_breach or max_prob_breach > 0.75:
            rules_fired.append(
                f"RULE-02 [FORECAST BREACH]: Projected 168h trajectory or P90 bound exceeds engineering limit "
                f"(breach probability: {max_prob_breach*100.0:.1f}%)."
            )
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

        # Rule 8: Predicted drift rate exceeds allowable safety slope (ReliabilityX engineering safety-margin heuristic)
        elif has_slope_exceeded:
            rules_fired.append(
                "RULE-08 [SAFETY SLOPE]: Projected 168h drift rate exceeds calculated boundary safety slope. "
                "Engineering review recommended."
            )
            decision = "REVIEW"
            priority_score = 62.0

        # Rule 6: Monotonic drift or moderate lot deviation
        elif overall_state in ["DRIFTING", "UNSTABLE"] or ens_anomaly >= 0.45 or max_z_score >= 2.0:
            rules_fired.append(f"RULE-06 [DRIFT MONITOR]: Monotonic drift rate or moderate lot deviation (Z={max_z_score:.1f}σ).")
            decision = "WATCH"
            priority_score = 30.0 + ens_anomaly * 10.0

        # Rule 9: Data quality issue check
        elif has_data_quality_issue:
            rules_fired.append("RULE-09 [DATA QUALITY]: Corrupted, non-monotonic, or invalid telemetry packet detected. Data quality audit required.")
            decision = "WATCH"
            priority_score = 25.0

        # Rule 10: Insufficient evidence check
        elif has_insufficient_evidence:
            rules_fired.append("RULE-10 [INSUFFICIENT EVIDENCE]: Incomplete temporal checkpoints or baseline measurements. Monitoring required.")
            decision = "WATCH"
            priority_score = 20.0

        # Rule 11: Statistical detector unavailable (must not silently claim nominal)
        elif detector_unavailable:
            rules_fired.append(f"RULE-11 [STATISTICAL SUPPORT]: Anomaly detector status '{det_status}'. Insufficient statistical baseline; cannot confirm nominal status.")
            decision = "WATCH"
            priority_score = 18.0

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
            "prediction_risk": "High" if (max_p90_breach or max_nominal_pred_breach or max_prob_breach > 0.75) else ("Medium" if max_dist_to_limit_ratio < 0.3 else "Low"),
            "limit_proximity": "High" if max_dist_to_limit_ratio < 0.2 else ("Medium" if max_dist_to_limit_ratio < 0.5 else "Low"),
            "behaviour_state": overall_state,
            "test_system_status": test_system_status or "NOMINAL",
            "detector_status": det_status
        }

        disposition_map = {
            "PASS": "No abnormal behaviour detected by ReliabilityX; subject to applicable engineering requirements.",
            "WATCH": "Monitoring recommended.",
            "REVIEW": "Engineering review recommended.",
            "HIGH RISK": "Engineering investigation / disposition required."
        }

        # Count parameters showing elevated behavior
        comp_feats = features[features["component_id"] == comp_id] if features is not None else pd.DataFrame()
        anom_params_count = 0
        for _, r in comp_feats.iterrows():
            z_val = abs(r.get("lot_zscore_24", 0.0))
            d_val = abs(r.get("drift_rate_24", 0.0))
            a_val = abs(r.get("drift_acceleration", 0.0))
            if z_val >= 2.0 or d_val >= 0.01 or a_val > CONFIG.acceleration_warning_threshold:
                anom_params_count += 1

        # Distinct 9-State Engineering Anomaly & Triage Classification (SIH26170 Requirement 7-9)
        if max_limit_breach_now:
            anomaly_class = "COMPONENT_DEGRADATION"
        elif has_data_quality_issue:
            anomaly_class = "DATA_QUALITY_ISSUE"
        elif is_instrument_issue:
            anomaly_class = "TEST_SYSTEM_ANOMALY"
        elif test_system_status in ["LOT_SYSTEMIC_ANOMALY", "LOT_SYSTEMIC_SHIFT"]:
            anomaly_class = "LOT_SYSTEMIC_ANOMALY"
        elif is_sensor_flatline:
            anomaly_class = "SENSOR_ANOMALY"
        elif has_insufficient_evidence or detector_unavailable:
            anomaly_class = "INSUFFICIENT_EVIDENCE"
        elif anom_params_count >= 2:
            anomaly_class = "CORRELATED_MULTIPARAMETER_DEGRADATION"
        elif max_nominal_pred_breach or max_p90_breach or max_accel > CONFIG.acceleration_warning_threshold or has_slope_exceeded:
            anomaly_class = "COMPONENT_DEGRADATION"
        elif ens_anomaly >= 0.70 or max_z_score >= 3.0:
            anomaly_class = "LOT_RELATIVE_ANOMALY"
        elif overall_state in ["DRIFTING", "UNSTABLE"]:
            anomaly_class = "COMPONENT_DEGRADATION"
        else:
            anomaly_class = "NOMINAL_STABLE"

        return {
            "component_id": comp_id,
            "lot_id": lot_id,
            "risk_level": decision,
            "anomaly_classification": anomaly_class,
            "priority_score": round(priority_score, 2),
            "rules_fired": rules_fired,
            "evidence_breakdown": evidence_breakdown,
            "worst_parameter": worst_param,
            "test_system_status": test_system_status or "NOMINAL",
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
                    "affected_count": 0,
                    "dominant_abnormal_param": None
                }

            l = lots_dict[lid]
            l["total_components"] += 1
            risk = c["risk_level"]
            is_anom = risk in ["REVIEW", "HIGH RISK"]
            is_accel = c.get("evidence_breakdown", {}).get("acceleration_severity") in ["High", "Medium"]
            is_drift = c.get("evidence_breakdown", {}).get("drift_severity") in ["High", "Medium"]

            if risk == "PASS":
                l["pass_count"] += 1
            elif risk == "WATCH":
                l["watch_count"] += 1
            elif risk == "REVIEW":
                l["review_count"] += 1
            elif risk == "HIGH RISK":
                l["high_risk_count"] += 1

            if is_accel:
                l["accelerating_count"] += 1
            if is_drift:
                l["drifting_count"] += 1
            if is_anom or is_accel or is_drift:
                l["affected_count"] += 1

        # Classify Lot-Level Taxonomy (Phase 5 & 7):
        # 1. Individual component anomaly
        # 2. Small cluster anomaly
        # 3. Lot-wide shift (LOT_SYSTEMIC_SHIFT)
        # 4. Possible test-system / common-mode anomaly (TEST_SYSTEM_ANOMALY)
        for lid, l in lots_dict.items():
            tot = l["total_components"] or 1
            anom_pct = ((l["review_count"] + l["high_risk_count"]) / tot) * 100.0
            l["anomaly_percentage"] = round(anom_pct, 1)
            accel_pct = (l["accelerating_count"] / tot) * 100.0
            drift_pct = (l["drifting_count"] / tot) * 100.0
            affected_ratio = l["affected_count"] / tot

            # Check for common-mode test system / sensor shift across >= 70% of lot (uniform shift, non-accelerating)
            if affected_ratio >= CONFIG.test_system_shift_ratio and tot >= 5 and l["accelerating_count"] < 3:
                l["is_test_system_anomaly"] = True
                l["is_lot_wide_pattern"] = True
                l["lot_pattern_type"] = "TEST_SYSTEM_ANOMALY"
                l["pattern_description"] = (
                    f"POSSIBLE TEST-SYSTEM / SENSOR HEALTH ANOMALY: Synchronized shift observed across "
                    f"{affected_ratio * 100.0:.1f}% of monitored units in {lid}. Recommend verifying thermal chamber stability, "
                    f"ATE probe contact resistance, and DAQ calibration before dispositioning units."
                )
                l["lot_health_trend"] = "INSTRUMENT_CHECK"
            # Check for lot systemic shift (>= 30% correlated wearout or >= 15% acceleration)
            elif (drift_pct + accel_pct) >= (CONFIG.lot_systemic_shift_ratio * 100.0) or (accel_pct >= 15.0 and l["accelerating_count"] >= 3) or affected_ratio >= 0.30:
                l["is_test_system_anomaly"] = False
                l["is_lot_wide_pattern"] = True
                l["lot_pattern_type"] = "LOT_SYSTEMIC_SHIFT"
                aff_cnt = l["affected_count"]
                l["pattern_description"] = (
                    f"LOT SYSTEMIC SHIFT: Correlated directional drift / wearout identified across "
                    f"{max(drift_pct, accel_pct, affected_ratio * 100.0):.1f}% of units in {lid} ({aff_cnt} components affected by lot-systemic shift — lot investigation recommended). "
                    f"Wafer-level process variation or batch contamination suspected."
                )
                l["systemic_summary_message"] = (
                    f"{aff_cnt} components affected by lot-systemic shift — lot investigation recommended."
                )
                l["lot_health_trend"] = "COMPROMISED"
            elif l["high_risk_count"] > 0 or l["review_count"] > 0:
                l["is_test_system_anomaly"] = False
                l["is_lot_wide_pattern"] = False
                l["lot_pattern_type"] = "ISOLATED_COMPONENT_ANOMALY"
                l["pattern_description"] = (
                    f"ISOLATED COMPONENT ANOMALY: Suspicious degradation localized to "
                    f"{l['high_risk_count'] + l['review_count']} individual unit(s) in lot of {tot}. "
                    f"Bulk lot population ({tot - (l['high_risk_count'] + l['review_count'])} units) remains nominal."
                )
                l["lot_health_trend"] = "MODERATE"
            else:
                l["is_test_system_anomaly"] = False
                l["is_lot_wide_pattern"] = False
                l["lot_pattern_type"] = "HEALTHY_LOT"
                l["pattern_description"] = f"HEALTHY LOT: All {tot} units exhibit stable lot-relative and temporal behavior."
                l["lot_health_trend"] = "HEALTHY"

            l["dominant_abnormal_param"] = "leakage_current_uA"

        return lots_dict

