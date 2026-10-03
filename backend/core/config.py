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
    # DPAT k-factor (DPAT-inspired statistical analysis; 3.0 provides robust outlier detection)
    # Note: AEC-Q001 specifies 3–6 sigma; this is a configurable screening parameter.
    dpat_k_factor: float = 3.0
    dpat_note: str = (
        "Lot-relative statistical screening (DPAT-inspired). Not an AEC-Q001 compliance claim. "
        "Threshold calibration requires validation against component-specific historical data."
    )

    # Statistical Z-score thresholds
    z_score_threshold: float = 3.0
    robust_z_threshold: float = 3.0

    # Drift acceleration threshold (positive acceleration in units/hr^2)
    acceleration_warning_threshold: float = 0.0005
    acceleration_alarm_threshold: float = 0.002

    # Cost model: cost of missing a defective flight part vs cost of reviewing/scrapping a good part
    miss_to_false_alarm_cost_ratio: float = 50.0

    # Uncertainty multiplier for P90 confidence boundary (1.282 for 90th percentile)
    p90_z_multiplier: float = 1.282
    p95_z_multiplier: float = 1.645

    # Model Ladder selection
    default_prediction_model: str = "gradient_boosting"

    # Database (supports Vercel serverless ephemeral /tmp path)
    db_path: str = os.environ.get("RELIABILITYX_DB_PATH", "/tmp/reliabilityx.db" if os.environ.get("VERCEL") else "reliabilityx.db")

    # Versioning
    model_version: str = "v1.4.0-physics-ensemble"
    pipeline_version: str = "ReliabilityX-Core-2026.1"

    # -----------------------------------------------------------------------
    # TELEMETRY INTERVAL CONFIGURATION (Part 7 — Configurable Stale Timeout)
    # -----------------------------------------------------------------------
    # Expected inter-packet arrival interval for the active telemetry source.
    # Adjust based on equipment sampling rate (e.g., 1 s for fast ATE, 60 s for MQTT).
    expected_interval_seconds: float = 1.0

    # STALE detection: if no packet arrives within this many seconds, status → STALE.
    # Default: 5× the expected interval for single-source streaming.
    stale_timeout_seconds: float = 5.0

    # -----------------------------------------------------------------------
    # PHYSICS MODEL DISCLAIMER (Part 5 — Arrhenius Activation Energy)
    # -----------------------------------------------------------------------
    # Default Arrhenius activation energy used in the prototype.
    # This is a PROTOTYPE/DEFAULT parameter — NOT a universal semiconductor value.
    # Calibration against component-specific HTOL data is required for production use.
    arrhenius_activation_energy_eV: float = 0.7   # eV — prototype default
    arrhenius_parameter_status: str = "PROTOTYPE_DEFAULT"
    arrhenius_calibration_note: str = (
        "Physics model parameters are configurable and require calibration against "
        "component-specific reliability data. The default Ea=0.7 eV is a prototype "
        "placeholder; it is not a universal semiconductor value."
    )
    arrhenius_voltage_exponent_beta: float = 2.0  # prototype default

CONFIG = SystemConfig()
