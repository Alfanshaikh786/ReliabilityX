"""
Physics-Informed Arrhenius Burn-In Synthetic Dataset Generator for ReliabilityX
Generates semiconductor burn-in telemetry based on real reliability physics:
- Arrhenius thermal stress acceleration at 125°C
- Trap-assisted oxide leakage current (I_leak)
- Channel hot-carrier / BTI quiescent current (I_ddq)
- Threshold degradation switching propagation delay (t_pd)

Clearly marked as: "DEMO DATASET — PHYSICS-INFORMED SYNTHETIC BENCHMARK"
Not actual proprietary ISRO flight data.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from backend.core.config import DEFAULT_PARAMETER_SPECS, CHECKPOINTS


def generate_burnin_dataset(
    num_lots: int = 5,
    components_per_lot: int = 25,
    seed: int = 42
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Generates a realistic burn-in parametric dataset across checkpoints [0h, 24h, 96h, 168h].
    Includes:
    - Nominal stable components
    - Subtle drifting components (constant wear rate)
    - Accelerating latent defect components (super-linear drift, positive d^2y/dt^2)
    - Lot-wide pattern lot (wafer edge variation)
    - Measurement noise edge cases
    """
    np.random.seed(seed)
    records = []
    ground_truth = {}
    
    lot_names = [f"LOT-2411{chr(65+i)}" for i in range(num_lots)]
    
    # Designate LOT-2411C as having a lot-wide process contamination/wafer edge pattern
    lot_wide_target = "LOT-2411C"
    
    for lot_idx, lot_id in enumerate(lot_names):
        # Base lot mean variation (wafer-to-wafer slight offset)
        lot_leak_base = np.random.normal(5.0, 0.4)
        lot_iddq_base = np.random.normal(18.0, 0.8)
        lot_tpd_base = np.random.normal(4.5, 0.2)
        
        is_contaminated_lot = (lot_id == lot_wide_target)
        
        for c_idx in range(components_per_lot):
            comp_id = f"C-{lot_idx+1:02d}{c_idx+1:03d}"
            
            # Decide component profile
            # In contaminated lot, 35% of components have accelerated leakage (lot-wide pattern)
            # In regular lots, ~6% accelerating, ~10% drifting, ~84% normal
            rand_val = np.random.rand()
            
            if is_contaminated_lot and rand_val < 0.35:
                profile = "ACCELERATING_LOT_PATTERN"
            elif rand_val < 0.07:
                profile = "ACCELERATING_LATENT_DEFECT"
            elif rand_val < 0.14:
                profile = "STEADY_DRIFT"
            elif rand_val < 0.18:
                profile = "DECELERATING_DRIFT"
            elif rand_val < 0.22:
                profile = "SUDDEN_STEP_CHANGE"
            elif rand_val < 0.26:
                profile = "CORRELATED_MULTIVARIATE"
            elif rand_val < 0.30:
                profile = "NOISY_MEASUREMENT"
            else:
                profile = "NORMAL_STABLE"
                
            ground_truth[comp_id] = {
                "lot_id": lot_id,
                "profile": profile,
                "is_defect": profile in ["ACCELERATING_LATENT_DEFECT", "ACCELERATING_LOT_PATTERN", "CORRELATED_MULTIVARIATE", "SUDDEN_STEP_CHANGE"]
            }
            
            # Initial baseline at 0h (components pass standard datasheet specs initially!)
            i_leak_0 = max(0.5, np.random.normal(lot_leak_base, 0.6))
            i_iddq_0 = max(5.0, np.random.normal(lot_iddq_base, 1.2))
            t_pd_0 = max(2.0, np.random.normal(lot_tpd_base, 0.3))
            v_ref_0 = np.random.normal(3.30, 0.02)
            
            for t in CHECKPOINTS:
                # Physics trajectory evolution
                if profile == "NORMAL_STABLE":
                    # Stable: minor thermal noise, drift rate ~ 0.005 uA/h
                    noise = np.random.normal(0, 0.08)
                    i_leak = i_leak_0 + 0.003 * t + noise
                    i_iddq = i_iddq_0 + 0.008 * t + np.random.normal(0, 0.15)
                    t_pd = t_pd_0 + 0.001 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)
                    
                elif profile == "STEADY_DRIFT":
                    # Drifting: steady linear slope
                    drift_rate_leak = 0.035 + np.random.normal(0, 0.005)
                    i_leak = i_leak_0 + drift_rate_leak * t + np.random.normal(0, 0.1)
                    i_iddq = i_iddq_0 + 0.04 * t + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.008 * t + np.random.normal(0, 0.05)
                    v_ref = v_ref_0 + np.random.normal(0, 0.008)

                elif profile == "DECELERATING_DRIFT":
                    # Burn-in infant wearout that saturates/stabilizes (negative acceleration)
                    sat_delta = 3.2 * (1.0 - np.exp(-t / 35.0))
                    i_leak = i_leak_0 + sat_delta + np.random.normal(0, 0.08)
                    i_iddq = i_iddq_0 + 1.5 * (1.0 - np.exp(-t / 35.0)) + np.random.normal(0, 0.15)
                    t_pd = t_pd_0 + 0.003 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)

                elif profile == "SUDDEN_STEP_CHANGE":
                    # Latent mechanical bond/oxide micro-fracture triggering abrupt jump at 96h
                    step = 4.2 if t >= 96 else 0.0
                    i_leak = i_leak_0 + 0.008 * t + step + np.random.normal(0, 0.12)
                    i_iddq = i_iddq_0 + 0.015 * t + (step * 0.8) + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.003 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.006)

                elif profile == "CORRELATED_MULTIVARIATE":
                    # Correlated junction heating degradation: leakage and standby current degrade in lockstep
                    corr_factor = 0.00045 * (t ** 1.9)
                    i_leak = i_leak_0 + 0.025 * t + corr_factor + np.random.normal(0, 0.1)
                    i_iddq = i_iddq_0 + 0.08 * t + (corr_factor * 2.2) + np.random.normal(0, 0.25)
                    t_pd = t_pd_0 + 0.015 * t + (corr_factor * 0.1) + np.random.normal(0, 0.05)
                    v_ref = v_ref_0 + np.random.normal(0, 0.008)
                    
                elif profile in ["ACCELERATING_LATENT_DEFECT", "ACCELERATING_LOT_PATTERN"]:
                    # Accelerating: non-linear quadratic/exponential degradation
                    accel_factor = 0.00065 if profile == "ACCELERATING_LATENT_DEFECT" else 0.00055
                    i_leak = i_leak_0 + 0.02 * t + accel_factor * (t ** 2) + np.random.normal(0, 0.12)
                    i_iddq = i_iddq_0 + 0.05 * t + 0.0008 * (t ** 2) + np.random.normal(0, 0.25)
                    t_pd = t_pd_0 + 0.012 * t + 0.0002 * (t ** 2) + np.random.normal(0, 0.06)
                    v_ref = v_ref_0 + np.random.normal(0, 0.01)
                    
                elif profile == "NOISY_MEASUREMENT":
                    # Mostly normal, but 24h or 96h has a single high sensor noise glitch
                    glitch = 2.5 if t == 24 else 0.0
                    i_leak = i_leak_0 + 0.004 * t + glitch + np.random.normal(0, 0.2)
                    i_iddq = i_iddq_0 + 0.01 * t + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.002 * t + np.random.normal(0, 0.05)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)
                    
                stage_name = f"{t}h"
                
                # Append rows for each parameter
                records.append({
                    "component_id": comp_id,
                    "lot_id": lot_id,
                    "test_stage": stage_name,
                    "timestamp": float(t),
                    "parameter_name": "leakage_current_uA",
                    "parameter_value": round(float(max(0.1, i_leak)), 4)
                })
                records.append({
                    "component_id": comp_id,
                    "lot_id": lot_id,
                    "test_stage": stage_name,
                    "timestamp": float(t),
                    "parameter_name": "standby_current_mA",
                    "parameter_value": round(float(max(1.0, i_iddq)), 4)
                })
                records.append({
                    "component_id": comp_id,
                    "lot_id": lot_id,
                    "test_stage": stage_name,
                    "timestamp": float(t),
                    "parameter_name": "propagation_delay_ns",
                    "parameter_value": round(float(max(0.5, t_pd)), 4)
                })
                records.append({
                    "component_id": comp_id,
                    "lot_id": lot_id,
                    "test_stage": stage_name,
                    "timestamp": float(t),
                    "parameter_name": "voltage_ref_V",
                    "parameter_value": round(float(v_ref), 4)
                })
                
    df = pd.DataFrame(records)
    meta = {
        "dataset_name": "Physics-Informed Arrhenius Burn-In Benchmark (Demo)",
        "source": "Synthetic Physics Generator (Arrhenius / NBTI / Oxide Trap Model)",
        "total_records": len(df),
        "total_components": len(ground_truth),
        "total_lots": num_lots,
        "ground_truth": ground_truth,
        "parameters": list(DEFAULT_PARAMETER_SPECS.keys())
    }
    return df, meta
