"""
Feature Engineering Engine for ReliabilityX
Calculates deep physical and lot-relative degradation features:
- Checkpoint deltas (0->24h, 24->96h, 96->168h)
- Percentage changes
- Drift rates: change_in_value / change_in_time [units/h]
- Drift acceleration: change_in_drift_rate / change_in_time [units/h^2]
- Lot-relative standard Z-score
- Robust Z-score (median and MAD)
- Deviation from lot median and nominal baseline
- Distance to engineering limit
- Rate of approach to engineering limit
- Safety slope threshold
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.core.config import DEFAULT_PARAMETER_SPECS, ParameterSpec


class FeatureEngineeringEngine:
    def __init__(self, specs: Dict[str, ParameterSpec] = None):
        self.specs = specs or DEFAULT_PARAMETER_SPECS

    def extract_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Input: clean long-format dataframe containing [component_id, lot_id, test_stage, parameter_name, processed_value]
        Output: wide feature dataframe per component and per parameter, plus lot-level statistics.
        """
        # Filter only valid rows
        valid_df = df[df["is_valid"] == 1]
        
        # Pivot to get stages as columns per component, lot, parameter
        pivoted = valid_df.pivot_table(
            index=["component_id", "lot_id", "parameter_name"],
            columns="test_stage",
            values="processed_value",
            aggfunc="first"
        ).reset_index()

        # Ensure all standard columns exist
        for col in ["0h", "24h", "96h", "168h"]:
            if col not in pivoted.columns:
                pivoted[col] = np.nan

        # Sort columns
        pivoted = pivoted.rename(columns={
            "0h": "val_0h",
            "24h": "val_24h",
            "96h": "val_96h",
            "168h": "val_168h"
        })

        # Calculate deltas
        pivoted["delta_0_24"] = pivoted["val_24h"] - pivoted["val_0h"]
        pivoted["delta_24_96"] = pivoted["val_96h"] - pivoted["val_24h"]
        pivoted["delta_96_168"] = pivoted["val_168h"] - pivoted["val_96h"]
        
        # Percentage changes
        pivoted["pct_change_24"] = np.where(
            pivoted["val_0h"] > 0,
            (pivoted["delta_0_24"] / pivoted["val_0h"]) * 100.0,
            0.0
        )
        pivoted["pct_change_168"] = np.where(
            pivoted["val_0h"] > 0,
            ((pivoted["val_168h"] - pivoted["val_0h"]) / pivoted["val_0h"]) * 100.0,
            0.0
        )

        # Drift rates (units per hour)
        pivoted["drift_rate_24"] = pivoted["delta_0_24"] / 24.0
        pivoted["drift_rate_96"] = np.where(
            pivoted["val_96h"].notnull(),
            pivoted["delta_24_96"] / 72.0,
            pivoted["drift_rate_24"]
        )

        # Drift Acceleration = (drift_rate_96 - drift_rate_24) / (midpoint_time_diff)
        # Midpoint of 0->24 is 12h; midpoint of 24->96 is 60h; delta_t = 48h
        pivoted["drift_acceleration"] = np.where(
            pivoted["val_96h"].notnull(),
            (pivoted["drift_rate_96"] - pivoted["drift_rate_24"]) / 48.0,
            0.0
        )

        # Lot-relative statistics computed per (lot_id, parameter_name)
        lot_stats = {}
        for (lot_id, param), group in pivoted.groupby(["lot_id", "parameter_name"]):
            vals_24 = group["val_24h"].dropna()
            mean_24 = vals_24.mean() if len(vals_24) > 0 else 0.0
            std_24 = vals_24.std() if len(vals_24) > 1 and vals_24.std() > 1e-6 else 1e-4
            med_24 = vals_24.median() if len(vals_24) > 0 else 0.0
            mad_24 = np.median(np.abs(vals_24 - med_24)) if len(vals_24) > 0 else 1e-4
            if mad_24 < 1e-6:
                mad_24 = 1e-4
                
            lot_stats[(lot_id, param)] = {
                "mean_24": mean_24,
                "std_24": std_24,
                "median_24": med_24,
                "mad_24": mad_24
            }

        # Vectorized lot-relative metrics
        def get_stat(row, stat_name):
            key = (row["lot_id"], row["parameter_name"])
            return lot_stats.get(key, {}).get(stat_name, 0.0)

        lot_means = pivoted.apply(lambda r: get_stat(r, "mean_24"), axis=1)
        lot_stds = pivoted.apply(lambda r: get_stat(r, "std_24"), axis=1)
        lot_medians = pivoted.apply(lambda r: get_stat(r, "median_24"), axis=1)
        lot_mads = pivoted.apply(lambda r: get_stat(r, "mad_24"), axis=1)

        # Standard Z-Score
        pivoted["lot_zscore_24"] = (pivoted["val_24h"] - lot_means) / lot_stds
        
        # Robust Z-Score: 0.6745 * (x - median) / MAD
        pivoted["robust_zscore_24"] = 0.6745 * (pivoted["val_24h"] - lot_medians) / lot_mads

        # Deviation from lot median
        pivoted["dev_from_lot_median"] = pivoted["val_24h"] - lot_medians

        # Deviation from healthy baseline & distance to limits
        def compute_limit_metrics(row):
            param = row["parameter_name"]
            spec = self.specs.get(param)
            val_now = row["val_96h"] if pd.notnull(row["val_96h"]) else row["val_24h"]
            drift_rate = row["drift_rate_96"] if pd.notnull(row["val_96h"]) else row["drift_rate_24"]
            hours_left = 168.0 - (96.0 if pd.notnull(row["val_96h"]) else 24.0)

            if spec:
                dist_to_limit = spec.max_limit - val_now
                dev_from_baseline = val_now - spec.nominal_baseline
                rate_of_approach = (drift_rate / max(0.01, dist_to_limit)) if dist_to_limit > 0 else 999.0
                safety_slope = dist_to_limit / hours_left if hours_left > 0 else 0.0
            else:
                dist_to_limit = 999.0
                dev_from_baseline = 0.0
                rate_of_approach = 0.0
                safety_slope = 999.0

            return pd.Series([dev_from_baseline, dist_to_limit, rate_of_approach, safety_slope])

        limit_metrics = pivoted.apply(compute_limit_metrics, axis=1)
        limit_metrics.columns = ["dev_from_baseline", "distance_to_limit", "rate_of_approach", "safety_slope"]
        pivoted = pd.concat([pivoted, limit_metrics], axis=1)

        return pivoted, lot_stats
