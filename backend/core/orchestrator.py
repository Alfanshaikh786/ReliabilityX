"""
End-to-End ReliabilityX Screening Pipeline Orchestrator
Executes the full 8-stage engineering screening workflow:
1. Data Ingestion & Immutability Staging
2. Data Quality & Sensor Validation
3. Physics & Lot-Relative Feature Engineering
4. Layered Anomaly Detection (DPAT + IsoForest + Mahalanobis + LOF)
5. Time-Series Drift & Acceleration Behaviour Analysis
6. 168h Forecast & Uncertainty Quantification (Model Ladder)
7. Risk Fusion & Rule-Based Screening Decision
8. Lot Health & Inspection Priority Ranking
"""
from __future__ import annotations
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS
from backend.core.db import get_db_connection, init_db, log_audit
from backend.data.validator import DataQualityEngine
from backend.features.engineer import FeatureEngineeringEngine
from backend.anomaly.ensemble import AnomalyEnsembleEngine
from backend.timeseries.behaviour import BehaviourEngine
from backend.prediction.forecaster import FuturePredictionEngine
from backend.prediction.evaluator import ModelEvaluator
from backend.explainability.explainer import ExplainabilityEngine
from backend.explainability.counterfactual import CounterfactualEngine
from backend.risk.fusion import RiskFusionEngine


class PipelineOrchestrator:
    def __init__(self, db_path: str = CONFIG.db_path):
        self.db_path = db_path
        init_db(self.db_path)
        self.validator = DataQualityEngine()
        self.feature_engine = FeatureEngineeringEngine()
        self.anomaly_engine = AnomalyEnsembleEngine()
        self.behaviour_engine = BehaviourEngine()
        self.prediction_engine = FuturePredictionEngine()
        self.risk_engine = RiskFusionEngine()
        self.counterfactual_engine = CounterfactualEngine()

    def run_pipeline(
        self,
        raw_df: pd.DataFrame,
        dataset_id: str,
        dataset_name: str,
        dataset_mode: str, # 'demo' or 'user_uploaded'
        filename: str = None,
        ground_truth: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end pipeline, commits results to database,
        and returns dashboard-ready summary.
        """
        start_time = datetime.utcnow()
        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()

        # STAGE 1 & 2: Validation & Data Quality
        clean_df, quality_summary = self.validator.validate_and_clean(raw_df)

        # Deactivate previous active datasets
        cursor.execute("UPDATE datasets SET is_active = 0")

        # Save Dataset record
        cursor.execute("""
        INSERT OR REPLACE INTO datasets (id, name, mode, filename, row_count, component_count, lot_count, quality_summary_json, created_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            dataset_id,
            dataset_name,
            dataset_mode,
            filename or "demo_physics_stream.csv",
            quality_summary["rows_received"],
            quality_summary["components_processed"],
            quality_summary["lots_processed"],
            json.dumps(quality_summary),
            start_time.isoformat()
        ))

        # Clear previous records for this dataset_id if re-running
        cursor.execute("DELETE FROM measurements WHERE dataset_id = ?", (dataset_id,))
        cursor.execute("DELETE FROM features WHERE dataset_id = ?", (dataset_id,))
        cursor.execute("DELETE FROM anomaly_results WHERE dataset_id = ?", (dataset_id,))
        cursor.execute("DELETE FROM predictions WHERE dataset_id = ?", (dataset_id,))
        cursor.execute("DELETE FROM components WHERE dataset_id = ?", (dataset_id,))
        cursor.execute("DELETE FROM lots WHERE dataset_id = ?", (dataset_id,))
        cursor.execute("DELETE FROM model_metrics WHERE dataset_id = ?", (dataset_id,))

        # Save measurements to database
        measurement_records = []
        for _, row in clean_df.iterrows():
            measurement_records.append((
                str(row["component_id"]),
                str(row["lot_id"]),
                dataset_id,
                str(row["test_stage"]),
                float(row["timestamp"]),
                str(row["parameter_name"]),
                float(row["raw_value"]),
                float(row["processed_value"]),
                int(row["is_valid"]),
                int(row.get("noise_flag", 0)),
                str(row.get("source_record_id", ""))
            ))
        cursor.executemany("""
        INSERT INTO measurements (component_id, lot_id, dataset_id, test_stage, timestamp_hours, parameter_name, raw_value, processed_value, is_valid, noise_flag, source_record_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, measurement_records)

        # STAGE 3: Feature Engineering
        features_df, lot_stats = self.feature_engine.extract_features(clean_df)

        # Save features
        feature_records = []
        for _, row in features_df.iterrows():
            feature_records.append((
                str(row["component_id"]),
                dataset_id,
                str(row["parameter_name"]),
                float(row["val_0h"]) if pd.notnull(row["val_0h"]) else None,
                float(row["val_24h"]) if pd.notnull(row["val_24h"]) else None,
                float(row["val_96h"]) if pd.notnull(row["val_96h"]) else None,
                float(row["val_168h"]) if pd.notnull(row["val_168h"]) else None,
                float(row["delta_0_24"]) if pd.notnull(row["delta_0_24"]) else None,
                float(row["delta_24_96"]) if pd.notnull(row["delta_24_96"]) else None,
                float(row["delta_96_168"]) if pd.notnull(row["delta_96_168"]) else None,
                float(row["pct_change_24"]) if pd.notnull(row["pct_change_24"]) else None,
                float(row["pct_change_168"]) if pd.notnull(row["pct_change_168"]) else None,
                float(row["drift_rate_24"]) if pd.notnull(row["drift_rate_24"]) else None,
                float(row["drift_rate_96"]) if pd.notnull(row["drift_rate_96"]) else None,
                float(row["drift_acceleration"]) if pd.notnull(row["drift_acceleration"]) else None,
                float(row["lot_zscore_24"]) if pd.notnull(row["lot_zscore_24"]) else None,
                float(row["robust_zscore_24"]) if pd.notnull(row["robust_zscore_24"]) else None,
                float(row["distance_to_limit"]) if pd.notnull(row["distance_to_limit"]) else None,
                float(row["rate_of_approach"]) if pd.notnull(row["rate_of_approach"]) else None,
                float(row["safety_slope"]) if pd.notnull(row["safety_slope"]) else None
            ))
        cursor.executemany("""
        INSERT INTO features (component_id, dataset_id, parameter_name, val_0h, val_24h, val_96h, val_168h, delta_0_24, delta_24_96, delta_96_168, pct_change_24, pct_change_168, drift_rate_24, drift_rate_96, drift_acceleration, lot_zscore_24, robust_zscore_24, distance_to_limit, rate_of_approach, safety_slope)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, feature_records)

        # STAGE 4: Layered Anomaly Detection
        ensemble_df, anomaly_records_all = self.anomaly_engine.run_all(features_df)
        
        # Save anomaly records
        cursor.executemany("""
        INSERT INTO anomaly_results (component_id, dataset_id, detector_name, raw_score, normalized_score, is_anomalous, evidence, detector_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                r["component_id"],
                dataset_id,
                r["detector_name"],
                float(r["raw_score"]) if r["raw_score"] is not None else None,
                float(r["normalized_score"]),
                int(r["is_anomalous"]),
                r["evidence"],
                r["detector_status"]
            )
            for r in anomaly_records_all
        ])

        # STAGE 5: Time-Series Behaviour Analysis
        component_ids = features_df["component_id"].unique()
        anomaly_score_map = {r["component_id"]: r["normalized_score"] for r in ensemble_df.to_dict("records")}

        behaviour_fingerprints = {}
        for cid in component_ids:
            c_feats = features_df[features_df["component_id"] == cid]
            fingerprint = self.behaviour_engine.analyze_component_behaviour(c_feats, anomaly_score_map)
            behaviour_fingerprints[cid] = fingerprint

        # STAGE 6: 168h Future Behaviour Prediction & Uncertainty
        # Check if 96h stage exists in data
        has_96h = clean_df[clean_df["test_stage"] == "96h"].shape[0] > 0
        stage_for_pred = "96h" if has_96h else "24h"
        
        predictions_output, model_ladder = self.prediction_engine.fit_and_predict(
            features_df,
            stage_available=stage_for_pred,
            active_model_name=CONFIG.default_prediction_model
        )

        cursor.executemany("""
        INSERT INTO predictions (component_id, dataset_id, parameter_name, stage_used, model_name, model_version, predicted_168h, uncertainty_std, lower_bound_95, upper_bound_95, p90_worst_case, actual_168h, error_absolute)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                p["component_id"],
                dataset_id,
                p["parameter_name"],
                p["stage_used"],
                p["model_name"],
                p["model_version"],
                p["predicted_168h"],
                p["uncertainty_std"],
                p["lower_bound_95"],
                p["upper_bound_95"],
                p["p90_worst_case"],
                p["actual_168h"],
                p["error_absolute"]
            )
            for p in predictions_output
        ])

        # STAGE 7: Risk Fusion & Engineering Decision
        predictions_by_comp = {}
        for p in predictions_output:
            cid = p["component_id"]
            predictions_by_comp.setdefault(cid, []).append(p)

        anomaly_by_comp = {r["component_id"]: r for r in ensemble_df.to_dict("records")}

        # Phase 5: Check cross-component correlation for common-mode test-system anomalies
        lot_test_status = {}
        for lid, lot_group in features_df.groupby("lot_id"):
            comps_in_lot = lot_group["component_id"].nunique()
            if comps_in_lot >= 5 and "delta_24_96" in lot_group.columns:
                deltas = lot_group["delta_24_96"].dropna()
                if len(deltas) >= comps_in_lot * 0.7:
                    pos_jumps = (deltas > 2.0).sum()
                    neg_jumps = (deltas < -2.0).sum()
                    if max(pos_jumps, neg_jumps) / max(1, comps_in_lot) >= CONFIG.test_system_shift_ratio:
                        lot_test_status[lid] = "TEST_SYSTEM_ANOMALY"
                    else:
                        lot_test_status[lid] = "NOMINAL"
                else:
                    lot_test_status[lid] = "NOMINAL"
            else:
                lot_test_status[lid] = "NOMINAL"

        assessed_components = []
        for cid in component_ids:
            c_feats = features_df[features_df["component_id"] == cid]
            lid = c_feats["lot_id"].iloc[0]
            anom = anomaly_by_comp.get(cid, {"normalized_score": 0.0})
            fp = behaviour_fingerprints[cid]
            c_preds = predictions_by_comp.get(cid, [])
            test_status = lot_test_status.get(lid, "NOMINAL")

            risk_eval = self.risk_engine.assess_component_risk(
                comp_id=cid,
                lot_id=lid,
                features=features_df,
                anomaly_scores=anom,
                behaviour_fingerprint=fp,
                predictions=c_preds,
                test_system_status=test_status
            )
            
            # Explainability synthesis
            explanation = ExplainabilityEngine.generate_explanation(
                comp_id=cid,
                features=features_df,
                anomaly_scores=anom,
                behaviour_fingerprint=fp,
                predictions=c_preds
            )
            
            risk_eval["behaviour_fingerprint"] = fp
            risk_eval["explanation"] = explanation
            assessed_components.append(risk_eval)

        # STAGE 8: Inspection Priority Ranking & Lot Health
        ranked_components = self.risk_engine.generate_inspection_priorities(assessed_components)
        lots_summary = self.risk_engine.evaluate_lot_health(ranked_components, features_df)

        # Save Components
        comp_records = []
        for c in ranked_components:
            cid = c["component_id"]
            comp_records.append((
                cid,
                c["lot_id"],
                dataset_id,
                c["behaviour_fingerprint"]["overall_state"],
                c["risk_level"],
                c["inspection_priority"],
                c["priority_reason"],
                json.dumps(c["rules_fired"]),
                json.dumps(c["behaviour_fingerprint"]),
                json.dumps(c["explanation"]),
                start_time.isoformat()
            ))

        cursor.executemany("""
        INSERT INTO components (component_id, lot_id, dataset_id, current_state, risk_level, inspection_priority, priority_reason, rules_fired_json, behaviour_fingerprint_json, evidence_breakdown_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, comp_records)

        # Save Lots
        lot_records = []
        for lid, l in lots_summary.items():
            lot_records.append((
                lid,
                dataset_id,
                l["total_components"],
                l["pass_count"],
                l["watch_count"],
                l["review_count"],
                l["high_risk_count"],
                l["anomaly_percentage"],
                l.get("avg_drift", 0.0),
                l["accelerating_count"],
                1 if l.get("is_lot_wide_pattern") else 0,
                l.get("pattern_description", ""),
                l.get("dominant_abnormal_param", "leakage_current_uA")
            ))

        cursor.executemany("""
        INSERT INTO lots (lot_id, dataset_id, component_count, pass_count, watch_count, review_count, high_risk_count, anomaly_percentage, avg_drift, accelerating_count, is_lot_wide_pattern, pattern_description, dominant_abnormal_param)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, lot_records)

        # STAGE 9: Model Performance Benchmarking
        if ground_truth:
            perf_metrics = ModelEvaluator.evaluate_performance(
                ground_truth=ground_truth,
                predictions=predictions_output,
                components_table=ranked_components,
                features_df=features_df
            )
            cursor.execute("""
            INSERT INTO model_metrics (dataset_id, model_name, evaluation_timestamp, mae, rmse, r2, precision, recall, f1_score, false_positives, false_negatives, total_defects, confusion_matrix_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dataset_id,
                CONFIG.default_prediction_model,
                datetime.utcnow().isoformat(),
                perf_metrics["regression_metrics"]["mae"],
                perf_metrics["regression_metrics"]["rmse"],
                perf_metrics["regression_metrics"]["r2"],
                perf_metrics["reliabilityx"]["precision"],
                perf_metrics["reliabilityx"]["recall"],
                perf_metrics["reliabilityx"]["f1_score"],
                perf_metrics["reliabilityx"]["fp"],
                perf_metrics["reliabilityx"]["fn"],
                perf_metrics["actual_defects"],
                json.dumps(perf_metrics["reliabilityx"]["confusion_matrix"])
            ))

        conn.commit()
        conn.close()

        # Audit log entry
        log_audit(
            action="RUN_SCREENING_PIPELINE",
            entity_type="DATASET",
            entity_id=dataset_id,
            user_name="SYSTEM_ENGINE",
            details={
                "dataset_name": dataset_name,
                "components": len(ranked_components),
                "lots": len(lots_summary),
                "execution_seconds": (datetime.utcnow() - start_time).total_seconds()
            },
            db_path=self.db_path
        )

        # Sanitize model_ladder for clean JSON serialization
        sanitized_ladder = {}
        for param, m_dict in model_ladder.items():
            sanitized_ladder[param] = {}
            for m_name, m_info in m_dict.items():
                sanitized_ladder[param][m_name] = {
                    k: v for k, v in m_info.items() if k != "fitted_model"
                }

        return {
            "status": "SUCCESS",
            "dataset_id": dataset_id,
            "dataset_name": dataset_name,
            "mode": dataset_mode,
            "quality_summary": quality_summary,
            "total_components": len(ranked_components),
            "lots_count": len(lots_summary),
            "model_ladder": sanitized_ladder,
            "runtime_seconds": (datetime.utcnow() - start_time).total_seconds()
        }
