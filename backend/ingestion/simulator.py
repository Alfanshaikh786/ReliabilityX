"""
ReliabilityX Live Telemetry Simulator Adapter
Simulates realistic automated test equipment (ATE) burn-in chamber telemetry.
Provides fine-grained physics-based degradation models and subtle defect injection scenarios.
"""
from __future__ import annotations
import asyncio
import math
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from backend.ingestion.base import TelemetrySource, TelemetryPacket
from backend.core.config import DEFAULT_PARAMETER_SPECS


class LiveSimulatorAdapter(TelemetrySource):
    """
    Realistic Telemetry Simulator for Burn-In & Screening Equipment.
    Explicitly labeled: LIVE TELEMETRY SIMULATOR.
    Generates subtle, non-trivial degradation trajectories across standard semiconductor mechanisms:
    - Normal components (baseline thermal drift + Gaussian noise)
    - Gradual wearout drift (sub-threshold leakage migration)
    - Accelerating runaway (Arrhenius positive acceleration)
    - Noisy components (random telegraph noise / dielectric micro-breakdowns)
    - Lot-wide contamination (synchronous baseline elevation across multiple lot peers)
    - Isolated outliers
    - Sensor spikes (transient glitches)
    - Missing telemetry intervals
    - Stuck sensor condition (frozen ADC converter)
    """

    SCENARIOS = [
        "NORMAL",
        "GRADUAL_DRIFT",
        "ACCELERATING_RUNAWAY",
        "DECELERATING_DRIFT",
        "SUDDEN_STEP_CHANGE",
        "CORRELATED_MULTIVARIATE",
        "DELAYED_MEASUREMENT",
        "NOISY_COMPONENT",
        "LOT_WIDE_CONTAMINATION",
        "ISOLATED_OUTLIER",
        "SENSOR_SPIKE",
        "MISSING_DATA",
        "STUCK_SENSOR"
    ]

    def __init__(self, source_name: str = "SIMULATED_ATE_01"):
        super().__init__(source_name=source_name)
        self.sampling_rate_sec: float = 1.0
        self.sampling_rate_hz: float = 1.0
        self.selected_component: str = "C-01008"
        self.selected_lot: str = "LOT-2411A"
        self.selected_parameter: str = "leakage_current_uA"
        self.scenario: str = "ACCELERATING_RUNAWAY"
        
        # Simulation internal state
        self.sim_hour: float = 0.0
        self.max_burnin_hours: float = 168.0
        self.hour_increment: float = 2.5 # ~67 steps to cover full 168h burn-in
        self._is_paused: bool = False
        self._task: Optional[asyncio.Task] = None
        self._stuck_value: Optional[float] = None
        self._spike_counter: int = 0
        self._step_count: int = 0
        self._sub_components = self._load_lot_components(self.selected_lot)
        self._comp_index = 0

    def _load_lot_components(self, lot_id: str) -> List[str]:
        """Loads available components for the target lot from database."""
        try:
            import sqlite3
            from backend.core.config import CONFIG
            conn = sqlite3.connect(CONFIG.db_path)
            c = conn.cursor()
            c.execute("SELECT DISTINCT component_id FROM components WHERE lot_id = ? ORDER BY component_id", (lot_id,))
            comps = [r[0] for r in c.fetchall()]
            conn.close()
            if comps:
                return comps
        except Exception:
            pass
        return ["C-01008", "C-01009", "C-01010", "C-01011", "C-01012"]

    async def connect(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Configures and starts the background generator loop."""
        if config:
            self.configure(config)
        self.is_connected = True
        self._is_paused = False
        self._last_error = None
        
        # Start generator loop task if not running
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run_loop())
        return True

    def configure(self, config: Dict[str, Any]) -> None:
        """Updates simulation parameters dynamically without resetting state."""
        if "sampling_rate" in config:
            self.sampling_rate_sec = max(0.05, min(10.0, float(config["sampling_rate"])))
            self.sampling_rate_hz = 1.0 / self.sampling_rate_sec
        if "component_id" in config and config["component_id"]:
            self.selected_component = str(config["component_id"])
        if "lot_id" in config and config["lot_id"]:
            self.selected_lot = str(config["lot_id"])
            self._sub_components = self._load_lot_components(self.selected_lot)
        if "parameter" in config and config["parameter"]:
            self.selected_parameter = str(config["parameter"])
        if "scenario" in config and config["scenario"] in self.SCENARIOS:
            self.scenario = str(config["scenario"])
        if "reset_hours" in config and config["reset_hours"]:
            self.sim_hour = 0.0
            self._step_count = 0
            self._stuck_value = None
            self._base_start_time = None

    async def pause(self) -> None:
        """Temporarily pauses packet emission."""
        self._is_paused = True

    async def resume(self) -> None:
        """Resumes packet emission."""
        self._is_paused = False

    async def stop(self) -> None:
        """Stops the generator loop and resets simulation cursor."""
        self._is_paused = False
        self.is_connected = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        self.sim_hour = 0.0
        self._step_count = 0
        self._stuck_value = None

    async def disconnect(self) -> bool:
        await self.stop()
        return True

    async def read(self) -> Optional[TelemetryPacket]:
        """Generates a single telemetry sample packet based on current state."""
        if not self.is_connected or self._is_paused:
            return None

        # Determine which component to generate for this tick
        if self.scenario == "LOT_WIDE_CONTAMINATION":
            # Cycle through components in the lot to show synchronized degradation
            active_comp = self._sub_components[self._comp_index % len(self._sub_components)]
            self._comp_index += 1
        else:
            active_comp = self.selected_component

        # Get spec for selected parameter
        spec = DEFAULT_PARAMETER_SPECS.get(
            self.selected_parameter,
            DEFAULT_PARAMETER_SPECS["leakage_current_uA"]
        )
        base_val = spec.nominal_baseline
        max_lim = spec.max_limit
        unit = spec.unit

        t = self.sim_hour
        quality = "GOOD"
        val = base_val

        # Physics-based Trajectory Generation
        if self.scenario == "NORMAL":
            # Very mild thermal slope (e.g. +0.003 units/hr) with small realistic noise
            drift = 0.003 * t
            noise = random.gauss(0, 0.05 * base_val)
            val = base_val + drift + noise

        elif self.scenario == "GRADUAL_DRIFT":
            # Linear wearout drift without rapid acceleration: slope ~0.045 uA/hr
            drift = 0.045 * t
            noise = random.gauss(0, 0.04 * base_val)
            val = base_val + drift + noise

        elif self.scenario == "ACCELERATING_RUNAWAY":
            # Subtly normal at first, then Arrhenius runaway: v(t) = v0 + alpha*t + beta*t^1.8
            # Early hours (<30h) drift is subtle (~0.015/h); after 60h acceleration becomes pronounced
            alpha = 0.015
            beta = 0.00035 * (t ** 1.85)
            noise = random.gauss(0, 0.06 * base_val)
            val = base_val + (alpha * t) + beta + noise

        elif self.scenario == "NOISY_COMPONENT":
            # Erratic dielectric RTN steps with high standard deviation
            step = 0.4 if (int(t / 15) % 2 == 1) else -0.2
            noise = random.gauss(0, 0.35 * base_val)
            drift = 0.02 * t
            val = base_val + drift + step + noise

        elif self.scenario == "LOT_WIDE_CONTAMINATION":
            # Multiple components in LOT-2411C show concurrent elevation
            # Each component has a slight individual offset, but all share +0.055 slope
            comp_seed = sum(ord(c) for c in active_comp) % 10
            offset = 0.8 + (comp_seed * 0.15)
            drift = 0.055 * t
            noise = random.gauss(0, 0.05 * base_val)
            val = base_val + offset + drift + noise

        elif self.scenario == "ISOLATED_OUTLIER":
            # Specific component runs away while lot peers stay nominal
            drift = 0.065 * t
            noise = random.gauss(0, 0.05 * base_val)
            val = base_val + drift + noise

        elif self.scenario == "SENSOR_SPIKE":
            # Normal baseline, but occasionally emits a single transient spike
            self._spike_counter += 1
            if self._spike_counter % 8 == 0:
                val = max_lim * 0.92 + random.gauss(0, 0.5)
                quality = "SUSPECT_SPIKE"
            else:
                drift = 0.005 * t
                noise = random.gauss(0, 0.04 * base_val)
                val = base_val + drift + noise

        elif self.scenario == "MISSING_DATA":
            # Simulates intermittent telemetry dropouts
            if random.random() < 0.25:
                quality = "MISSING"
                val = float("nan")
            else:
                val = base_val + (0.01 * t) + random.gauss(0, 0.05 * base_val)

        elif self.scenario == "DECELERATING_DRIFT":
            # Wearout that saturates/decelerates over burn-in duration (infant mortality that stabilizes)
            sat = 3.5 * (1.0 - math.exp(-max(0.0, t) / 30.0))
            noise = random.gauss(0, 0.04 * base_val)
            val = base_val + sat + noise

        elif self.scenario == "SUDDEN_STEP_CHANGE":
            # Latent bond/thermal defect triggering an abrupt step change after 48h
            step = 3.6 if t >= 48.0 else 0.0
            drift = 0.008 * t
            noise = random.gauss(0, 0.04 * base_val)
            val = base_val + drift + step + noise

        elif self.scenario == "CORRELATED_MULTIVARIATE":
            # Correlated degradation across junction
            drift = 0.02 * t + 0.00035 * (t ** 1.9)
            noise = random.gauss(0, 0.05 * base_val)
            val = base_val + drift + noise

        elif self.scenario == "DELAYED_MEASUREMENT":
            # Realistic telemetry delay with small timestamp perturbation
            drift = 0.015 * t
            noise = random.gauss(0, 0.04 * base_val)
            val = base_val + drift + noise

        elif self.scenario == "STUCK_SENSOR":
            # ADC freeze: outputs identical reading repeatedly
            if self._stuck_value is None:
                self._stuck_value = round(base_val + 2.34, 3)
            val = self._stuck_value
            if self._step_count > 4:
                quality = "STUCK"

        # Apply physical lower bound
        if not math.isnan(val):
            val = max(spec.min_limit, round(val, 3))
            if val >= max_lim:
                quality = "LIMIT_BREACH" if quality == "GOOD" else quality

        # Determine test checkpoint stage label
        stage = "BURN_IN"
        if abs(t - 0.0) < 1.0:
            stage = "0h"
        elif abs(t - 24.0) < 2.0:
            stage = "24h"
        elif abs(t - 96.0) < 3.0:
            stage = "96h"
        elif abs(t - 168.0) < 3.0:
            stage = "168h"

        # Advance sample timestamp cleanly per step
        if not hasattr(self, "_base_start_time") or self._base_start_time is None:
            self._base_start_time = datetime.now(timezone.utc).replace(microsecond=0)
        sample_dt = self._base_start_time + timedelta(seconds=float(self._step_count * self.sampling_rate_sec))
        sample_time_iso = sample_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

        packet = TelemetryPacket(
            component_id=active_comp,
            lot_id=self.selected_lot,
            timestamp=sample_time_iso,
            timestamp_hours=round(self.sim_hour, 1),
            test_stage=stage,
            parameter=self.selected_parameter,
            value=0.0 if math.isnan(val) else val,
            unit=unit,
            source=self.source_name,
            source_type="SIMULATED",
            quality=quality,
            extra={
                "scenario": self.scenario,
                "step_count": self._step_count,
                "is_simulated": True
            }
        )

        # Advance simulation time
        self._step_count += 1
        self.sim_hour += self.hour_increment
        if self.sim_hour > self.max_burnin_hours:
            # Wrap around or continue running
            self.sim_hour = 0.0
            self._spike_counter = 0

        return packet

    async def _run_loop(self) -> None:
        """Internal asynchronous generator loop running in background."""
        while self.is_connected:
            try:
                if not self._is_paused:
                    packet = await self.read()
                    if packet is not None:
                        await self.emit(packet)
                await asyncio.sleep(self.sampling_rate_sec)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._last_error = f"Simulator loop exception: {str(e)}"
                await asyncio.sleep(1.0)
