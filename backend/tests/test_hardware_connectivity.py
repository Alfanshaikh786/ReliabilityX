"""
ReliabilityX Hardware Connectivity & Live Test-Cell Integration Test Suite
Verifies:
1. Device registry & multi-interface discovery (SCPI, GPIB, USBTMC, MQTT, Simulator)
2. Connection lifecycle & honest physical hardware failure
3. Telemetry normalization to canonical schema
4. Strict source provenance & anti-spoofing enforcement
5. Simulator vs live hardware separation
6. Stale telemetry timeout detection
7. Identity mismatch detection
8. Calibration metadata & expiration warning
9. Channel mapping & reconfiguration
10. WebSocket event broadcasting
11. Automatic AI pipeline invocation (drift, acceleration, lot anomaly)
12. 168h prediction invariant (target MUST remain Value_168h)
13. Split-conformal prediction intervals & breach probabilities
14. Database persistence with hardware provenance
15. Hardware disconnect & recovery
16. Malformed telemetry rejection (NaN, Inf, empty ID)
17. Duplicate telemetry handling
18. Timestamp ordering & monotonicity
19. Read-only safety boundary (actuation command rejection)
20. Zero claims of physical hardware validation
"""
from __future__ import annotations
import asyncio
import math
import os
import sys
import time
import unittest
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS
from backend.core.db import get_db_connection, init_db
from backend.ingestion.base import (
    TelemetryPacket,
    TelemetrySourceType,
    ValidationResult,
    validate_raw_packet
)
from backend.ingestion.device_registry import (
    DeviceConfiguration,
    DeviceRegistry,
    DEVICE_REGISTRY,
    HardwareHealthStatus,
    CalibrationStatus,
    InterfaceType,
    HardwareConnectionState,
    SimulatorState,
    ReplayState
)
from unittest.mock import patch
from backend.ingestion.hardware_interface import (
    BaseHardwareATEAdapter,
    ScpiEthernetLxiAdapter,
    GpibUsbtmcAdapter,
    HardwareSimulatorMockAdapter,
    HardwareSafetyViolation,
    LiveHardwareVerificationEngine
)
from backend.ingestion.hardware_adapter import HardwareATEAdapter
from backend.ingestion.manager import IngestionManager


class TestHardwareConnectivity(unittest.IsolatedAsyncioTestCase):
    """Unit and Integration Test Suite for Hardware Connectivity & Live Test-Cell Ingestion."""

    def setUp(self):
        self.test_db_path = "backend/data/test_hardware_connectivity.db"
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except Exception:
                pass
        init_db(self.test_db_path)
        self.manager = IngestionManager(db_path=self.test_db_path)

    def tearDown(self):
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except Exception:
                pass

    # 1. Device Discovery
    async def test_01_device_registry_discovery(self):
        """Verifies device registry contains valid device configurations across interfaces."""
        devices = await self.manager.discover_hardware_devices()
        self.assertGreaterEqual(len(devices), 3)

        interface_types = {d["interface_type"] for d in devices}
        self.assertIn(InterfaceType.SCPI_ETHERNET_LXI.value, interface_types)
        self.assertIn(InterfaceType.GPIB_IEEE488.value, interface_types)
        self.assertIn(InterfaceType.SIMULATOR_MOCK.value, interface_types)

        for dev in devices:
            self.assertTrue(dev["device_id"])
            self.assertTrue(dev["manufacturer"])
            self.assertTrue(dev["model"])
            self.assertTrue(dev["serial_number"])
            self.assertTrue(dev["station_id"])
            self.assertTrue(dev["channel_id"])
            self.assertTrue(dev["calibration_id"])
            self.assertIn(dev["source_type"], ["LIVE_HARDWARE", "SIMULATED", "REPLAY"])

    # 2. Connection Lifecycle & Honest Failure
    async def test_02_connection_lifecycle_and_honest_failure(self):
        """Physical hardware connect attempt to offline instrument must fail honestly without pretending."""
        res = await self.manager.connect_hardware("DEV-SMU-KEITHLEY-01")
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "DISCONNECTED")
        self.assertIn("NO LIVE HARDWARE CONNECTED", res["message"])

        status = self.manager.get_hardware_status()
        self.assertEqual(status["connection_status"], "DISCONNECTED")
        self.assertFalse(status["physical_hardware_connected"])
        self.assertFalse(status["real_hardware_validated"])

    # 3. Telemetry Normalization
    def test_03_telemetry_normalization_comprehensive(self):
        """Validates normalization from raw heterogeneous dictionaries to canonical TelemetryPacket."""
        raw_input = {
            "component_id": "C-01008",
            "lot_id": "LOT-2411C",
            "measured_value": 8.74,  # Alias for value
            "parameter": "leakage_current_uA",
            "unit": "µA",
            "timestamp_hours": 24.0,
            "test_stage": "24h",
            "source": "KEITHLEY_SMU_01",
            "test_station_id": "ATE-STATION-01",
            "channel_id": "CH1_SMU_A",
            "instrument_id": "SMU-2602B-4102",
            "calibration_metadata": {
                "calibration_id": "CAL-NIST-2026",
                "calibration_status": "VALID",
                "calibration_expiry": "2027-01-01T00:00:00Z"
            }
        }
        val_res = self.manager.normalize_telemetry(raw_input)
        self.assertTrue(val_res.is_valid)
        self.assertIsNotNone(val_res.packet)

        pkt = val_res.packet
        self.assertEqual(pkt.component_id, "C-01008")
        self.assertEqual(pkt.lot_id, "LOT-2411C")
        self.assertEqual(pkt.value, 8.74)
        self.assertEqual(pkt.unit, "µA")
        self.assertEqual(pkt.test_station_id, "ATE-STATION-01")
        self.assertEqual(pkt.channel_id, "CH1_SMU_A")
        self.assertEqual(pkt.instrument_id, "SMU-2602B-4102")
        self.assertEqual(pkt.extra.get("raw_measurement"), 8.74)

    # 4. Strict Source Provenance & Anti-Spoofing
    def test_04_strict_source_provenance_anti_spoofing(self):
        """Simulated/replay packet attempting to claim LIVE_HARDWARE without genuine verification must be REJECTED."""
        spoofed_packet = {
            "component_id": "C-01008",
            "lot_id": "LOT-2411C",
            "parameter": "leakage_current_uA",
            "value": 8.5,
            "source_type": "LIVE_HARDWARE",  # Attempting to claim LIVE_HARDWARE
            "source": "SIMULATED_ATE_BENCH",  # But source is simulated
            "extra": {"is_simulated": True}
        }
        val_res = validate_raw_packet(spoofed_packet)
        self.assertFalse(val_res.is_valid)
        self.assertEqual(val_res.status, "REJECTED")
        self.assertIn("Provenance violation", val_res.reason)

    # 5. Simulator vs Live Separation
    async def test_05_simulator_live_separation(self):
        """Hardware simulator mock adapter must strictly emit packets with source_type = SIMULATED."""
        sim_adapter = HardwareSimulatorMockAdapter()
        await sim_adapter.connect()
        pkt = await sim_adapter.read_measurement()

        self.assertIsNotNone(pkt)
        self.assertEqual(pkt.source_type, TelemetrySourceType.SIMULATED.value)
        self.assertTrue(pkt.extra.get("is_simulated"))
        self.assertFalse(pkt.extra.get("physical_hardware_validated"))
        await sim_adapter.disconnect()

    # 6. Stale Telemetry Detection
    def test_06_stale_telemetry_detection(self):
        """Stale telemetry timeout must trigger STALE_TELEMETRY health indicator."""
        sim_adapter = HardwareSimulatorMockAdapter()
        sim_adapter.is_connected = True
        sim_adapter.health_status = HardwareHealthStatus.CONNECTED
        sim_adapter.last_telemetry_time = time.time() - 30.0  # 30s ago (> stale timeout)

        health = sim_adapter.health_check()
        self.assertEqual(health["health_status"], HardwareHealthStatus.STALE_TELEMETRY.value)

    # 7. Identity Mismatch Detection
    async def test_07_identity_mismatch_detection(self):
        """Unexpected instrument serial number must trigger IDENTITY_MISMATCH."""
        sim_adapter = HardwareSimulatorMockAdapter()
        sim_adapter.inject_identity_mismatch(True)
        idn = await sim_adapter.identify()

        self.assertFalse(idn.get("identity_verified"))
        self.assertIn("IDENTITY_MISMATCH", idn.get("error", ""))

        health = sim_adapter.health_check()
        self.assertEqual(health["health_status"], HardwareHealthStatus.IDENTITY_MISMATCH.value)

    # 8. Calibration Metadata & Expiration Warning
    def test_08_calibration_metadata_and_expiry_warning(self):
        """Expired calibration must be detected and flag CALIBRATION_WARNING."""
        expired_dev = DeviceConfiguration(
            device_id="DEV-EXPIRED-TEST",
            manufacturer="Keithley",
            model="2602B",
            serial_number="99881",
            interface_type=InterfaceType.SCPI_ETHERNET_LXI,
            station_id="ATE-01",
            channel_id="CH1",
            instrument_id="SMU-2602B-99881",
            calibration_id="CAL-OLD-2020",
            calibration_status=CalibrationStatus.EXPIRED,
            calibration_expiry="2021-01-01T00:00:00Z",
            source_type="LIVE_HARDWARE"
        )
        self.assertFalse(expired_dev.is_calibration_valid())

        adapter = ScpiEthernetLxiAdapter(expired_dev)
        adapter.is_connected = True
        adapter.health_status = HardwareHealthStatus.CONNECTED
        health = adapter.health_check()
        self.assertEqual(health["health_status"], HardwareHealthStatus.CALIBRATION_WARNING.value)

    # 9. Channel Mapping
    def test_09_channel_mapping_and_reconfiguration(self):
        """Channel reconfiguration must update active channel properly."""
        adapter = ScpiEthernetLxiAdapter()
        self.assertEqual(adapter.active_channel, "CH1_SMU_A")
        adapter.configure_channel("CH2_SMU_B")
        self.assertEqual(adapter.active_channel, "CH2_SMU_B")

    # 10. WebSocket Live Update
    async def test_10_websocket_live_update(self):
        """Ingestion manager must broadcast live samples to registered WebSocket clients."""
        received_events = []

        class MockWebSocket:
            async def send_json(self, payload):
                received_events.append(payload)

        ws = MockWebSocket()
        await self.manager.register_websocket(ws)

        test_pkt = TelemetryPacket(
            component_id="C-01008",
            lot_id="LOT-2411C",
            timestamp=datetime.now(timezone.utc).isoformat(),
            timestamp_hours=12.0,
            test_stage="BURN_IN",
            parameter="leakage_current_uA",
            value=8.45,
            unit="µA",
            source="SIMULATED_ATE_01",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        await self.manager.handle_incoming_packet(test_pkt)

        # Assert WS received event
        sample_events = [e for e in received_events if e.get("type") == "LIVE_SAMPLE"]
        self.assertGreaterEqual(len(sample_events), 1)
        data = sample_events[0]["data"]
        self.assertEqual(data["component_id"], "C-01008")
        self.assertEqual(data["data_source_type"], TelemetrySourceType.SIMULATED.value)
        self.manager.unregister_websocket(ws)

    # 11. AI Pipeline Automatic Invocation
    async def test_11_ai_pipeline_automatic_invocation(self):
        """Fast path must automatically compute drift, acceleration, safety slope, and lot-relative anomaly."""
        p1 = TelemetryPacket(
            component_id="C-01008",
            lot_id="LOT-2411C",
            timestamp=datetime.now(timezone.utc).isoformat(),
            timestamp_hours=0.0,
            parameter="leakage_current_uA",
            value=8.10,
            source="SIMULATED_ATE_01",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        p2 = TelemetryPacket(
            component_id="C-01008",
            lot_id="LOT-2411C",
            timestamp=(datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            timestamp_hours=24.0,
            parameter="leakage_current_uA",
            value=9.30,
            source="SIMULATED_ATE_01",
            source_type=TelemetrySourceType.SIMULATED.value
        )

        res1 = self.manager._execute_fast_path(p1)
        res2 = self.manager._execute_fast_path(p2)

        self.assertIn("drift_rate", res2)
        self.assertIn("accel", res2)
        self.assertIn("safety_slope", res2)
        self.assertIn("lot_relative_anomaly_score", res2)
        self.assertGreater(res2["drift_rate"], 0.0)
        self.assertEqual(res2["safety_slope"], res2["drift_rate"])

    # 12. 168h Prediction Invariant
    async def test_12_168h_prediction_invariant(self):
        """Primary prediction target MUST strictly remain predicted_168h (Value_168h)."""
        # Feed enough checkpoints to pass forecast gate
        for h, v in [(0.0, 8.0), (12.0, 8.6), (24.0, 9.2), (48.0, 10.4), (96.0, 12.8)]:
            pkt = TelemetryPacket(
                component_id="C-PROGNOSTIC-01",
                lot_id="LOT-2411C",
                timestamp_hours=h,
                parameter="leakage_current_uA",
                value=v,
                source="SIMULATED_ATE_01",
                source_type=TelemetrySourceType.SIMULATED.value
            )
            res = self.manager._execute_fast_path(pkt)

        self.assertTrue(res["prediction_available"])
        self.assertIsNotNone(res["predicted_168h"])
        self.assertIsNotNone(res["predicted_168h_value"])
        self.assertEqual(res["predicted_168h"], res["predicted_168h_value"])
        # Invariant check: target represents 168h burn-in prediction
        self.assertGreater(res["predicted_168h"], 12.8)

    # 13. Conformal Prediction Intervals & Breach Probability
    async def test_13_split_conformal_prediction_intervals(self):
        """Verifies empirical conformal prediction interval [lower, upper] and breach probability."""
        for h, v in [(0.0, 8.0), (24.0, 9.5), (48.0, 11.0), (96.0, 14.5)]:
            pkt = TelemetryPacket(
                component_id="C-CONF-01",
                lot_id="LOT-2411C",
                timestamp_hours=h,
                parameter="leakage_current_uA",
                value=v,
                source="SIMULATED_ATE_01",
                source_type=TelemetrySourceType.SIMULATED.value
            )
            res = self.manager._execute_fast_path(pkt)

        self.assertIsNotNone(res["estimated_prediction_interval"])
        low, high = res["estimated_prediction_interval"]
        self.assertLess(low, res["predicted_168h"])
        self.assertGreater(high, res["predicted_168h"])
        self.assertIsNotNone(res["probability_of_limit_breach"])
        self.assertGreaterEqual(res["probability_of_limit_breach"], 0.0)
        self.assertLessEqual(res["probability_of_limit_breach"], 1.0)
        self.assertIn("h", res["estimated_time_to_breach"])

    # 14. Database Persistence with Hardware Provenance
    def test_14_database_persistence_with_provenance(self):
        """Verifies transactional persistence into live_telemetry_raw with hardware provenance."""
        pkt = TelemetryPacket(
            component_id="C-DB-01",
            lot_id="LOT-2411C",
            timestamp=datetime.now(timezone.utc).isoformat(),
            timestamp_hours=24.0,
            parameter="leakage_current_uA",
            value=8.95,
            source="SIMULATED_ATE_01",
            source_type=TelemetrySourceType.SIMULATED.value,
            test_station_id="ATE-STATION-01",
            channel_id="CH1_SMU_A",
            instrument_id="SMU-2602B",
            calibration_metadata={"cal_id": "CAL-2026"}
        )
        self.manager._persist_measurement(pkt, "GOOD")

        conn = get_db_connection(self.test_db_path)
        cur = conn.cursor()
        cur.execute("SELECT * FROM live_telemetry_raw WHERE component_id = 'C-DB-01'")
        row = dict(cur.fetchone())
        conn.close()

        self.assertEqual(row["component_id"], "C-DB-01")
        self.assertEqual(row["value"], 8.95)
        self.assertEqual(row["source_type"], TelemetrySourceType.SIMULATED.value)
        self.assertEqual(row["test_station_id"], "ATE-STATION-01")
        self.assertEqual(row["channel_id"], "CH1_SMU_A")

    # 15. Hardware Disconnect Recovery
    async def test_15_hardware_disconnect_recovery(self):
        """Connect and disconnect sequence must properly update health states and release resources."""
        await self.manager.connect_hardware("DEV-SIM-ATE-MOCK")
        status_conn = self.manager.get_hardware_status()
        self.assertEqual(status_conn["connection_status"], "DISCONNECTED")
        self.assertEqual(status_conn["simulator_status"], "ACTIVE")

        await self.manager.disconnect_hardware()
        status_disc = self.manager.get_hardware_status()
        self.assertEqual(status_disc["connection_status"], "DISCONNECTED")
        self.assertIn(status_disc["simulator_status"], ("STANDBY", "INACTIVE"))

    # 16. Malformed Telemetry Rejection
    def test_16_malformed_telemetry_rejection(self):
        """NaN, Inf, empty component_id, and negative duration must be rejected safely."""
        nan_sample = {"component_id": "C-01", "lot_id": "LOT-1", "parameter": "leakage_current_uA", "value": float("nan")}
        self.assertFalse(validate_raw_packet(nan_sample).is_valid)

        inf_sample = {"component_id": "C-01", "lot_id": "LOT-1", "parameter": "leakage_current_uA", "value": float("inf")}
        self.assertFalse(validate_raw_packet(inf_sample).is_valid)

        empty_id = {"component_id": "   ", "lot_id": "LOT-1", "parameter": "leakage_current_uA", "value": 8.0}
        self.assertFalse(validate_raw_packet(empty_id).is_valid)

        neg_hours = {"component_id": "C-01", "lot_id": "LOT-1", "parameter": "leakage_current_uA", "value": 8.0, "timestamp_hours": -5.0}
        self.assertFalse(validate_raw_packet(neg_hours).is_valid)

    # 17. Duplicate Telemetry Handling
    def test_17_duplicate_telemetry_handling(self):
        """Duplicate timestamp packet must be accepted with warning or handled without crashing."""
        ts = datetime.now(timezone.utc).isoformat()
        sample1 = {"component_id": "C-01", "lot_id": "LOT-1", "parameter": "leakage_current_uA", "value": 8.1, "timestamp": ts}
        sample2 = {"component_id": "C-01", "lot_id": "LOT-1", "parameter": "leakage_current_uA", "value": 8.1, "timestamp": ts}
        v1 = validate_raw_packet(sample1)
        v2 = validate_raw_packet(sample2)
        self.assertTrue(v1.is_valid)
        self.assertTrue(v2.is_valid)

    # 18. Timestamp Ordering
    async def test_18_timestamp_ordering_and_monotonicity(self):
        """Out-of-order packets must not crash the rolling history or pipeline."""
        p_t2 = TelemetryPacket(
            component_id="C-ORDER-01",
            lot_id="LOT-1",
            timestamp_hours=48.0,
            parameter="leakage_current_uA",
            value=9.5,
            source="SIMULATED_ATE_01",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        p_t1 = TelemetryPacket(
            component_id="C-ORDER-01",
            lot_id="LOT-1",
            timestamp_hours=24.0,
            parameter="leakage_current_uA",
            value=8.5,
            source="SIMULATED_ATE_01",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        # Ingestion in reverse chronological order
        res1 = self.manager._execute_fast_path(p_t2)
        res2 = self.manager._execute_fast_path(p_t1)
        self.assertIsNotNone(res1)
        self.assertIsNotNone(res2)

    # 19. Read-Only Safety Boundary
    def test_19_read_only_safety_boundary(self):
        """Actuation, bias adjustment, or chamber temperature modifications must be blocked by HardwareSafetyViolation."""
        adapter = ScpiEthernetLxiAdapter()

        # Read-only query ending in '?' must pass
        safe_cmd = adapter.execute_safe_query("*IDN?")
        self.assertEqual(safe_cmd, "*IDN?")

        # Actuation commands must raise HardwareSafetyViolation
        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query("OUTP ON")

        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query("SOUR:VOLT 10.0")

        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query("SET:TEMP 125.0")

        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query("CHAMBER:STOP")

    # 20. Zero Fabrication & Unvalidated Hardware Claim Check
    def test_20_zero_fabrication_unvalidated_claim_check(self):
        """Real hardware validation status must be strictly False until physical instrumentation attached."""
        hw_status = self.manager.get_hardware_status()
        self.assertFalse(hw_status["real_hardware_validated"])
        self.assertIn("Physical hardware validation remains pending", hw_status["hardware_validation_note"])
        self.assertIn("SIMULATION / REPLAY MODE AVAILABLE", hw_status["available_modes"]["simulation"])

    # 21. SCPI Strict Allowlist & *RST Rejection
    def test_21_scpi_strict_allowlist_and_rst_rejection(self):
        """Verify *RST and non-allowlisted commands are strictly blocked; instrument profiles work."""
        adapter = ScpiEthernetLxiAdapter()

        # *RST must raise HardwareSafetyViolation (it is a state-changing reset, not a read-only query)
        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query("*RST")

        # Arbitrary queries not in allowlist must be blocked
        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query(":MEM:TABL:DATA?")

        with self.assertRaises(HardwareSafetyViolation):
            adapter.execute_safe_query("FORMAT:DATA ASCII")

        # Standard IEEE 488.2 interrogation commands must be allowed
        self.assertEqual(adapter.execute_safe_query("*IDN?"), "*IDN?")
        self.assertEqual(adapter.execute_safe_query("*OPC?"), "*OPC?")
        self.assertEqual(adapter.execute_safe_query("*ESR?"), "*ESR?")
        self.assertEqual(adapter.execute_safe_query("*STB?"), "*STB?")
        self.assertEqual(adapter.execute_safe_query("*TST?"), "*TST?")
        self.assertEqual(adapter.execute_safe_query(":SYSTem:ERRor?"), ":SYSTem:ERRor?")

        # Keithley profile interrogation commands
        self.assertEqual(
            adapter.execute_safe_query(":MEASure:CURRent:DC?", profile_name="Keithley_ReadOnly_Profile"),
            ":MEASure:CURRent:DC?"
        )
        self.assertEqual(
            adapter.execute_safe_query(":MEASure:VOLTage:DC?", profile_name="Keithley_ReadOnly_Profile"),
            ":MEASure:VOLTage:DC?"
        )

    # 22. Server-Controlled Source Provenance Anti-Spoofing
    def test_22_server_controlled_source_provenance(self):
        """Client attempting to assert LIVE_HARDWARE without physical verification must be downgraded to SIMULATED."""
        spoofed_payload = {
            "component_id": "C-SPOOF-01",
            "lot_id": "LOT-SPOOF",
            "parameter": "leakage_current_uA",
            "value": 7.42,
            "source_type": "LIVE_HARDWARE",  # Client tries to claim live hardware
            "test_station_id": "ATE-STATION-01",
            "channel_id": "CH1"
        }
        res = self.manager.normalize_telemetry(spoofed_payload)
        self.assertTrue(res.is_valid)
        pkt = res.packet
        # Must be downgraded to SIMULATED because backend has no active verified physical session
        self.assertEqual(pkt.source_type, TelemetrySourceType.SIMULATED.value)
        self.assertIn("UNVERIFIED_CLIENT_CLAIM", pkt.provenance_metadata.get("source_verification_method", ""))
        self.assertIsNotNone(pkt.provenance_metadata.get("source_verified_at"))

    # 23. Model Applicability & Evidence Gating
    def test_23_model_applicability_and_evidence_gating(self):
        """0h only -> INSUFFICIENT_EVIDENCE / MODEL_NOT_READY (no fabricated forecast). 0h+24h -> EARLY_EVIDENCE with Value_168h."""
        # 1. Ingest 0h packet
        p0 = TelemetryPacket(
            component_id="C-EVID-01",
            lot_id="LOT-EVID",
            timestamp_hours=0.0,
            test_stage="0h",
            parameter="leakage_current_uA",
            value=8.10,
            source="SIMULATED",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        res0 = self.manager._execute_fast_path(p0)
        self.assertEqual(res0["evidence_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res0["model_applicability"], "MODEL_NOT_READY")
        # Ensure predicted_168h is not fabricated
        self.assertIsNone(res0["predicted_168h"])

        # 2. Ingest 24h packet (temporal observation available)
        p24 = TelemetryPacket(
            component_id="C-EVID-01",
            lot_id="LOT-EVID",
            timestamp_hours=24.0,
            test_stage="24h",
            parameter="leakage_current_uA",
            value=8.65,
            source="SIMULATED",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        res24 = self.manager._execute_fast_path(p24)
        self.assertIn(res24["evidence_status"], ["EARLY_EVIDENCE", "ADEQUATE_EVIDENCE"])
        self.assertEqual(res24["model_applicability"], "MODEL_APPLICABLE")
        # Target must be strictly 168h forecast
        self.assertEqual(res24["target_forecast"], "Value_168h")
        self.assertIsNotNone(res24["predicted_168h"])
        self.assertGreater(res24["predicted_168h"], 0.0)

    # 24. Conformal Terminology & Coverage Reconciliation
    def test_24_conformal_terminology_and_coverage_reconciliation(self):
        """Audit conformal metadata for nominal split-conformal phrasing and reconciled empirical figures."""
        status = self.manager.get_hardware_status()
        conf_meta = status["conformal_metadata"]

        # Terminology must use '95% Nominal Split-Conformal Prediction Interval'
        self.assertEqual(conf_meta["interval_descriptor"], "95% Nominal Split-Conformal Prediction Interval")
        self.assertIn("Simulated Calibration Profile", status["calibration_statement"])
        
        # Live device configuration retains NIST-traceable metadata support
        live_dev = DEVICE_REGISTRY.get_device("DEV-SMU-KEITHLEY-01")
        self.assertIn("NIST-traceable calibration metadata, where applicable", live_dev.get_calibration_metadata()["traceability_statement"])

        # Coverage reconciliation documentation check
        coverage_doc = conf_meta["reconciliation"]
        self.assertIn("synthetic_lolo_benchmark_95", coverage_doc)
        self.assertIn("p99_conservative_envelope_99", coverage_doc)
        self.assertAlmostEqual(coverage_doc["synthetic_lolo_benchmark_95"]["mean_coverage_pct"], 95.96, places=1)
        self.assertAlmostEqual(coverage_doc["p99_conservative_envelope_99"]["coverage_pct"], 99.0, places=1)

    # 25. Calibration Status Standardization
    def test_25_calibration_status_standardization(self):
        """Calibration enum must contain standardized states without overclaiming scientific certainty."""
        dev = DEVICE_REGISTRY.get_device("DEV-SMU-KEITHLEY-01")
        self.assertIsNotNone(dev)
        cal_meta = dev.get_calibration_metadata()
        self.assertEqual(cal_meta["calibration_status"], CalibrationStatus.CALIBRATION_VALID.value)
        self.assertIn("NIST-traceable calibration metadata, where applicable", cal_meta["traceability_statement"])
        self.assertIn("scientific_caveat", cal_meta)

    # 26. Production Status Separation
    def test_26_production_status_separation(self):
        """Verify production status maintains strict separation between pipeline parity and physical validation."""
        status = self.manager.get_hardware_status()
        prod = status["production_status"]
        self.assertEqual(prod["production_pipeline_parity"], "PASS")
        self.assertEqual(prod["production_deployment_validation"], "NOT PERFORMED")
        self.assertEqual(prod["physical_hardware_validation"], "NOT PERFORMED")

    # 27. 168h Invariant Preservation
    def test_27_168h_prediction_target_invariant(self):
        """The primary forecast target must be strictly Value_168h across all telemetry responses."""
        p48 = TelemetryPacket(
            component_id="C-INV-01",
            lot_id="LOT-INV",
            timestamp_hours=48.0,
            test_stage="48h",
            parameter="leakage_current_uA",
            value=9.10,
            source="SIMULATED",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        res = self.manager._execute_fast_path(p48)
        self.assertEqual(res["target_forecast"], "Value_168h")
        self.assertIn("predicted_168h", res)
        self.assertNotIn("predicted_144h", res)
        self.assertNotIn("predicted_148h", res)

    # =========================================================================
    # SECTION 21 REGRESSION TESTS
    # =========================================================================

    # 28. Regression 1: Simulated hardware cannot display HARDWARE CONNECTED
    async def test_28_regression_simulated_hardware_cannot_display_hardware_connected(self):
        """source_type = SIMULATED must NEVER produce HARDWARE CONNECTED."""
        await self.manager.connect_hardware("DEV-SIM-ATE-MOCK")
        status = self.manager.get_hardware_status()
        self.assertEqual(status["data_source"], "SIMULATION")
        self.assertEqual(status["connection_status"], "DISCONNECTED")
        self.assertFalse(status["physical_hardware_connected"])
        self.assertFalse(status["hardware_connected"])
        self.assertEqual(status["simulator_status"], "ACTIVE")
        self.assertNotEqual(status["connection_status"], "CONNECTED")

    # 29. Regression 2: Simulated device cannot display physical calibration VALID
    def test_29_regression_simulated_device_cannot_display_physical_calibration_valid(self):
        """Simulated devices must display SIMULATION PROFILE, never physical calibration VALID or PASS."""
        dev = DEVICE_REGISTRY.get_device("DEV-SIM-ATE-MOCK")
        self.assertIsNotNone(dev)
        self.assertFalse(dev.is_calibration_valid())
        cal_meta = dev.get_calibration_metadata()
        self.assertEqual(cal_meta["calibration_status"], CalibrationStatus.SIMULATION_PROFILE.value)
        self.assertFalse(cal_meta["is_valid"])

        status = self.manager.get_hardware_status()
        self.assertFalse(status["is_calibration_valid"])
        self.assertEqual(status["calibration_status"], "SIMULATION_PROFILE")
        self.assertEqual(status["diagnostics"]["calibration_state"], "SIMULATION PROFILE")
        self.assertNotEqual(status["calibration_status"], "VALID")
        self.assertNotEqual(status["diagnostics"]["calibration_state"], "PASS")

    # 30. Regression 3: Insufficient evidence cannot display PASS
    def test_30_regression_insufficient_evidence_cannot_display_pass(self):
        """Before 24h checkpoint, evidence gating must enforce NOT ASSESSED, never PASS."""
        p_early = TelemetryPacket(
            component_id="C-REG-01",
            lot_id="LOT-REG",
            timestamp_hours=12.0,
            test_stage="12h",
            parameter="leakage_current_uA",
            value=8.45,
            source="SIMULATED",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        res = self.manager._execute_fast_path(p_early)
        self.assertEqual(res["evidence_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["risk_state"], "NOT ASSESSED")
        self.assertNotEqual(res["risk_state"], "PASS")

    # 31. Regression 4: Insufficient evidence cannot display 0.0% breach probability
    def test_31_regression_insufficient_evidence_cannot_display_zero_percent_breach_probability(self):
        """Null/unavailable prognostic outputs must remain None and not be fabricated as 0.0%."""
        p_zero = TelemetryPacket(
            component_id="C-REG-02",
            lot_id="LOT-REG",
            timestamp_hours=0.0,
            test_stage="0h",
            parameter="leakage_current_uA",
            value=8.02,
            source="SIMULATED",
            source_type=TelemetrySourceType.SIMULATED.value
        )
        res = self.manager._execute_fast_path(p_zero)
        self.assertEqual(res["evidence_status"], "INSUFFICIENT_EVIDENCE")
        # Prognostic breach probability and predicted 168h must be None / unavailable
        self.assertIsNone(res.get("predicted_168h"))
        self.assertIsNone(res.get("probability_of_breach_pct"))
        self.assertNotEqual(res.get("probability_of_breach_pct"), 0.0)

    # 32. Regression 5: Target LIVE_HARDWARE does not imply active LIVE_HARDWARE source
    async def test_32_regression_target_live_hardware_does_not_imply_active_live_source(self):
        """Configuring a LIVE_HARDWARE target device when unattached must not claim live hardware active."""
        res = await self.manager.connect_hardware("DEV-SMU-KEITHLEY-01")
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "DISCONNECTED")

        status = self.manager.get_hardware_status()
        self.assertEqual(status["data_source"], "SIMULATION")
        self.assertEqual(status["connection_status"], "DISCONNECTED")
        self.assertFalse(status["physical_hardware_connected"])
        self.assertFalse(status["hardware_connected"])
        # Target device configuration is registered, but active data source remains SIMULATION
        self.assertEqual(status["model"], "2602B System SourceMeter")
        self.assertNotEqual(status["data_source"], "LIVE HARDWARE")

    # 33. Regression 6: LIVE_HARDWARE only becomes active after verified physical connection
    def test_33_regression_live_hardware_only_becomes_active_after_verified_physical_connection(self):
        """The 7-point hardware gateway must strictly gate live hardware status."""
        dev = DEVICE_REGISTRY.get("DEV-SMU-KEITHLEY-01")
        self.assertIsNotNone(dev)

        # 1. Unconnected / mock adapter fails live verification
        eval_mock = LiveHardwareVerificationEngine.evaluate(
            adapter=self.manager.sources["hardware_mock"],
            device_config=dev
        )
        self.assertFalse(eval_mock["is_live_hardware_verified"])
        self.assertFalse(eval_mock["physical_hardware_connected"])

        # 2. Simulated verified adapter passes all 7 points
        class MockVerifiedPhysicalAdapter:
            is_connected = True
            health_status = HardwareHealthStatus.CONNECTED
            last_telemetry_time = time.time()
            _last_identity = {
                "identity_verified": True,
                "raw_idn": "Keithley Instruments,2602B,4102008,4.2.1",
                "manufacturer": "Keithley Instruments",
                "model": "2602B System SourceMeter",
                "serial_number": "4102008"
            }

        eval_verified = LiveHardwareVerificationEngine.evaluate(
            adapter=MockVerifiedPhysicalAdapter(),
            device_config=dev
        )
        self.assertTrue(eval_verified["is_live_hardware_verified"])
        self.assertTrue(eval_verified["physical_hardware_connected"])
        self.assertEqual(eval_verified["provenance_status"], "VERIFIED_LIVE_HARDWARE")

        # 3. Mismatched serial/identity fails verification
        class MockMismatchedAdapter(MockVerifiedPhysicalAdapter):
            _last_identity = {
                "identity_verified": False,
                "raw_idn": "UNKNOWN_VENDOR,UNKNOWN_DEV,WRONG_SN,0.0",
                "serial_number": "WRONG_SN"
            }

        eval_mismatch = LiveHardwareVerificationEngine.evaluate(
            adapter=MockMismatchedAdapter(),
            device_config=dev
        )
        self.assertFalse(eval_mismatch["is_live_hardware_verified"])
        self.assertFalse(eval_mismatch["physical_hardware_connected"])

    # 34. Regression 7: Missing physical hardware displays NOT VERIFIED, NOT FAIL
    def test_34_regression_missing_hardware_shows_not_verified_not_fail(self):
        """In simulation mode without physical hardware, diagnostics must show NOT VERIFIED / NOT ACTIVE, not FAIL."""
        status = self.manager.get_hardware_status()
        diag = status["diagnostics"]
        
        self.assertEqual(diag["transport"], "NOT VERIFIED")
        self.assertEqual(diag["device_identity"], "NOT VERIFIED")
        self.assertEqual(diag["serial_verification"], "NOT VERIFIED")
        self.assertEqual(diag["calibration_state"], "SIMULATION PROFILE")
        self.assertIn(diag["telemetry_channel"], ["NOT ACTIVE", "SIMULATION STREAM"])
        self.assertEqual(diag["read_only_policy"], "ACTIVE")
        self.assertEqual(diag["source_provenance"], "SIMULATION")
        
        # None of these unperformed verifications should be flagged as catastrophic FAIL
        self.assertNotEqual(diag["transport"], "FAIL")
        self.assertNotEqual(diag["device_identity"], "FAIL")
        self.assertNotEqual(diag["serial_verification"], "FAIL")

    # 35. Regression 8: Semantic distinction between NOT VERIFIED and FAIL
    def test_35_regression_semantic_distinction_not_verified_vs_fail(self):
        """Genuine hardware fault (e.g. socket failure / timeout) produces FAIL, whereas absence produces NOT VERIFIED."""
        dev = DEVICE_REGISTRY.get("DEV-SMU-KEITHLEY-01")
        self.assertIsNotNone(dev)

        # 1. Hardware absent / unperformed -> NOT VERIFIED
        eval_absent = LiveHardwareVerificationEngine.evaluate(
            adapter=None,
            device_config=dev
        )
        self.assertEqual(eval_absent["criteria"]["transport_health_check"]["status"], "NOT VERIFIED")
        self.assertEqual(eval_absent["criteria"]["device_identity_interrogation"]["status"], "NOT VERIFIED")
        self.assertEqual(eval_absent["criteria"]["telemetry_freshness"]["status"], "NOT ACTIVE")

        # 2. Hardware present but experiencing connection error -> FAIL
        class MockFailedPhysicalAdapter:
            is_connected = False
            health_status = HardwareHealthStatus.ERROR
            last_telemetry_time = 0.0
            _last_identity = None

        eval_failed = LiveHardwareVerificationEngine.evaluate(
            adapter=MockFailedPhysicalAdapter(),
            device_config=dev
        )
        self.assertEqual(eval_failed["criteria"]["transport_health_check"]["status"], "FAIL")
        self.assertEqual(eval_failed["criteria"]["device_identity_interrogation"]["status"], "NOT VERIFIED")
        self.assertNotEqual(eval_failed["criteria"]["transport_health_check"]["status"], "NOT VERIFIED")

    # 36. Regression 9: Calibration validation reports NOT PERFORMED when offline
    def test_36_regression_calibration_validation_not_performed(self):
        """Calibration validation badge must read NOT PERFORMED (not PENDING) when physical hardware is disconnected."""
        status = self.manager.get_hardware_status()
        self.assertEqual(status["readiness_matrix"]["calibration_validation"], "NOT PERFORMED")
        self.assertNotEqual(status["readiness_matrix"]["calibration_validation"], "PENDING")
        self.assertNotEqual(status["readiness_matrix"]["calibration_validation"], "VALID")

    # 37. Regression 10: Dynamic verification method label
    def test_37_regression_dynamic_verification_method_label(self):
        """Simulated source must display 'Server-verified simulation gateway check', never claim 7-point hardware check."""
        status = self.manager.get_hardware_status()
        prov_meta = status["provenance_metadata"]
        self.assertEqual(prov_meta["verification_method_display"], "Server-verified simulation gateway check")
        self.assertNotEqual(prov_meta["verification_method_display"], "Server-verified 7-point hardware gateway check")

    # 38. Regression 11: Telemetry sampling rate matches actual simulator timing
    def test_38_regression_telemetry_sampling_rate_matches_timing(self):
        """Simulation telemetry rate must be dynamically computed and match configured rate (1.0 Hz)."""
        status = self.manager.get_hardware_status()
        self.assertEqual(status.get("sampling_rate_hz"), 1.0)
        self.assertEqual(status.get("sampling_rate_display"), "1.0 Hz")

    # 39. Regression 12: Bounded role wording for thermal chamber and SEMI alignment
    def test_39_regression_bounded_wording_thermal_chamber_and_semi(self):
        """Device registry and descriptors must use bounded intended role and RITdb-aligned terminology."""
        gpib_dev = DEVICE_REGISTRY.get("DEV-CHAMBER-THERMOTRON-01")
        if gpib_dev:
            # Model and role must not claim physical validation
            self.assertIn("Environmental Chamber", gpib_dev.model)
        # Interface descriptions check
        for dev in DEVICE_REGISTRY.list_all():
            if dev.source_type == "SIMULATED":
                self.assertFalse(dev.is_calibration_valid())
                self.assertEqual(dev.calibration_status, CalibrationStatus.SIMULATION_PROFILE)

    # 40. Regression 13: Simulated calibration never claims physical NIST validity
    def test_40_regression_simulated_calibration_no_physical_nist_claim(self):
        """Simulated devices must explicitly declare synthetic/simulation profile without physical NIST claim."""
        sim_dev = DEVICE_REGISTRY.get("DEV-SIM-ATE-MOCK")
        cal_meta = sim_dev.get_calibration_metadata()
        self.assertFalse(cal_meta["is_valid"])
        self.assertEqual(cal_meta["calibration_status"], "SIMULATION_PROFILE")
        self.assertIn("Simulated Calibration Profile", cal_meta["traceability_statement"])
        self.assertIn("Physical Calibration Not Verified", cal_meta["traceability_statement"])
        self.assertNotIn("Physical NIST-traceable calibration verified", cal_meta["traceability_statement"])


    # =========================================================================
    # SECTION 18 MANDATORY TEST CASES (TEST 1 to TEST 10)
    # =========================================================================

    # TEST 1: Simulation selected. Test Connection. Expected: PASS simulation test. hardware_connected = false.
    async def test_41_section18_test_01_simulation_test_connection(self):
        """TEST 1: Simulation selected -> Test Connection -> PASS simulation test, hardware_connected = false."""
        res = await self.manager.test_hardware_connection("DEV-SIM-ATE-MOCK")
        self.assertTrue(res["success"])
        self.assertEqual(res["source_type"], "SIMULATED")
        self.assertIn("Simulation connection test passed", res["message"])
        self.assertIn("virtual test bench", res["message"])
        self.assertFalse(res["hardware_connected"])
        self.assertFalse(res["live_hardware_verified"])
        self.assertEqual(res["simulator_state"], "SIMULATOR_VERIFIED")

        # Invariant on manager and status dict
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)
        status = self.manager.get_hardware_status()
        self.assertFalse(status["hardware_connected"])
        self.assertFalse(status["physical_hardware_connected"])
        self.assertFalse(status["live_hardware_verified"])
        self.assertEqual(status["connection_status"], "DISCONNECTED")

    # TEST 2: Simulation selected. Start Stream. Expected: simulation stream starts. source_type = SIMULATED. hardware_connected = false.
    async def test_42_section18_test_02_simulation_start_stream(self):
        """TEST 2: Simulation selected -> Start Stream -> simulation stream starts, source_type = SIMULATED, hardware_connected = false."""
        status = await self.manager.start_stream(source_type="simulator")
        self.assertTrue(status.get("success", False))
        self.assertIn("Simulation telemetry stream started", status.get("message", ""))
        self.assertEqual(self.manager.simulator_state, SimulatorState.SIMULATOR_STREAMING)
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)

        hw_status = self.manager.get_hardware_status()
        self.assertEqual(hw_status["data_source"], "SIMULATION")
        self.assertFalse(hw_status["hardware_connected"])
        self.assertFalse(hw_status["physical_hardware_connected"])
        self.assertEqual(hw_status["simulator_status"], "ACTIVE")
        self.assertEqual(hw_status["telemetry_state"], "SIMULATED")

    # TEST 3: Simulation selected. Stop Stream. Expected: simulation stream stops.
    async def test_43_section18_test_03_simulation_stop_stream(self):
        """TEST 3: Simulation selected -> Stop Stream -> simulation stream stops, simulator_state = SIMULATOR_STOPPED."""
        await self.manager.start_stream(source_type="simulator")
        stop_res = await self.manager.stop_stream()
        self.assertTrue(stop_res.get("success", False))
        self.assertEqual(stop_res.get("status"), "STOPPED")
        self.assertIn("Simulation telemetry stream stopped", stop_res.get("message", ""))
        self.assertEqual(self.manager.simulator_state, SimulatorState.SIMULATOR_STOPPED)
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)

    # TEST 4: LIVE_HARDWARE selected. No physical device available. Test Connection. Expected: FAIL. hardware_verified = false.
    async def test_44_section18_test_04_live_hardware_test_connection_fails_when_absent(self):
        """TEST 4: LIVE_HARDWARE selected -> No physical device -> FAIL, hardware_verified = false, no fallback to simulation."""
        res = await self.manager.test_hardware_connection("DEV-SMU-KEITHLEY-2602B")
        self.assertFalse(res["success"])
        self.assertEqual(res["source_type"], "LIVE_HARDWARE")
        self.assertEqual(res["status"], "VERIFICATION_FAILED")
        self.assertIn("Hardware connection test failed", res["message"])
        self.assertIn("No physical hardware connection could be verified", res["message"])
        self.assertNotIn("Connection test passed", res["message"])
        self.assertFalse(res["hardware_connected"])
        self.assertFalse(res["live_hardware_verified"])
        self.assertEqual(self.manager.hardware_connection_state, HardwareConnectionState.VERIFICATION_FAILED)
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)

    # TEST 5: LIVE_HARDWARE selected. No physical device available. Start Stream. Expected: BLOCKED. No telemetry stream. No simulator fallback.
    async def test_45_section18_test_05_live_hardware_start_stream_blocked_when_unverified(self):
        """TEST 5: LIVE_HARDWARE selected -> No physical device -> Start Stream BLOCKED, stream remains STOPPED, no simulator fallback."""
        dev = DEVICE_REGISTRY.get("DEV-SMU-KEITHLEY-2602B")
        self.manager.active_hardware_device = dev
        self.manager.hardware_connection_state = HardwareConnectionState.VERIFICATION_FAILED
        self.manager.hardware_connected = False
        self.manager.live_hardware_verified = False

        status = await self.manager.start_stream(source_type="scpi_lxi")
        self.assertFalse(status.get("success", False))
        self.assertEqual(status.get("status"), "STOPPED")
        self.assertIn("Live hardware stream cannot start", status.get("message", ""))
        self.assertIn("Physical hardware connection has not been verified", status.get("message", ""))
        self.assertFalse(self.manager.hardware_connected)
        self.assertNotEqual(self.manager.connection_status, "CONNECTED")
        self.assertFalse(self.manager.sources["simulator"].is_connected)
        self.assertFalse(self.manager.sources["hardware_mock"].is_connected)

    # TEST 6: LIVE_HARDWARE selected. Physical device successfully verified. Expected: hardware_verified = true.
    async def test_46_section18_test_06_live_hardware_verified_when_physical_passes(self):
        """TEST 6: LIVE_HARDWARE selected -> Physical verification succeeds -> hardware_verified = true, connection_state = VERIFIED."""
        mock_id = {
            "raw": "KEITHLEY INSTRUMENTS INC.,MODEL 2602B,4102941,3.3.4",
            "manufacturer": "Keithley Instruments",
            "model": "2602B System SourceMeter",
            "serial_number": "4102941",
            "firmware_version": "3.3.4",
            "is_valid": True,
            "provenance": "LIVE_HARDWARE",
            "manufacturer_matched": True,
            "model_matched": True,
            "identity_verified": True
        }
        async def mock_connect(self_adapter, cfg=None):
            self_adapter.is_connected = True
            self_adapter.health_status = HardwareHealthStatus.CONNECTED
            return True

        async def mock_identify(self_adapter):
            self_adapter._last_identity = mock_id
            return mock_id

        async def mock_disconnect(self_adapter):
            self_adapter.is_connected = False
            return True

        with patch.object(ScpiEthernetLxiAdapter, "connect", mock_connect), \
             patch.object(ScpiEthernetLxiAdapter, "identify", mock_identify), \
             patch.object(ScpiEthernetLxiAdapter, "disconnect", mock_disconnect):

            res = await self.manager.test_hardware_connection("DEV-SMU-KEITHLEY-2602B")
            self.assertTrue(res["success"])
            self.assertEqual(res["status"], "VERIFIED")
            self.assertEqual(res["source_type"], "LIVE_HARDWARE")
            self.assertTrue(res["hardware_connected"])
            self.assertTrue(res["live_hardware_verified"])
            self.assertIn("Physical hardware connection verified", res["message"])
            self.assertTrue(self.manager.hardware_connected)
            self.assertTrue(self.manager.live_hardware_verified)
            self.assertEqual(self.manager.hardware_connection_state, HardwareConnectionState.VERIFIED)

    # TEST 7: Verified LIVE_HARDWARE. Start Stream. Expected: real live stream starts.
    async def test_47_section18_test_07_verified_live_hardware_starts_real_stream(self):
        """TEST 7: Verified LIVE_HARDWARE -> Start Stream -> real live stream starts, provenance = LIVE_HARDWARE."""
        dev = DEVICE_REGISTRY.get("DEV-SMU-KEITHLEY-2602B")
        self.manager.active_hardware_device = dev
        self.manager.hardware_connection_state = HardwareConnectionState.VERIFIED
        self.manager.live_hardware_verified = True
        self.manager.hardware_connected = True

        async def mock_scpi_connect(cfg=None):
            self.manager.sources["scpi_lxi"].is_connected = True
            self.manager.sources["scpi_lxi"].health_status = HardwareHealthStatus.CONNECTED
            return True

        with patch.object(self.manager.sources["scpi_lxi"], "connect", mock_scpi_connect):
            status = await self.manager.start_stream(source_type="scpi_lxi")
            self.assertTrue(status.get("success", False))
            self.assertIn("Live hardware telemetry stream started", status.get("message", ""))
            self.assertEqual(self.manager.hardware_connection_state, HardwareConnectionState.STREAMING)
            self.assertTrue(self.manager.hardware_connected)
            self.assertTrue(self.manager.live_hardware_verified)

            hw_status = self.manager.get_hardware_status()
            self.assertEqual(hw_status["data_source"], "LIVE HARDWARE")
            self.assertTrue(hw_status["hardware_connected"])
            self.assertTrue(hw_status["physical_hardware_connected"])
            self.assertEqual(hw_status["telemetry_state"], "LIVE")

    # TEST 8: Verified LIVE_HARDWARE. Connection is lost. Expected: stream stops automatically. state = CONNECTION_LOST. hardware_connected = false.
    async def test_48_section18_test_08_verified_live_hardware_connection_loss(self):
        """TEST 8: Verified LIVE_HARDWARE streaming -> Connection lost -> stream stops, state = CONNECTION_LOST, hardware_connected = false."""
        dev = DEVICE_REGISTRY.get("DEV-SMU-KEITHLEY-2602B")
        self.manager.active_hardware_device = dev
        self.manager.hardware_connection_state = HardwareConnectionState.STREAMING
        self.manager.live_hardware_verified = True
        self.manager.hardware_connected = True

        loss_status = await self.manager.handle_hardware_connection_loss("Socket reset by peer during acquisition")
        self.assertEqual(self.manager.hardware_connection_state, HardwareConnectionState.CONNECTION_LOST)
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)
        self.assertEqual(loss_status["connection_status"], "CONNECTION_LOST")

        hw_status = self.manager.get_hardware_status()
        self.assertFalse(hw_status["hardware_connected"])
        self.assertFalse(hw_status["physical_hardware_connected"])
        self.assertEqual(hw_status["connection_state"], "CONNECTION_LOST")
        self.assertEqual(hw_status["telemetry_state"], "STOPPED")

    # TEST 9: Replay source. Start Stream. Expected: REPLAY telemetry only. Never mark hardware connected.
    async def test_49_section18_test_09_replay_source_start_stream(self):
        """TEST 9: Replay source -> Start Stream -> REPLAY telemetry only, never mark hardware connected."""
        status = await self.manager.start_stream(source_type="csv_replay")
        self.assertTrue(status.get("success", False))
        self.assertIn("Replay telemetry stream started", status.get("message", ""))
        self.assertEqual(self.manager.replay_state, ReplayState.REPLAY_STREAMING)
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)

        hw_status = self.manager.get_hardware_status()
        self.assertEqual(hw_status["data_source"], "REPLAY")
        self.assertFalse(hw_status["hardware_connected"])
        self.assertFalse(hw_status["physical_hardware_connected"])
        self.assertTrue(hw_status["replay_active"])
        self.assertEqual(hw_status["replay_status"], "ACTIVE")

    # TEST 10: Switch from SIMULATION to LIVE_HARDWARE. Expected: simulator stops or is isolated. LIVE_HARDWARE remains unverified until physical verification succeeds.
    async def test_50_section18_test_10_switch_simulation_to_live_hardware_isolation(self):
        """TEST 10: Switch from SIMULATION to LIVE_HARDWARE -> simulator isolated, LIVE_HARDWARE unverified until physical verification succeeds."""
        # 1. Start simulation
        await self.manager.start_stream(source_type="simulator")
        self.assertEqual(self.manager.simulator_state, SimulatorState.SIMULATOR_STREAMING)

        # 2. Select and attempt to connect to LIVE_HARDWARE without physical instrument present
        conn_res = await self.manager.connect_hardware("DEV-SMU-KEITHLEY-2602B")
        self.assertFalse(conn_res["success"])
        self.assertEqual(conn_res["status"], "DISCONNECTED")

        # TARGET DEVICE != ACTIVE DATA SOURCE
        self.assertEqual(self.manager.active_hardware_device.device_id, "DEV-SMU-KEITHLEY-2602B")
        self.assertFalse(self.manager.hardware_connected)
        self.assertFalse(self.manager.live_hardware_verified)
        self.assertEqual(self.manager.hardware_connection_state, HardwareConnectionState.VERIFICATION_FAILED)

        hw_status = self.manager.get_hardware_status()
        self.assertFalse(hw_status["hardware_connected"])
        self.assertIn("Target device configured, but physical hardware is not connected", hw_status["target_device_note"])


if __name__ == "__main__":
    unittest.main()

