"""
ReliabilityX Configuration & Engineering Specifications
Authoritative engineering limits, threshold configurations, and default parameter specs.
"""
from __future__ import annotations
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ParameterSpec(BaseModel):
    name: str
    display_name: str
    unit: str
    min_limit: float = 0.0
    max_limit: float
    nominal_baseline: float
    description: str
    is_critical: bool = True


DEFAULT_PARAMETER_SPECS: Dict[str, ParameterSpec] = {
    "leakage_current_uA": ParameterSpec(
        name="leakage_current_uA",
        display_name="Leakage Current (I_leak)",
        unit="µA",
        min_limit=0.0,
        max_limit=20.0,
        nominal_baseline=5.0,
        description="Subthreshold and gate oxide parasitic leakage current under 125°C thermal stress",
        is_critical=True
    ),
    "standby_current_mA": ParameterSpec(
        name="standby_current_mA",
        display_name="Standby Current (I_ddq)",
        unit="mA",
        min_limit=0.0,
        max_limit=50.0,
        nominal_baseline=18.0,
        description="Quiescent drain supply current under biased thermal stress",
        is_critical=True
    ),
    "propagation_delay_ns": ParameterSpec(
        name="propagation_delay_ns",
        display_name="Propagation Delay (t_pd)",
        unit="ns",
        min_limit=0.0,
        max_limit=12.0,
        nominal_baseline=4.5,
        description="Switching gate delay indicating transistor transconductance and threshold voltage degradation",
        is_critical=True
    ),
    "voltage_ref_V": ParameterSpec(
        name="voltage_ref_V",
        display_name="Reference Voltage (V_ref)",
        unit="V",
        min_limit=3.135,
        max_limit=3.465,
        nominal_baseline=3.30,
        description="Internal bandgap reference voltage stability check (±5% tolerance)",
        is_critical=False
    )
}

# Standard burn-in checkpoints
CHECKPOINTS = [0, 24, 96, 168]
CHECKPOINT_LABELS = ["0h", "24h", "96h", "168h"]

# Anomaly & Risk Threshold Configurations
class SystemConfig(BaseModel):
    # Positioning & Disclaimer
    system_positioning: str = (
        "AI-assisted early anomaly detection, degradation analysis, and predictive reliability decision "
        "support for high-reliability electronic component Burn-In and ESS screening. "
        "Engineering decision-support prototype; not an official qualification replacement or certified failure guarantee."
    )

    # DPAT k-factor (AEC-Q001-referenced robust lot-relative statistical screening)
    # References AEC-Q001 Part Average Testing principles using robust MAD estimation.
    # Used as an engineering statistical reference; not a claim of formal automotive or aerospace compliance.
    dpat_k_factor: float = 3.0
    dpat_note: str = (
        "AEC-Q001-referenced robust lot-relative statistical screening (DPAT). "
        "Used as a statistical methodology reference; not an aerospace standard compliance claim. "
        "Threshold calibration requires validation against component-specific historical data."
    )

    # Configurable ReliabilityX engineering safety-margin heuristic factor (default 0.80)
    # Used to provide an internal buffer when comparing predicted drift rate against the allowable boundary slope.
    # Not an official SIH26170 requirement or ISRO threshold.
    safety_margin_factor: float = 0.80
    safety_margin_factor_description: str = (
        "Configurable ReliabilityX engineering safety-margin factor heuristic used to provide "
        "an internal buffer when comparing predicted drift rate against the allowable boundary slope. "
        "Not an official SIH26170 or ISRO specification requirement."
    )

    # Statistical Z-score thresholds
    z_score_threshold: float = 3.0
    robust_z_threshold: float = 3.0

    # Dual-Path Telemetry Windows (Phase 3 & 4)
    # Fast path: Immediate per-sample deterministic checks (<15ms)
    # Windowed path: Deep analytical ML ensemble, trajectory forecast, and risk fusion
    ai_window_size: int = 6  # Run windowed ML every N incoming samples per stream
    fast_path_enabled: bool = True

    # Drift acceleration threshold (positive acceleration in units/hr^2) (Phase 10)
    acceleration_warning_threshold: float = 0.0005
    acceleration_alarm_threshold: float = 0.002
    acceleration_persistence_count: int = 2  # Minimum consecutive observations to confirm ACCELERATING state

    # Test-System / Sensor Health Layer Thresholds (Phase 5)
    # If >=70% of monitored components experience concurrent, synchronized step changes,
    # flag TEST_SYSTEM_ANOMALY rather than misclassifying individual components as failures.
    test_system_shift_ratio: float = 0.70

    # Lot-Wide Systemic Degradation Threshold (Phase 7)
    # If >=30% of a lot exhibits correlated directional drift, flag LOT_SYSTEMIC_SHIFT
    lot_systemic_shift_ratio: float = 0.30

    # Mahalanobis Covariance Safeguards (Phase 8)
    mahalanobis_min_samples: int = 8
    mahalanobis_max_condition_number: float = 1e4

    # Gating & Sensor Health Prototype Thresholds (Phase 8 Audit)
    forecast_gate_min_checkpoints: int = 3
    forecast_gate_min_hours: float = 20.0
    stuck_sensor_buffer_size: int = 5
    spike_iqr_multiplier: float = 5.0
    threshold_calibration_status: str = "PROTOTYPE_ENGINEERING_DEFAULT"
    threshold_governance_note: str = (
        "Prototype engineering thresholds; empirical calibration on historical burn-in/qualification "
        "datasets required before flight production screening deployment."
    )

    # Cost model: cost of missing a defective flight part vs cost of reviewing/scrapping a good part
    miss_to_false_alarm_cost_ratio: float = 50.0

    # Uncertainty multiplier for P90 confidence boundary (1.282 for 90th percentile)
    p90_z_multiplier: float = 1.282
    p95_z_multiplier: float = 1.645

    # Model Ladder selection
    default_prediction_model: str = "gradient_boosting"

    # Database (supports Vercel serverless ephemeral /tmp path)
    db_path: str = os.environ.get("RELIABILITYX_DB_PATH", os.environ.get("DATABASE_PATH", "/tmp/reliabilityx.db" if os.environ.get("VERCEL") else "reliabilityx.db"))

    # Versioning
    model_version: str = "v1.5.0-prognostic-support"
    pipeline_version: str = "ReliabilityX-Core-2026.2"

    # -----------------------------------------------------------------------
    # TELEMETRY INTERVAL CONFIGURATION (Configurable Stale Timeout)
    # -----------------------------------------------------------------------
    expected_interval_seconds: float = 1.0
    stale_timeout_seconds: float = 5.0

    # -----------------------------------------------------------------------
    # ARRHENIUS-INSPIRED SYNTHETIC DEGRADATION MODEL (Phase 29)
    # -----------------------------------------------------------------------
    # Configurable Arrhenius parameters for synthetic degradation generation.
    # Prototype default — production deployment requires component-specific degradation models.
    arrhenius_activation_energy_eV: float = 0.7   # eV — prototype default
    stress_temp_celsius: float = 125.0           # °C — typical accelerated burn-in temp
    use_temp_celsius: float = 25.0              # °C — nominal operating temp
    arrhenius_parameter_status: str = "PROTOTYPE_DEFAULT"
    arrhenius_calibration_note: str = (
        "Arrhenius-inspired synthetic degradation model parameters are configurable and require calibration "
        "against component-specific reliability data. The default Ea=0.7 eV is a synthetic benchmark parameter, "
        "not a universal semiconductor value."
    )
    arrhenius_voltage_exponent_beta: float = 2.0

    # -----------------------------------------------------------------------
    # PHYSICAL HARDWARE & PRODUCTION VALIDATION STATUS
    # -----------------------------------------------------------------------
    real_hardware_validated: bool = False
    hardware_validation_status: str = "UNVALIDATED_NO_PHYSICAL_HARDWARE"
    production_pipeline_parity_validated: bool = True
    production_deployment_validated: bool = False
    production_deployment_status: str = "UNVALIDATED_NO_PRODUCTION_DEPLOYMENT"
    hardware_validation_note: str = (
        "Real physical hardware validation status is UNVALIDATED. No physical automated test equipment (ATE) "
        "or environmental thermal chamber instruments are physically connected to this environment. "
        "The system provides an explicit Hardware ATE Adapter interface, but remains an engineering decision-support "
        "prototype evaluated against synthetic Arrhenius and historical CSV replay benchmarks."
    )

CONFIG = SystemConfig()

