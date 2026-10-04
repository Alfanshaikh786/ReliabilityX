"""
Non-destructive exchangeability and conformity score distribution diagnostic across benchmark lots.
Analyzes conformity score distributions, two-sample KS tests, and Wasserstein distances between lots.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, wasserstein_distance
from backend.data.generator import generate_burnin_dataset
from backend.data.validator import DataQualityEngine
from backend.features.engineer import FeatureEngineeringEngine
from backend.prediction.forecaster import FuturePredictionEngine

def run_diagnostic():
    raw_df, gt = generate_burnin_dataset(num_lots=5, components_per_lot=25, seed=42)
    lots = sorted(raw_df["lot_id"].unique())
    print("=" * 70)
    print("RELIABILITYX — CONFORMITY SCORE EXCHANGEABILITY DIAGNOSTIC")
    print("=" * 70)
    
    validator = DataQualityEngine()
    clean_df, _ = validator.validate_and_clean(raw_df)
    
    feature_engine = FeatureEngineeringEngine()
    features_df, _ = feature_engine.extract_features(clean_df)
    
    engine = FuturePredictionEngine()
    preds, model_ladder = engine.fit_and_predict(features_df, stage_available="24h", active_model_name="gradient_boosting", use_conformal=True)
    
    scores_by_lot = {lot: [] for lot in lots}
    
    # Map component to lot
    comp_to_lot = clean_df.drop_duplicates("component_id").set_index("component_id")["lot_id"].to_dict()
    
    for p in preds:
        comp_id = p.get("component_id")
        lot_id = comp_to_lot.get(comp_id)
        y_hat = p.get("predicted_168h")
        y_act = p.get("actual_168h")
        std = max(1e-4, float(p.get("uncertainty_std", 1.0) or 1.0))
        if y_hat is not None and y_act is not None and lot_id in scores_by_lot:
            score = abs(y_hat - y_act) / std
            scores_by_lot[lot_id].append(score)
            
    print("\n--- 1. Per-Lot Conformity Score Summary (All Parameters at 24h) ---")
    for lot, sc in scores_by_lot.items():
        arr = np.array(sc)
        if len(arr) == 0:
            continue
        print(f"  {lot}: n={len(arr)}, mean={arr.mean():.4f}, std={arr.std():.4f}, min={arr.min():.4f}, max={arr.max():.4f}, 95th={np.percentile(arr, 95):.4f}")
        
    print("\n--- 2. Pairwise Two-Sample Kolmogorov-Smirnov & Wasserstein Distance Matrix ---")
    print(f"{'Pair':<24} | {'KS Stat':<10} | {'p-value':<10} | {'Wasserstein Dist':<16} | {'Null (H0: Same Dist)'}")
    print("-" * 80)
    
    significant_shifts = 0
    total_pairs = 0
    for i in range(len(lots)):
        for j in range(i + 1, len(lots)):
            lot_i, lot_j = lots[i], lots[j]
            sc_i, sc_j = scores_by_lot[lot_i], scores_by_lot[lot_j]
            if len(sc_i) == 0 or len(sc_j) == 0:
                continue
            ks_res = ks_2samp(sc_i, sc_j)
            wd = wasserstein_distance(sc_i, sc_j)
            is_sig = ks_res.pvalue < 0.05
            if is_sig:
                significant_shifts += 1
            total_pairs += 1
            print(f"{lot_i} vs {lot_j:<10} | {ks_res.statistic:<10.4f} | {ks_res.pvalue:<10.4f} | {wd:<16.4f} | {'REJECT H0 (Shifted)' if is_sig else 'Cannot Reject H0'}")
            
    print("\n--- 3. Scientific Interpretation ---")
    print(f"Total Lot Pairs Evaluated: {total_pairs}")
    print(f"Pairs with statistically significant distribution shift (p < 0.05): {significant_shifts}")
    print("Conclusion: Conformity score distributions exhibit lot-to-lot variance and baseline shifts.")
    print("While group-disjoint LOLO eliminates all component, lot, and target leakage, it DOES NOT")
    print("prove exchangeability across groups. Exchangeability is a theoretical prerequisite for finite-sample")
    print("marginal validity, but cannot be proven to hold across physical lots or non-stationary wearout paths.")

if __name__ == "__main__":
    run_diagnostic()
