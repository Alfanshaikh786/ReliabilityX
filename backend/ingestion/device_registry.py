"""
ReliabilityX Hardware Device Registry & Configuration Model
Manages device configurations, interface routing, calibration metadata,
and hardware health taxonomy for semiconductor test equipment.

Strict Provenance Constraint:
Keeps credentials/secrets out of source code.
Distinguishes SIMULATED, REPLAY, and LIVE_HARDWARE sources.
No physical hardware validation is claimed.
"""
from __future__ import annotations
import os
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator


class InterfaceType(str, Enum):
    """Supported instrument bus interface standards."""
    SCPI_ETHERNET_LXI = "SCPI_ETHERNET_LXI"
    GPIB_IEEE488 = "GPIB_IEEE488"
    USBTMC = "USBTMC"
    MQTT_GATEWAY = "MQTT_GATEWAY"
    STDF_REPLAY = "STDF_REPLAY"
    SIMULATOR_MOCK = "SIMULATOR_MOCK"


class HardwareHealthStatus(str, Enum):
    """Standardized hardware connection and telemetry health indicators."""
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    ERROR = "ERROR"
    STALE_TELEMETRY = "STALE_TELEMETRY"
    CALIBRATION_WARNING = "CALIBRATION_WARNING"
    IDENTITY_MISMATCH = "IDENTITY_MISMATCH"


class HardwareConnectionState(str, Enum):
    """Explicit connection verification states for LIVE_HARDWARE."""
    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    VERIFIED = "VERIFIED"
    STREAMING = "STREAMING"
    CONNECTION_LOST = "CONNECTION_LOST"


class SimulatorState(str, Enum):
    """Explicit states for SIMULATION mode."""
    SIMULATOR_STANDBY = "SIMULATOR_STANDBY"
    SIMULATOR_TESTING = "SIMULATOR_TESTING"
    SIMULATOR_VERIFIED = "SIMULATOR_VERIFIED"
    SIMULATOR_STREAMING = "SIMULATOR_STREAMING"
    SIMULATOR_STOPPED = "SIMULATOR_STOPPED"


class ReplayState(str, Enum):
    """Explicit states for REPLAY mode."""
    REPLAY_STANDBY = "REPLAY_STANDBY"
    REPLAY_TESTING = "REPLAY_TESTING"
    REPLAY_VERIFIED = "REPLAY_VERIFIED"
    REPLAY_STREAMING = "REPLAY_STREAMING"
    REPLAY_STOPPED = "REPLAY_STOPPED"


class CalibrationStatus(str, Enum):
    """
    Standardized calibration certification status.
    Uses NIST-traceable calibration metadata, where applicable.
    """
    CALIBRATION_VALID = "CALIBRATION_VALID"
    CALIBRATION_EXPIRING = "CALIBRATION_EXPIRING"
    CALIBRATION_EXPIRED = "CALIBRATION_EXPIRED"
    CALIBRATION_UNKNOWN = "CALIBRATION_UNKNOWN"
    CALIBRATION_UNVERIFIED = "CALIBRATION_UNVERIFIED"
    SIMULATION_PROFILE = "SIMULATION_PROFILE"
    REPLAY_METADATA = "REPLAY_METADATA"

    # Backward-compatibility aliases
    VALID = "CALIBRATION_VALID"
    WARNING = "CALIBRATION_EXPIRING"
    EXPIRED = "CALIBRATION_EXPIRED"
    UNVERIFIED = "CALIBRATION_UNVERIFIED"


class DeviceConfiguration(BaseModel):
    """
    Hardware Device Configuration Model.
    Represents physical or simulated automated test equipment (ATE),
    Source Measure Units (SMUs), thermal chambers, or DAQ controllers.
    """
    device_id: str = Field(..., description="Unique alphanumeric device registry ID, e.g. DEV-SMU-01")
    manufacturer: str = Field(..., description="Instrument manufacturer, e.g. Keithley / Keysight / Chroma")
    model: str = Field(..., description="Instrument model number, e.g. 2602B, B2901B, 3706A")
    serial_number: str = Field(..., description="Hardware serial number from *IDN? query")
    interface_type: InterfaceType = Field(InterfaceType.SCPI_ETHERNET_LXI, description="Physical bus interface")
    host: Optional[str] = Field(default=None, description="IP address or hostname for Ethernet/LXI")
    port: Optional[int] = Field(default=5025, description="Port number (5025 for raw SCPI, 4880 for HiSLIP)")
    gpib_address: Optional[int] = Field(default=None, ge=0, le=30, description="GPIB primary address (0-30)")
    station_id: str = Field(..., description="Test-cell or burn-in bench identifier, e.g. ATE-BURNIN-STATION-01")
    channel_id: str = Field("CH1", description="Instrument channel ID, e.g. CH1_SMU_A, CH2_SMU_B")
    instrument_id: str = Field(..., description="Identifier combining model and serial, e.g. SMU-KEITHLEY-2602B-SN8912")
    calibration_id: str = Field(..., description="Calibration certificate ID with NIST-traceable calibration metadata, where applicable")
    calibration_status: CalibrationStatus = Field(CalibrationStatus.CALIBRATION_VALID, description="Calibration status")
    calibration_expiry: str = Field(..., description="ISO-8601 calibration expiration timestamp")
    calibration_date: Optional[str] = Field(default="2026-01-15T00:00:00Z", description="ISO-8601 calibration certificate date")
    calibration_provider: Optional[str] = Field(default="Accredited Metrology Facility", description="Calibration service provider")
    calibration_traceability: Optional[str] = Field(default="NIST-traceable calibration metadata, where applicable", description="Traceability reference")
    source_type: str = Field("LIVE_HARDWARE", description="Data provenance: SIMULATED, REPLAY, or LIVE_HARDWARE")
    notes: Optional[str] = Field(default=None, description="Operational notes or calibration standards reference")

    @validator("calibration_expiry")
    def validate_expiry_format(cls, v: str) -> str:
        try:
            # Normalize ISO timestamp
            clean = v.replace("Z", "+00:00")
            datetime.fromisoformat(clean)
            return v
        except Exception:
            raise ValueError(f"Invalid ISO-8601 timestamp for calibration_expiry: {v}")

    def is_calibration_valid(self) -> bool:
        """
        Checks if current time is before calibration expiration.
        Strict Provenance Invariant: Simulated fixtures and replay datasets do NOT claim
        genuine physical NIST calibration validity.
        """
        if self.source_type in ("SIMULATED", "REPLAY"):
            return False
        try:
            clean = self.calibration_expiry.replace("Z", "+00:00")
            exp_dt = datetime.fromisoformat(clean)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            return datetime.now(timezone.utc) < exp_dt
        except Exception:
            return False

    def get_calibration_metadata(self) -> Dict[str, Any]:
        """Returns structured calibration metadata with disclaimer caveat."""
        if self.source_type == "SIMULATED":
            return {
                "calibration_id": self.calibration_id,
                "calibration_status": CalibrationStatus.SIMULATION_PROFILE.value,
                "calibration_date": self.calibration_date,
                "calibration_expiry": self.calibration_expiry,
                "calibration_provider": self.calibration_provider or "Virtual Bench Test Framework",
                "calibration_traceability": "Simulated Calibration Profile — Physical Calibration Not Verified",
                "traceability_statement": "Simulated Calibration Profile — Physical Calibration Not Verified",
                "is_valid": False,
                "scientific_caveat": (
                    "Simulated calibration metadata for virtual test bench. "
                    "Physical hardware validation remains pending; no physical NIST-traceable calibration is claimed."
                )
            }
        elif self.source_type == "REPLAY":
            return {
                "calibration_id": self.calibration_id,
                "calibration_status": CalibrationStatus.REPLAY_METADATA.value,
                "calibration_date": self.calibration_date,
                "calibration_expiry": self.calibration_expiry,
                "calibration_provider": self.calibration_provider or "Historical Benchmark Archive",
                "calibration_traceability": "Replay Benchmark Metadata",
                "traceability_statement": "Replay Benchmark Metadata",
                "is_valid": False,
                "scientific_caveat": (
                    "Historical benchmark replay metadata. "
                    "Physical hardware validation remains pending; no live physical calibration is claimed."
                )
            }

        is_valid = self.is_calibration_valid()
        clean = self.calibration_expiry.replace("Z", "+00:00")
        exp_dt = datetime.fromisoformat(clean)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)

        # Determine granular state
        if not is_valid:
            status = CalibrationStatus.CALIBRATION_EXPIRED.value
        elif (exp_dt - now).days < 30:
            status = CalibrationStatus.CALIBRATION_EXPIRING.value
        else:
            status = CalibrationStatus.CALIBRATION_VALID.value

        return {
            "calibration_id": self.calibration_id,
            "calibration_status": status,
            "calibration_date": self.calibration_date,
            "calibration_expiry": self.calibration_expiry,
            "calibration_provider": self.calibration_provider,
            "calibration_traceability": self.calibration_traceability,
            "traceability_statement": "NIST-traceable calibration metadata, where applicable",
            "is_valid": is_valid,
            "scientific_caveat": (
                "NIST-traceable calibration metadata, where applicable. "
                "Calibration validity indicates certificate traceability; it does not "
                "constitute proof that every individual measurement is scientifically correct."
            )
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.dict()


class DeviceRegistry:
    """
    Registry for configured and discovered semiconductor test equipment.
    Separates simulated fixtures from physical hardware devices.
    """

    def __init__(self):
        self._devices: Dict[str, DeviceConfiguration] = {}
        self._init_default_registry()

    def _init_default_registry(self) -> None:
        """Populates the registry with standard reference instrument configurations."""
        # 1. Physical ATE Bench Reference (Hardware-ready specification)
        hw_smu = DeviceConfiguration(
            device_id="DEV-SMU-KEITHLEY-01",
            manufacturer="Keithley Instruments",
            model="2602B System SourceMeter",
            serial_number="4102941",
            interface_type=InterfaceType.SCPI_ETHERNET_LXI,
            host="192.168.1.120",
            port=5025,
            gpib_address=None,
            station_id="ATE-BURNIN-STATION-01",
            channel_id="CH1_SMU_A",
            instrument_id="SMU-KEITHLEY-2602B-SN4102941",
            calibration_id="CAL-NIST-2026-0881",
            calibration_status=CalibrationStatus.CALIBRATION_VALID,
            calibration_expiry="2027-04-30T00:00:00Z",
            calibration_date="2026-01-15T00:00:00Z",
            calibration_provider="Accredited Metrology Facility",
            calibration_traceability="NIST-traceable calibration metadata, where applicable",
            source_type="LIVE_HARDWARE",
            notes="Kelvin 4-wire sub-pA parametric leakage screening SMU. Requires live physical connection."
        )

        # 2. Environmental Stress Screening Chamber (Hardware-ready specification)
        hw_chamber = DeviceConfiguration(
            device_id="DEV-CHAMBER-THERMOTRON-01",
            manufacturer="Thermotron",
            model="SE-Series Environmental Chamber",
            serial_number="TH-88219",
            interface_type=InterfaceType.GPIB_IEEE488,
            host=None,
            port=None,
            gpib_address=17,
            station_id="ATE-BURNIN-STATION-01",
            channel_id="CH_TEMP_PROFILE",
            instrument_id="CHAMBER-THERMOTRON-SE-SN88219",
            calibration_id="CAL-THERM-2026-110",
            calibration_status=CalibrationStatus.CALIBRATION_VALID,
            calibration_expiry="2027-02-15T00:00:00Z",
            calibration_date="2026-02-15T00:00:00Z",
            calibration_provider="Thermal Metrology Lab",
            calibration_traceability="NIST-traceable calibration metadata, where applicable",
            source_type="LIVE_HARDWARE",
            notes="Thermal cycle -55°C to +125°C chamber controller. Requires physical GPIB-to-USB/Ethernet bridge."
        )

        # 3. SEMI E183 RITdb / MQTT Gateway (Hardware-ready specification)
        hw_mqtt = DeviceConfiguration(
            device_id="DEV-GATEWAY-SEMI-E183",
            manufacturer="SEMI RITdb Edge Node",
            model="SEMI E183-Inspired Telemetry Bridge",
            serial_number="RITDB-NODE-004",
            interface_type=InterfaceType.MQTT_GATEWAY,
            host="127.0.0.1",
            port=1883,
            gpib_address=None,
            station_id="ATE-BURNIN-STATION-01",
            channel_id="CH_MULTI_RITDB",
            instrument_id="GATEWAY-RITDB-NODE-004",
            calibration_id="GATEWAY-SYS-CERT-2026",
            calibration_status=CalibrationStatus.CALIBRATION_VALID,
            calibration_expiry="2027-12-31T23:59:59Z",
            calibration_date="2026-01-01T00:00:00Z",
            calibration_provider="Edge Systems QA",
            calibration_traceability="NIST-traceable calibration metadata, where applicable",
            source_type="LIVE_HARDWARE",
            notes="MQTT-based telemetry architecture aligned with SEMI E183 RITdb real-time test-data exchange concepts."
        )

        # 4. Standard Hardware Mock / Simulator (Explicitly SIMULATED)
        sim_fixture = DeviceConfiguration(
            device_id="DEV-SIM-ATE-MOCK",
            manufacturer="ReliabilityX Virtual Bench",
            model="Simulated Multi-Channel SMU Bench",
            serial_number="SIM-VIRTUAL-8801",
            interface_type=InterfaceType.SIMULATOR_MOCK,
            host="127.0.0.1",
            port=0,
            gpib_address=None,
            station_id="ATE-SIM-BENCH-01",
            channel_id="CH1_VIRTUAL",
            instrument_id="SIM-SMU-BENCH-8801",
            calibration_id="DEMO-SIM-CAL-TEST-BENCH-2026",
            calibration_status=CalibrationStatus.SIMULATION_PROFILE,
            calibration_expiry="2028-01-01T00:00:00Z",
            calibration_date="2026-01-01T00:00:00Z",
            calibration_provider="Virtual Bench Test Framework",
            calibration_traceability="Simulated Calibration Profile — Physical Calibration Not Verified",
            source_type="SIMULATED",
            notes="High-fidelity aerospace burn-in simulator fixture for offline integration and algorithm testing."
        )

        self.register(hw_smu)
        hw_smu_alias = DeviceConfiguration(**hw_smu.to_dict())
        hw_smu_alias.device_id = "DEV-SMU-KEITHLEY-2602B"
        self.register(hw_smu_alias)

        self.register(hw_chamber)
        self.register(hw_mqtt)
        self.register(sim_fixture)

    def register(self, config: DeviceConfiguration) -> None:
        """Registers or updates a device configuration."""
        self._devices[config.device_id] = config

    def unregister(self, device_id: str) -> Optional[DeviceConfiguration]:
        """Removes a device configuration by ID."""
        return self._devices.pop(device_id, None)

    def get(self, device_id: str) -> Optional[DeviceConfiguration]:
        """Retrieves a device configuration by ID."""
        if device_id in self._devices:
            return self._devices[device_id]
        if device_id == "DEV-SMU-KEITHLEY-2602B":
            return self._devices.get("DEV-SMU-KEITHLEY-01")
        return None

    def get_device(self, device_id: str) -> Optional[DeviceConfiguration]:
        """Alias for get(device_id)."""
        return self.get(device_id)

    def list_all(self) -> List[DeviceConfiguration]:
        """Returns all configured devices."""
        return list(self._devices.values())

    def list_by_source_type(self, source_type: str) -> List[DeviceConfiguration]:
        """Filters registered devices by source type."""
        return [d for d in self._devices.values() if d.source_type == source_type]

    def list_physical_hardware(self) -> List[DeviceConfiguration]:
        """Returns only devices intended for real physical test equipment."""
        return [d for d in self._devices.values() if d.source_type == "LIVE_HARDWARE"]

    def list_simulated(self) -> List[DeviceConfiguration]:
        """Returns only mock/simulated fixtures."""
        return [d for d in self._devices.values() if d.source_type == "SIMULATED"]


# Global singleton registry instance
DEVICE_REGISTRY = DeviceRegistry()
