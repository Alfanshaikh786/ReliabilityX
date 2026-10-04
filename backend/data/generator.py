"""
Arrhenius-Inspired Synthetic Degradation Model & Burn-In Benchmark Generator for ReliabilityX
Generates semiconductor burn-in telemetry based on configurable reliability physics:
- Arrhenius thermal stress acceleration model (configurable Ea, T_stress, T_use)
- Oxide trap-assisted leakage current (I_leak)
- Channel hot-carrier / NBTI quiescent current (I_ddq)
- Threshold voltage shift propagation delay (t_pd)
- Common-mode environmental artifacts (thermal chamber / test-system anomalies)
- Lot-wide systemic degradation patterns

PROTOTYPE SYNTHETIC BENCHMARK.
Production deployment requires component-specific degradation parameters and validated stress models.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS, CHECKPOINTS


def calculate_arrhenius_af(
    ea_ev: float = 0.7,
    t_stress_c: float = 125.0,
    t_use_c: float = 25.0
) -> float:
    """
    Computes Arrhenius Thermal Acceleration Factor (AF):
    AF = exp( (Ea / k_B) * (1/T_use - 1/T_stress) )
    where k_B = 8.617333262e-5 eV/K.
    """
    k_b = 8.617333262e-5
    t_stress_k = t_stress_c + 273.15
    t_use_k = t_use_c + 273.15
    af = np.exp((ea_ev / k_b) * ((1.0 / t_use_k) - (1.0 / t_stress_k)))
    return float(af)


def generate_burnin_dataset(
    num_lots: int = 5,
    components_per_lot: int = 25,
    seed: int = 42,
    activation_energy_eV: float = CONFIG.arrhenius_activation_energy_eV,
    stress_temp_celsius: float = CONFIG.stress_temp_celsius,
    use_temp_celsius: float = CONFIG.use_temp_celsius,
    defect_severity: str = "MODERATE", # 'SUBTLE', 'MODERATE', 'SEVERE'
    include_common_mode_artifact: bool = False
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Generates a realistic burn-in parametric dataset across checkpoints [0h, 24h, 96h, 168h].
    Includes:
    - Nominal stable components
    - Subtle drifting components (constant wear rate)
    - Accelerating latent defect components (super-linear drift, positive d^2y/dt^2)
    - Lot-wide systemic pattern (wafer edge variation)
    - Optional test-system common-mode shift
    """
    np.random.seed(seed)
    records = []
    ground_truth = {}
    
    # Severity scaling multiplier (Phase 16)
    severity_multipliers = {
        "SUBTLE": 0.65,
        "MODERATE": 1.0,
        "SEVERE": 1.75
    }
    sev_mult = severity_multipliers.get(defect_severity.upper(), 1.0)

    # Thermal Acceleration Factor
    af = calculate_arrhenius_af(activation_energy_eV, stress_temp_celsius, use_temp_celsius)

    lot_names = [f"LOT-2411{chr(65+i)}" for i in range(num_lots)]
    
    # Designate LOT-2411C as having a lot-wide systemic degradation pattern
    lot_wide_target = "LOT-2411C"
    
    # Designate LOT-2411E as having an optional test-system common-mode artifact if enabled
    common_mode_lot = "LOT-2411E" if include_common_mode_artifact and num_lots >= 5 else None

    for lot_idx, lot_id in enumerate(lot_names):
        # Base lot mean variation (wafer-to-wafer slight offset)
        lot_leak_base = np.random.normal(5.0, 0.4)
        lot_iddq_base = np.random.normal(18.0, 0.8)
        lot_tpd_base = np.random.normal(4.5, 0.2)
        
        is_contaminated_lot = (lot_id == lot_wide_target)
        is_common_mode_lot = (lot_id == common_mode_lot)
        
        for c_idx in range(components_per_lot):
            comp_id = f"C-{lot_idx+1:02d}{c_idx+1:03d}"
            rand_val = np.random.rand()
            
            # Profile assignment
            if is_common_mode_lot and rand_val < 0.80:
                # 80% of units experience common-mode test fixture/chamber artifact
                profile = "COMMON_MODE_INSTRUMENT_SHIFT"
            elif is_contaminated_lot and rand_val < 0.36:
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
                "is_defect": profile in [
                    "ACCELERATING_LATENT_DEFECT",
                    "ACCELERATING_LOT_PATTERN",
                    "CORRELATED_MULTIVARIATE",
                    "SUDDEN_STEP_CHANGE"
                ]
            }
            
            # Initial baseline at 0h (components pass standard datasheet specs initially!)
            i_leak_0 = max(0.5, np.random.normal(lot_leak_base, 0.6))
            i_iddq_0 = max(5.0, np.random.normal(lot_iddq_base, 1.2))
            t_pd_0 = max(2.0, np.random.normal(lot_tpd_base, 0.3))
            v_ref_0 = np.random.normal(3.30, 0.02)
            
            for t in CHECKPOINTS:
                # Physics trajectory evolution
                if profile == "NORMAL_STABLE":
                    noise = np.random.normal(0, 0.08)
                    i_leak = i_leak_0 + 0.003 * t + noise
                    i_iddq = i_iddq_0 + 0.008 * t + np.random.normal(0, 0.15)
                    t_pd = t_pd_0 + 0.001 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)
                    
                elif profile == "STEADY_DRIFT":
                    drift_rate_leak = (0.035 * sev_mult) + np.random.normal(0, 0.005)
                    i_leak = i_leak_0 + drift_rate_leak * t + np.random.normal(0, 0.1)
                    i_iddq = i_iddq_0 + (0.04 * sev_mult) * t + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.008 * t + np.random.normal(0, 0.05)
                    v_ref = v_ref_0 + np.random.normal(0, 0.008)

                elif profile == "DECELERATING_DRIFT":
                    sat_delta = 3.2 * (1.0 - np.exp(-t / 35.0))
                    i_leak = i_leak_0 + sat_delta + np.random.normal(0, 0.08)
                    i_iddq = i_iddq_0 + 1.5 * (1.0 - np.exp(-t / 35.0)) + np.random.normal(0, 0.15)
                    t_pd = t_pd_0 + 0.003 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)

                elif profile == "SUDDEN_STEP_CHANGE":
                    step = (4.2 * sev_mult) if t >= 96 else 0.0
                    i_leak = i_leak_0 + 0.008 * t + step + np.random.normal(0, 0.12)
                    i_iddq = i_iddq_0 + 0.015 * t + (step * 0.8) + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.003 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.006)

                elif profile == "CORRELATED_MULTIVARIATE":
                    corr_factor = 0.00045 * sev_mult * (t ** 1.9)
                    i_leak = i_leak_0 + 0.025 * t + corr_factor + np.random.normal(0, 0.1)
                    i_iddq = i_iddq_0 + 0.08 * t + (corr_factor * 2.2) + np.random.normal(0, 0.25)
                    t_pd = t_pd_0 + 0.015 * t + (corr_factor * 0.1) + np.random.normal(0, 0.05)
                    v_ref = v_ref_0 + np.random.normal(0, 0.008)

                elif profile in ["ACCELERATING_LATENT_DEFECT", "ACCELERATING_LOT_PATTERN"]:
                    base_accel = 0.00065 if profile == "ACCELERATING_LATENT_DEFECT" else 0.00055
                    accel_factor = base_accel * sev_mult
                    i_leak = i_leak_0 + 0.02 * t + accel_factor * (t ** 2) + np.random.normal(0, 0.12)
                    i_iddq = i_iddq_0 + 0.05 * t + (0.0008 * sev_mult) * (t ** 2) + np.random.normal(0, 0.25)
                    t_pd = t_pd_0 + 0.012 * t + (0.0002 * sev_mult) * (t ** 2) + np.random.normal(0, 0.06)
                    v_ref = v_ref_0 + np.random.normal(0, 0.01)

                elif profile == "COMMON_MODE_INSTRUMENT_SHIFT":
                    # Simultaneous chamber temperature jump at 96h affecting entire channel
                    chamber_step = 2.8 if t >= 96 else 0.0
                    i_leak = i_leak_0 + 0.005 * t + chamber_step + np.random.normal(0, 0.1)
                    i_iddq = i_iddq_0 + 0.01 * t + (chamber_step * 1.5) + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.002 * t + np.random.normal(0, 0.04)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)

                elif profile == "NOISY_MEASUREMENT":
                    glitch = 2.5 if t == 24 else 0.0
                    i_leak = i_leak_0 + 0.004 * t + glitch + np.random.normal(0, 0.2)
                    i_iddq = i_iddq_0 + 0.01 * t + np.random.normal(0, 0.2)
                    t_pd = t_pd_0 + 0.002 * t + np.random.normal(0, 0.05)
                    v_ref = v_ref_0 + np.random.normal(0, 0.005)

                stage_name = f"{t}h"
                
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
        "source": "Arrhenius-Inspired Synthetic Degradation Model",
        "benchmark_type": "SYNTHETIC BENCHMARK",
        "total_records": len(df),
        "total_components": len(ground_truth),
        "total_lots": num_lots,
        "ground_truth": ground_truth,
        "defect_severity": defect_severity,
        "arrhenius_parameters": {
            "activation_energy_eV": activation_energy_eV,
            "stress_temp_celsius": stress_temp_celsius,
            "use_temp_celsius": use_temp_celsius,
            "acceleration_factor": round(af, 1),
            "disclaimer": "Production deployment requires component-specific degradation parameters and validated stress models."
        },
        "parameters": list(DEFAULT_PARAMETER_SPECS.keys())
    }
    return df, meta
