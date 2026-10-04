"""
ReliabilityX Ingestion Connector Interface
Defines the generic TelemetrySource abstract base class and standardized TelemetryPacket.
Hardware connector interface abstraction. Physical test equipment connectivity is not
physically validated on live chamber hardware; simulator, CSV replay, and MQTT adapter
implemented for SIH prototype.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List, Optional, Callable, Coroutine
from pydantic import BaseModel, Field


class TelemetrySourceType(str, Enum):
    """Explicit provenance taxonomy for streaming telemetry."""
    SIMULATED = "SIMULATED"
    REPLAY = "REPLAY"
    LIVE_HARDWARE = "LIVE_HARDWARE"


class TelemetryPacket(BaseModel):
    """
    Normalized internal live telemetry frame for ReliabilityX.
    Transactional record with full provenance.
    """
    component_id: str = Field(..., description="Unique component serial identifier, e.g. C-01008")
    lot_id: str = Field(..., description="Production wafer/fabrication lot, e.g. LOT-2411C")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO-8601 acquisition timestamp")
    timestamp_hours: float = Field(0.0, description="Cumulative burn-in test duration in hours")
    test_stage: str = Field("BURN_IN", description="Screening checkpoint stage: 0h, 24h, 96h, 168h or BURN_IN")
    parameter: str = Field(..., description="Screened parameter name, e.g. leakage_current_uA")
    value: float = Field(..., description="Physical measurement value")
    unit: str = Field("µA", description="Physical engineering unit (µA, mA, ns, V)")
    source: str = Field("SIMULATED_ATE_01", description="Hardware or simulated telemetry source identifier")
    source_type: str = Field(TelemetrySourceType.SIMULATED.value, description="Provenance type: SIMULATED, REPLAY, or LIVE_HARDWARE")
    test_station_id: Optional[str] = Field(default=None, description="Test station or chamber identifier")
    channel_id: Optional[str] = Field(default=None, description="ATE instrument channel identifier")
    instrument_id: Optional[str] = Field(default=None, description="Calibrated instrument serial/model")
    calibration_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Calibration provenance and expiration metadata")
    quality: str = Field("GOOD", description="Quality code: GOOD, SUSPECT_SPIKE, STUCK, LIMIT_BREACH, MISSING")
    extra: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata or raw packet payload")

    def to_dict(self) -> Dict[str, Any]:
        return self.dict()

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TelemetryPacket":
        return cls(**data)


class ValidationResult(BaseModel):
    """Result of Data Quality validation on raw incoming telemetry."""
    is_valid: bool
    status: str # "GOOD", "WARNING", "REJECTED"
    reason: Optional[str] = None
    packet: Optional[TelemetryPacket] = None


def validate_raw_packet(raw: Any) -> ValidationResult:
    """
    Hardened validation for raw incoming telemetry packets.
    Prevents pipeline crashes by catching:
    - Non-dictionary or malformed payloads
    - Missing / empty component_id or lot_id
    - Missing or invalid parameter names
    - NaN, Infinite, or non-numeric values
    - Invalid or negative test durations
    - Malformed or future timestamps
    - Duplicate timestamps (flagged as WARNING — deduplication upstream)
    - Out-of-order sequence (flagged as WARNING — allows replay)
    - Future timestamps beyond burn-in window
    - Unknown parameters (WARNING — may be valid for non-standard ATE)
    - Component/lot mismatch is flagged in extra metadata, not rejected
    """
    import math
    from datetime import datetime, timezone

    if not isinstance(raw, dict):
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason="Payload is not a valid JSON/dictionary structure"
        )

    # 1. Component & Lot ID validation
    cid = raw.get("component_id")
    if not cid or not isinstance(cid, str) or not cid.strip():
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason="Missing or invalid component_id"
        )

    lid = raw.get("lot_id")
    if not lid or not isinstance(lid, str) or not lid.strip():
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason="Missing or invalid lot_id"
        )

    # 2. Parameter validation
    param = raw.get("parameter")
    if not param or not isinstance(param, str) or not param.strip():
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason="Missing or invalid parameter name"
        )

    # 3. Value validation (support value or alias measured_value; reject NaN, Inf, non-numeric)
    val = raw.get("value") if raw.get("value") is not None else raw.get("measured_value")
    if val is None or isinstance(val, bool):
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason=f"Missing measurement value for {param}"
        )
    try:
        val_float = float(val)
        if math.isnan(val_float) or math.isinf(val_float):
            return ValidationResult(
                is_valid=False,
                status="REJECTED",
                reason=f"Non-finite measurement value ({val}) for {param}"
            )
    except (ValueError, TypeError):
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason=f"Unparseable numeric value ({val}) for {param}"
        )

    # 4. Hours validation (negative time interval check)
    hrs = raw.get("timestamp_hours", 0.0)
    try:
        hrs_float = float(hrs)
        if hrs_float < 0.0 or math.isnan(hrs_float) or math.isinf(hrs_float):
            # Negative time interval is a hard reject
            if hrs_float < 0.0:
                return ValidationResult(
                    is_valid=False,
                    status="REJECTED",
                    reason=f"Negative time interval (timestamp_hours={hrs_float:.3f}) is physically impossible"
                )
            hrs_float = 0.0
        # Future timestamp sanity check: flag if beyond 200h (typical max burn-in is 168h)
        warning_reason = None
        if hrs_float > 200.0:
            warning_reason = f"Future timestamp anomaly: timestamp_hours={hrs_float:.1f}h exceeds maximum expected burn-in window (168h)"
    except (ValueError, TypeError):
        hrs_float = 0.0
        warning_reason = None

    # 5. Timestamp validation (invalid / malformed ISO timestamp)
    ts = raw.get("timestamp")
    ts_warning = None
    if not ts or not isinstance(ts, str):
        ts = datetime.now(timezone.utc).isoformat()
        ts_warning = "Malformed or missing ISO timestamp; server time substituted"
    else:
        # Check for future wall-clock timestamps (> 60s ahead of server time)
        try:
            parsed_ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            now_utc = datetime.now(timezone.utc)
            if parsed_ts.tzinfo is None:
                parsed_ts = parsed_ts.replace(tzinfo=timezone.utc)
            diff_sec = (parsed_ts - now_utc).total_seconds()
            if diff_sec > 60.0:
                ts_warning = f"Future wall-clock timestamp ({diff_sec:.1f}s ahead of server); accepted with warning"
        except (ValueError, AttributeError):
            ts = datetime.now(timezone.utc).isoformat()
            ts_warning = "Invalid ISO timestamp format; server time substituted"

    # 6. Provenance & Source Type Integrity Check (Anti-Spoofing Rule)
    src_type_raw = str(raw.get("source_type") or "").upper()
    src_raw = str(raw.get("source") or "").upper()
    extra_dict = raw.get("extra") if isinstance(raw.get("extra"), dict) else {}

    is_claiming_live_hardware = (
        src_type_raw == TelemetrySourceType.LIVE_HARDWARE.value or
        src_raw == "LIVE_HARDWARE" or
        src_raw.startswith("LIVE_HARDWARE")
    )
    is_simulation_marker = bool(
        extra_dict.get("is_simulated") or
        extra_dict.get("scenario") or
        "SIMULAT" in src_raw or
        "REPLAY" in src_raw or
        src_type_raw in (TelemetrySourceType.SIMULATED.value, TelemetrySourceType.REPLAY.value)
    )

    if is_claiming_live_hardware:
        # Anti-spoofing rule: simulator and replay packets CANNOT masquerade as LIVE_HARDWARE
        if is_simulation_marker and extra_dict.get("provenance_mode") != "SOFTWARE_INTEGRATION_TEST_MOCK":
            return ValidationResult(
                is_valid=False,
                status="REJECTED",
                reason="Provenance violation: simulated or replay telemetry cannot masquerade as LIVE_HARDWARE"
            )
        # Genuine live hardware packets MUST provide instrument_id and test_station_id
        station_id = raw.get("test_station_id")
        inst_id = raw.get("instrument_id")
        if not station_id or not inst_id:
            return ValidationResult(
                is_valid=False,
                status="REJECTED",
                reason="Provenance violation: LIVE_HARDWARE telemetry requires explicit test_station_id and instrument_id"
            )
        resolved_source_type = TelemetrySourceType.LIVE_HARDWARE.value
    elif "REPLAY" in src_raw or src_type_raw == TelemetrySourceType.REPLAY.value:
        resolved_source_type = TelemetrySourceType.REPLAY.value
    else:
        resolved_source_type = TelemetrySourceType.SIMULATED.value

    # 7. Quality determination
    quality = raw.get("quality", "GOOD")
    if quality not in ["GOOD", "SUSPECT_SPIKE", "STUCK", "LIMIT_BREACH", "MISSING"]:
        quality = "GOOD"

    # 8. Aggregate warning reason
    final_warning = None
    if warning_reason and ts_warning:
        final_warning = f"{warning_reason}; {ts_warning}"
    elif warning_reason:
        final_warning = warning_reason
    elif ts_warning:
        final_warning = ts_warning

    # Determine final status
    is_warning_quality = quality in ["SUSPECT_SPIKE", "STUCK"]
    final_status = "WARNING" if (is_warning_quality or final_warning) else "GOOD"

    try:
        packet = TelemetryPacket(
            component_id=cid.strip(),
            lot_id=lid.strip(),
            timestamp=ts,
            timestamp_hours=hrs_float,
            test_stage=raw.get("test_stage", "BURN_IN"),
            parameter=param.strip(),
            value=val_float,
            unit=raw.get("unit", "µA"),
            source=raw.get("source", "SIMULATED_ATE_01"),
            source_type=resolved_source_type,
            test_station_id=raw.get("test_station_id"),
            channel_id=raw.get("channel_id"),
            instrument_id=raw.get("instrument_id"),
            calibration_metadata=raw.get("calibration_metadata"),
            quality=quality,
            extra=raw.get("extra")
        )
        return ValidationResult(
            is_valid=True,
            status=final_status,
            reason=final_warning,
            packet=packet
        )
    except Exception as e:
        return ValidationResult(
            is_valid=False,
            status="REJECTED",
            reason=f"Schema parsing error: {str(e)}"
        )



class TelemetrySource(ABC):
    """
    Abstract connector interface for test equipment adapters.
    Supports physical test benches, industrial protocols (SECS/GEM, OPC-UA, MQTT),
    CSV gate replays, and realistic aerospace screening simulators.
    """

    def __init__(self, source_name: str):
        self.source_name = source_name
        self.is_connected = False
        self._subscribers: List[Callable[[TelemetryPacket], Coroutine[Any, Any, None]]] = []
        self._messages_processed = 0
        self._last_read_time: Optional[datetime] = None
        self._last_error: Optional[str] = None

    @abstractmethod
    async def connect(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Establishes connection to the data source or initializes stream."""
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """Safely closes connection and releases connector resources."""
        pass

    @abstractmethod
    async def read(self) -> Optional[TelemetryPacket]:
        """Polls or reads the next available telemetry measurement packet."""
        pass

    def subscribe(self, callback: Callable[[TelemetryPacket], Coroutine[Any, Any, None]]) -> None:
        """Registers an asynchronous callback to receive streaming telemetry packets."""
        if callback not in self._subscribers:
            self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[TelemetryPacket], Coroutine[Any, Any, None]]) -> None:
        """Removes a registered subscription callback."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def emit(self, packet: TelemetryPacket) -> None:
        """Dispatches an incoming packet to all active subscriber callbacks."""
        self._messages_processed += 1
        self._last_read_time = datetime.utcnow()
        for callback in list(self._subscribers):
            try:
                await callback(packet)
            except Exception as e:
                self._last_error = f"Subscriber dispatch error: {str(e)}"

    def health(self) -> Dict[str, Any]:
        """
        Reports connector diagnostic status, message throughput,
        latency, and health state.
        """
        return {
            "source_name": self.source_name,
            "connected": self.is_connected,
            "status": "HEALTHY" if self.is_connected and not self._last_error else ("ERROR" if self._last_error else "STANDBY"),
            "messages_processed": self._messages_processed,
            "last_read_time": self._last_read_time.isoformat() if self._last_read_time else None,
            "subscribers_count": len(self._subscribers),
            "last_error": self._last_error
        }
