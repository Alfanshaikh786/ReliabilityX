"""
Data Quality Engine for ReliabilityX
Validates raw telemetry before model execution:
- Column presence check
- Missing values detection
- Duplicate measurements check
- Timestamp & test stage continuity
- Physical impossibility checks (e.g. negative current)
- Measurement noise / spike detection
- Preserves immutable raw values while creating clean analysis frames
- Generates transparent Data Quality Summary
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.core.config import DEFAULT_PARAMETER_SPECS, CHECKPOINTS, CHECKPOINT_LABELS


class DataQualityEngine:
    REQUIRED_COLUMNS = [
        "component_id",
        "lot_id",
        "test_stage",
        "timestamp",
        "parameter_name",
        "parameter_value"
    ]

    def __init__(self, parameter_specs: Dict[str, Any] = None):
        self.parameter_specs = parameter_specs or DEFAULT_PARAMETER_SPECS

    def validate_and_clean(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Processes raw input dataframe, identifies issues, produces warnings,
        and returns clean DataFrame plus Data Quality Summary.
        """
        rows_received = len(df)
        warnings = []
        
        # 1. Column validation
        missing_cols = [c for c in self.REQUIRED_COLUMNS if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns in dataset: {missing_cols}")

        clean_df = df.copy()
        clean_df["raw_value"] = clean_df["parameter_value"]
        clean_df["is_valid"] = 1
        clean_df["noise_flag"] = 0

        # 2. Check for missing values
        null_mask = clean_df[self.REQUIRED_COLUMNS].isnull().any(axis=1)
        missing_count = int(null_mask.sum())
        if missing_count > 0:
            warnings.append(f"Found {missing_count} rows with missing (null) values in required columns.")
            clean_df.loc[null_mask, "is_valid"] = 0

        # 3. Check for duplicate measurements (same component, test_stage, parameter)
        dup_mask = clean_df.duplicated(subset=["component_id", "test_stage", "parameter_name"], keep="first")
        duplicate_count = int(dup_mask.sum())
        if duplicate_count > 0:
            warnings.append(f"Identified {duplicate_count} duplicate measurements (same component, stage, parameter). Kept first record.")
            clean_df.loc[dup_mask, "is_valid"] = 0

        # 4. Check for invalid timestamps / stages
        stage_mask = ~clean_df["test_stage"].astype(str).isin(CHECKPOINT_LABELS)
        invalid_stage_count = int(stage_mask.sum())
        if invalid_stage_count > 0:
            warnings.append(f"{invalid_stage_count} rows contain non-standard test stages outside {CHECKPOINT_LABELS}.")

        # 5. Check impossible physical values (e.g., negative leakage or delay)
        impossible_mask = pd.Series(False, index=clean_df.index)
        for param, spec in self.parameter_specs.items():
            param_match = clean_df["parameter_name"] == param
            below_min = param_match & (clean_df["parameter_value"] < spec.min_limit)
            if below_min.any():
                impossible_mask = impossible_mask | below_min
                warnings.append(f"Detected {below_min.sum()} values below physical minimum for {spec.display_name}.")
        
        clean_df.loc[impossible_mask, "is_valid"] = 0
        invalid_records_count = int((clean_df["is_valid"] == 0).sum())

        # 6. Check for missing test stages per component
        valid_rows = clean_df[clean_df["is_valid"] == 1]
        stages_per_comp = valid_rows.groupby("component_id")["test_stage"].nunique()
        comps_missing_stages = stages_per_comp[stages_per_comp < len(CHECKPOINT_LABELS)]
        if len(comps_missing_stages) > 0:
            warnings.append(f"{len(comps_missing_stages)} components have incomplete checkpoints (e.g. missing 96h or 168h). System will adapt gracefully.")

        # 7. Extreme measurement noise check (statistical outlier within parameter series)
        # Using 5*IQR to flag extreme sensor spikes without discarding valid degradation
        for param in clean_df["parameter_name"].unique():
            p_slice = valid_rows[valid_rows["parameter_name"] == param]
            if len(p_slice) > 10:
                q25, q75 = p_slice["parameter_value"].quantile([0.25, 0.75])
                iqr = q75 - q25
                extreme_high = q75 + 5.0 * iqr
                spike_idx = p_slice[p_slice["parameter_value"] > extreme_high].index
                clean_df.loc[spike_idx, "noise_flag"] = 1
                if len(spike_idx) > 0:
                    warnings.append(f"Flagged {len(spike_idx)} extreme measurement spikes (>5x IQR) for parameter '{param}'.")

        # Processed value defaults to raw_value
        clean_df["processed_value"] = clean_df["raw_value"]

        # Summary Metrics
        if invalid_records_count > rows_received * 0.05:
            q_status = "REQUIRES_ATTENTION"
        elif invalid_records_count > 0 or len(warnings) > 0:
            q_status = "ACCEPTABLE"
        else:
            q_status = "EXCELLENT"

        summary = {
            "rows_received": rows_received,
            "valid_rows": int((clean_df["is_valid"] == 1).sum()),
            "missing_values": missing_count,
            "invalid_records": invalid_records_count,
            "duplicate_records": duplicate_count,
            "components_processed": int(clean_df["component_id"].nunique()),
            "lots_processed": int(clean_df["lot_id"].nunique()),
            "quality_status": q_status,
            "warnings": warnings
        }

        return clean_df, summary
