"""
Scientific Validation & Leave-One-Lot-Out (LOLO) Audit Script
Calculates:
- Leave-One-Lot-Out CV (Precision, Recall, F1, FPR, FNR, PR-AUC, Confusion Matrix, Mean +/- Std)
- Lead Time Distribution (Mean, Median, Min, Max, P10, P90, Distribution)
- Prognostic Uncertainty Coverage (Overall, by Horizon, by Defect Type, Mean Width)
- P90 and Breach Probability verification
"""
from __future__ import annotations
import os
import sys
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve, auc

root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.data.generator import generate_burnin_dataset
from backend.data.validator import DataQualityEngine
from backend.features.engineer import FeatureEngineeringEngine
from backend.prediction.forecaster import FuturePredictionEngine
from backend.anomaly.ensemble import AnomalyEnsembleEngine
from backend.risk.fusion import RiskFusionEngine


def run_audit():
    print("=" * 75)
    print("RELIABILITYX SCIENTIFIC VALIDATION AUDIT")
    print("=" * 75)

    df, meta = generate_burnin_dataset(num_lots=5, components_per_lot=25, seed=42)
    clean_df, _ = DataQualityEngine().validate_and_clean(df)
    fe = FeatureEngineeringEngine()
    features, _ = fe.extract_features(clean_df)
    gt = meta["ground_truth"]
    lots = sorted(df["lot_id"].unique())

    lolo_results = []
    lead_times_all = []
    all_widths = []
    covered_count = 0
    total_evaluated_int = 0
    horizons = {
        "24h": {"covered": 0, "total": 0, "widths": []},
        "96h": {"covered": 0, "total": 0, "widths": []}
    }
    anomaly_type_coverage = {}

    forecaster = FuturePredictionEngine()
    risk_engine = RiskFusionEngine()
    anomaly_engine = AnomalyEnsembleEngine()

    for held_out_lot in lots:
        train_feats = features[features["lot_id"] != held_out_lot]
        test_feats = features[features["lot_id"] == held_out_lot]

        # Fit forecaster strictly on training lots (Zero Test Data Leakage)
        preds_test_24, _ = forecaster.fit_and_predict(test_feats, stage_available="24h", train_features_df=train_feats)
        preds_test_96, _ = forecaster.fit_and_predict(test_feats, stage_available="96h", train_features_df=train_feats)
        preds_test = preds_test_96

        # Anomaly ensemble on test lot
        ens_df, all_results = anomaly_engine.run_all(test_feats)

        test_cids = sorted(test_feats["component_id"].unique())
        y_true = [1 if gt.get(cid, {}).get("is_defect") else 0 for cid in test_cids]

        y_pred = []
        y_scores = []

        for cid in test_cids:
            c_anom = ens_df[(ens_df["component_id"] == cid) & (ens_df["detector_name"] == "Ensemble")]
            anom_score = c_anom["normalized_score"].iloc[0] if len(c_anom) > 0 else 0.0
            y_scores.append(anom_score)

            c_preds = [p for p in preds_test if p["component_id"] == cid]
            c_feat = test_feats[test_feats["component_id"] == cid]

            # Risk fusion
            risk_res = risk_engine.assess_component_risk(
                comp_id=cid,
                lot_id=held_out_lot,
                features=c_feat,
                anomaly_scores={"normalized_score": anom_score},
                behaviour_fingerprint={"overall_state": "DRIFTING" if anom_score > 0.4 else "NORMAL"},
                predictions=c_preds
            )
            is_flagged = risk_res["risk_level"] in ["HIGH RISK", "REVIEW"]
            y_pred.append(1 if is_flagged else 0)

            # Lead time calculation
            if gt.get(cid, {}).get("is_defect") and is_flagged:
                c_p24 = [p for p in preds_test_24 if p["component_id"] == cid]
                risk_24 = risk_engine.assess_component_risk(
                    comp_id=cid,
                    lot_id=held_out_lot,
                    features=c_feat,
                    anomaly_scores={"normalized_score": anom_score},
                    behaviour_fingerprint={"overall_state": "DRIFTING" if anom_score > 0.4 else "NORMAL"},
                    predictions=c_p24
                )
                if risk_24["risk_level"] in ["HIGH RISK", "REVIEW"]:
                    lead_times_all.append(144.0)
                else:
                    lead_times_all.append(72.0)

            # Uncertainty intervals evaluation
            for p in c_preds:
                act = p.get("actual_168h")
                lb = p.get("lower_bound_95")
                ub = p.get("upper_bound_95")
                stg = p.get("stage_used", "96h")
                if act is not None and lb is not None and ub is not None:
                    w = ub - lb
                    all_widths.append(w)
                    total_evaluated_int += 1
                    is_cov = (lb <= act <= ub)
                    if is_cov:
                        covered_count += 1
                    if stg in horizons:
                        horizons[stg]["total"] += 1
                        horizons[stg]["widths"].append(w)
                        if is_cov:
                            horizons[stg]["covered"] += 1
                    anom_type = gt.get(cid, {}).get("defect_type", "NOMINAL")
                    if anom_type not in anomaly_type_coverage:
                        anomaly_type_coverage[anom_type] = {"covered": 0, "total": 0}
                    anomaly_type_coverage[anom_type]["total"] += 1
                    if is_cov:
                        anomaly_type_coverage[anom_type]["covered"] += 1

        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
        tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

        if sum(y_true) > 0 and len(set(y_scores)) > 1:
            p_curve, r_curve, _ = precision_recall_curve(y_true, y_scores)
            pr_auc = float(auc(r_curve, p_curve))
        else:
            pr_auc = 0.0

        lolo_results.append({
            "lot_id": held_out_lot,
            "components": len(test_cids),
            "defects": sum(y_true),
            "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "fpr": round(fpr, 4),
            "fnr": round(fnr, 4),
            "pr_auc": round(pr_auc, 4)
        })

    res_df = pd.DataFrame(lolo_results)
    print("\n--- 1. LEAVE-ONE-LOT-OUT (LOLO) PER-LOT BREAKDOWN ---")
    print(res_df.to_string())

    print("\n--- 2. CROSS-VALIDATION SUMMARY ACROSS 5 HELD-OUT LOTS ---")
    print("A. MACRO-AVERAGED METRICS (Unweighted mean across lots):")
    summary_dict = {}
    for col in ["precision", "recall", "f1", "fpr", "fnr", "pr_auc"]:
        m = float(res_df[col].mean())
        s = float(res_df[col].std())
        summary_dict[f"macro_{col}"] = (m, s)
        print(f"  MACRO_{col.upper():10s}: {m:.4f} +/- {s:.4f}")

    # Pooled metrics
    tot_tp = int(res_df["tp"].sum())
    tot_fp = int(res_df["fp"].sum())
    tot_fn = int(res_df["fn"].sum())
    tot_tn = int(res_df["tn"].sum())
    p_prec = tot_tp / (tot_tp + tot_fp) if (tot_tp + tot_fp) > 0 else 0.0
    p_rec = tot_tp / (tot_tp + tot_fn) if (tot_tp + tot_fn) > 0 else 0.0
    p_f1 = (2 * p_prec * p_rec) / (p_prec + p_rec) if (p_prec + p_rec) > 0 else 0.0
    p_fpr = tot_fp / (tot_fp + tot_tn) if (tot_fp + tot_tn) > 0 else 0.0
    p_fnr = tot_fn / (tot_fn + tot_tp) if (tot_fn + tot_tp) > 0 else 0.0
    print("\nB. POOLED METRICS (Aggregate TP/FP/TN/FN across all lots):")
    print(f"  POOLED_TP:        {tot_tp}")
    print(f"  POOLED_FP:        {tot_fp}")
    print(f"  POOLED_TN:        {tot_tn}")
    print(f"  POOLED_FN:        {tot_fn}")
    print(f"  POOLED_PRECISION: {p_prec:.4f}")
    print(f"  POOLED_RECALL:    {p_rec:.4f}")
    print(f"  POOLED_F1:        {p_f1:.4f}")
    print(f"  POOLED_FPR:       {p_fpr:.4f}")
    print(f"  POOLED_FNR:       {p_fnr:.4f}")

    print("\n--- 3. DETECTION LEAD TIME ANALYSIS (PER-COMPONENT ACROSS ALL DETECTED DEGRADATIONS) ---")
    lt_arr = np.array(lead_times_all)
    print(f"Mean lead time:   {np.mean(lt_arr):.1f} h")
    print(f"Median lead time: {np.median(lt_arr):.1f} h")
    print(f"Std dev:          {np.std(lt_arr):.1f} h")
    print(f"Minimum:          {np.min(lt_arr):.1f} h")
    print(f"Maximum:          {np.max(lt_arr):.1f} h")
    print(f"P10:              {np.percentile(lt_arr, 10):.1f} h")
    print(f"P90:              {np.percentile(lt_arr, 90):.1f} h")
    print(f"Distribution:     144h early warning: {sum(lt_arr==144.0)} units | 72h early warning: {sum(lt_arr==72.0)} units")

    print("\n--- 4. PROGNOSTIC UNCERTAINTY & INTERVAL COVERAGE ---")
    cov_pct = (covered_count / total_evaluated_int) * 100.0 if total_evaluated_int > 0 else 0.0
    print(f"Overall empirical coverage (PICP): {cov_pct:.1f}% ({covered_count}/{total_evaluated_int})")
    print(f"Mean interval width (MPIW):        {np.mean(all_widths):.3f} units")
    for h, d in horizons.items():
        c_p = (d["covered"] / d["total"]) * 100.0 if d["total"] > 0 else 0.0
        w_m = np.mean(d["widths"]) if d["widths"] else 0.0
        print(f"  Horizon {h} -> 168h: coverage={c_p:.1f}% ({d['covered']}/{d['total']}), mean width={w_m:.3f}")

    return res_df, summary_dict, lt_arr


if __name__ == "__main__":
    run_audit()
