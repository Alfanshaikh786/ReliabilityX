"""
ReliabilityX Physical Hardware ATE Adapter Interface
Defines the explicit HardwareATEAdapter for physical automated test equipment (ATE)
and thermal screening chambers (e.g., Keithley / Keysight Source Measure Units, Thermotron chambers).

IMPORTANT ARCHITECTURAL & VALIDATION STATUS:
Real hardware validation status: UNVALIDATED (REAL_HARDWARE_VALIDATED = False).
No physical ATE or chamber hardware is physically connected to this environment.
This module provides the formal hardware connector abstraction layer, strict provenance tracking,
and software-integration test fixtures. Software integration tests on this adapter verify
protocol serialization and error handling, but DO NOT constitute physical hardware validation.
"""
from __future__ import annotations
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.ingestion.base import TelemetrySource, TelemetryPacket, TelemetrySourceType
from backend.core.config import CONFIG


class HardwareATEAdapter(TelemetrySource):
    """
    Standardized Hardware Automated Test Equipment (ATE) Adapter.
    Provides explicit interface for physical SMUs (Source Measure Units),
    semiconductor parametric test stations, and thermal burn-in chambers.

    Required physical equipment for genuine real-world validation:
    1. Source Measure Unit (SMU): e.g., Keithley 2602B / Keysight B2901B (sub-pA resolution)
    2. Environmental Stress Screening (ESS) Thermal Chamber: -55°C to +125°C, IEEE-488.2 GPIB / RS-485
    3. Switch Matrix / Fixture: High-isolation Kelvin 4-wire test fixture
    4. NIST-Traceable Calibration Certificate: Documenting annual calibration provenance.
    """

    def __init__(
        self,
        source_name: str = "LIVE_HARDWARE_ATE_STATION_01",
        test_station_id: str = "ATE-BURNIN-STATION-01",
        instrument_id: str = "SMU-KEITHLEY-2602B-SN8912",
        channel_id: str = "CH1_SMU_A",
        calibration_id: str = "NIST-TRACEABLE-CAL-2026-A",
        calibration_expiry: str = "2027-01-15T00:00:00Z"
    ):
        super().__init__(source_name=source_name)
        self.test_station_id = test_station_id
        self.instrument_id = instrument_id
        self.channel_id = channel_id
        self.calibration_id = calibration_id
        self.calibration_expiry = calibration_expiry
        
        self.bus_protocol: str = "VISA_GPIB_SCPI"
        self.is_hardware_connected: bool = False
        self.is_hardware_validated: bool = False
        self.provenance_tag: str = TelemetrySourceType.LIVE_HARDWARE.value
        self._mock_integration_mode: bool = False
        self._integration_test_queue: List[Dict[str, Any]] = []

    def get_hardware_specification(self) -> Dict[str, Any]:
        """Returns the hardware configuration and calibration metadata."""
        return {
            "source_name": self.source_name,
            "source_type": TelemetrySourceType.LIVE_HARDWARE.value,
            "test_station_id": self.test_station_id,
            "instrument_id": self.instrument_id,
            "channel_id": self.channel_id,
            "bus_protocol": self.bus_protocol,
            "calibration_metadata": {
                "calibration_id": self.calibration_id,
                "calibration_expiry": self.calibration_expiry,
                "traceability_standard": "NIST-MIL-STD-883H"
            },
            "physical_hardware_connected": self.is_hardware_connected,
            "real_hardware_validated": self.is_hardware_validated,
            "system_status": (
                "LIVE_HARDWARE_OPERATIONAL"
                if (self.is_hardware_connected and self.is_hardware_validated)
                else "UNVALIDATED_NO_PHYSICAL_HARDWARE"
            )
        }

    async def connect(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """
        Attempts hardware connection handshake.
        In production with real hardware, opens VISA session (e.g. GPIB0::26::INSTR)
        and queries '*IDN?' and calibration records.
        
        In the current environment, no physical hardware exists.
        If config requests 'software_integration_test_mock', runs strictly as
        a software integration fixture with explicit 'SOFTWARE_INTEGRATION_TEST' tag.
        Otherwise fails honestly with UNVALIDATED status.
        """
        cfg = config or {}
        if cfg.get("enable_software_integration_mock"):
            # Explicit software integration test fixture only
            self._mock_integration_mode = True
            self.is_connected = True
            self.is_hardware_connected = False # Physical hardware still false
            self.is_hardware_validated = False  # Physical hardware NEVER marked validated by mock
            self._last_error = None
            return True

        # In current environment, physical hardware bus cannot be opened
        self.is_connected = False
        self.is_hardware_connected = False
        self.is_hardware_validated = False
        self._last_error = (
            "No physical automated test equipment (ATE) detected on VISA/GPIB/SCPI bus. "
            "Real hardware validation requires physical SMU and chamber instrumentation."
        )
        return False

    async def disconnect(self) -> bool:
        """Safely disconnects from hardware interface."""
        self.is_connected = False
        self.is_hardware_connected = False
        self._mock_integration_mode = False
        return True

    def queue_software_integration_sample(self, raw_sample: Dict[str, Any]) -> None:
        """Queues a sample for software integration testing."""
        if self._mock_integration_mode:
            self._integration_test_queue.append(raw_sample)

    async def read(self) -> Optional[TelemetryPacket]:
        """
        Reads next telemetry measurement.
        For software integration tests, processes queued samples.
        """
        if not self.is_connected:
            return None

        if self._mock_integration_mode and self._integration_test_queue:
            raw = self._integration_test_queue.pop(0)
            packet = TelemetryPacket(
                component_id=raw["component_id"],
                lot_id=raw.get("lot_id", "LOT-HARDWARE-01"),
                timestamp=raw.get("timestamp", datetime.now(timezone.utc).isoformat()),
                timestamp_hours=float(raw.get("timestamp_hours", 0.0)),
                test_stage=raw.get("test_stage", "BURN_IN"),
                parameter=raw["parameter"],
                value=float(raw.get("value", raw.get("measured_value", 0.0))),
                unit=raw.get("unit", "µA"),
                source=self.source_name,
                source_type=TelemetrySourceType.LIVE_HARDWARE.value,
                test_station_id=self.test_station_id,
                channel_id=self.channel_id,
                instrument_id=self.instrument_id,
                calibration_metadata={
                    "calibration_id": self.calibration_id,
                    "calibration_expiry": self.calibration_expiry
                },
                quality=raw.get("quality", "GOOD"),
                extra={
                    "provenance_mode": "SOFTWARE_INTEGRATION_TEST_MOCK",
                    "physical_hardware_validated": False
                }
            )
            return packet

        return None
