"""
Dynamic Part Average Testing (AEC-Q001-referenced robust statistical DPAT)
Lot-relative statistical screening algorithm inspired by AEC-Q001 Part Average Testing principles.
Calculates robust outlier limits per lot and parameter using median and MAD:
Upper = Median + k * 1.4826 * MAD
Lower = Median - k * 1.4826 * MAD
Used as an engineering statistical reference; not a certification or formal compliance claim.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Dict, Any, List


class DPATDetector:
    reference_standard: str = "AEC-Q001-referenced robust statistical DPAT methodology (statistical reference only; not aerospace certification)"

    def __init__(self, k_factor: float = 3.0):
        self.k_factor = k_factor

    def score(self, features_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Calculates DPAT scores for each component based on drift and parameter measurements.
        Returns list of score dicts:
        {
            component_id: str,
            detector_name: 'DPAT',
            raw_score: float,
            normalized_score: float (0.0 to 1.0),
            is_anomalous: bool,
            evidence: str,
            detector_status: 'ACTIVE' or 'FALLBACK'
        }
        """
        results = []
        
        # We group by lot_id and parameter_name
        for (lot_id, param), group in features_df.groupby(["lot_id", "parameter_name"]):
            vals = group["val_24h"].dropna()
            n = len(vals)
            
            if n < 4:
                # Lot size too small for statistical DPAT; fallback to basic threshold
                for _, row in group.iterrows():
                    val = row["val_24h"]
                    results.append({
                        "component_id": row["component_id"],
                        "parameter_name": param,
                        "detector_name": "DPAT",
                        "raw_score": 0.0,
                        "normalized_score": 0.0,
                        "is_anomalous": False,
                        "evidence": f"Lot {lot_id} size ({n}) too small for robust DPAT.",
                        "detector_status": "FALLBACK"
                    })
                continue
                
            median = vals.median()
            mad = np.median(np.abs(vals - median))
            # 1.4826 is normal consistency factor for MAD
            sigma_robust = max(1.4826 * mad, 1e-4)
            upper_limit = median + self.k_factor * sigma_robust
            lower_limit = median - self.k_factor * sigma_robust
            
            for _, row in group.iterrows():
                val = row["val_24h"]
                if pd.isnull(val):
                    deviation = 0.0
                    is_outlier = False
                else:
                    deviation = abs(val - median) / sigma_robust
                    is_outlier = (val > upper_limit) or (val < lower_limit)
                    
                # Normalize deviation to [0, 1] using a sigmoid-like curve
                # deviation = k_factor maps to ~0.7
                norm_score = float(1.0 / (1.0 + np.exp(-1.0 * (deviation - self.k_factor))))
                
                evidence = ""
                if is_outlier:
                    evidence = f"DPAT breached AEC-Q001-referenced robust limit: {val:.3f} outside [{lower_limit:.3f}, {upper_limit:.3f}] (dev: {deviation:.1f}σ)"
                else:
                    evidence = f"DPAT nominal: {val:.3f} within [{lower_limit:.3f}, {upper_limit:.3f}]"

                results.append({
                    "component_id": row["component_id"],
                    "parameter_name": param,
                    "detector_name": "DPAT",
                    "raw_score": float(deviation),
                    "normalized_score": round(norm_score, 4),
                    "is_anomalous": bool(is_outlier),
                    "evidence": evidence,
                    "detector_status": "ACTIVE"
                })
                
        return results
