"""
ReliabilityX Live Telemetry Ingestion Layer
SIH26170 — AI-Driven Anomaly Detection in Component Burn-In & Screening
"""
from __future__ import annotations
from backend.ingestion.base import TelemetryPacket, TelemetrySource, TelemetrySourceType, ValidationResult, validate_raw_packet
from backend.ingestion.simulator import LiveSimulatorAdapter
from backend.ingestion.csv_adapter import CsvReplayAdapter
from backend.ingestion.mqtt_adapter import MqttAdapter
from backend.ingestion.hardware_adapter import HardwareATEAdapter
from backend.ingestion.hardware_interface import (
    BaseHardwareATEAdapter,
    ScpiEthernetLxiAdapter,
    GpibUsbtmcAdapter,
    HardwareSimulatorMockAdapter,
    HardwareSafetyViolation
)
from backend.ingestion.device_registry import (
    DeviceConfiguration,
    DeviceRegistry,
    DEVICE_REGISTRY,
    HardwareHealthStatus,
    CalibrationStatus,
    InterfaceType
)
from backend.ingestion.manager import IngestionManager

__all__ = [
    "TelemetryPacket",
    "TelemetrySource",
    "TelemetrySourceType",
    "ValidationResult",
    "validate_raw_packet",
    "LiveSimulatorAdapter",
    "CsvReplayAdapter",
    "MqttAdapter",
    "HardwareATEAdapter",
    "BaseHardwareATEAdapter",
    "ScpiEthernetLxiAdapter",
    "GpibUsbtmcAdapter",
    "HardwareSimulatorMockAdapter",
    "HardwareSafetyViolation",
    "DeviceConfiguration",
    "DeviceRegistry",
    "DEVICE_REGISTRY",
    "HardwareHealthStatus",
    "CalibrationStatus",
    "InterfaceType",
    "IngestionManager"
]
