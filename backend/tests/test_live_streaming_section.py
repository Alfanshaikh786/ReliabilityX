"""
ReliabilityX — Automated Test Suite for Live Telemetry / Streaming Section
Implements and validates all 16 tests defined in Section 25:
TEST 1:  Select simulator, start stream, generate at least one telemetry event.
TEST 2:  Messages Processed increases.
TEST 3:  Points in buffer increases.
TEST 4:  Current telemetry reading becomes non-null.
TEST 5:  Chart receives telemetry data.
TEST 6:  Data Quality Engine processes the event.
TEST 7:  source_type remains SIMULATED.
TEST 8:  Pause stops new events.
TEST 9:  Resume continues events.
TEST 10: Stop prevents further events.
TEST 11: Changing component changes the telemetry source correctly.
TEST 12: Changing parameter changes the selected measurement correctly.
TEST 13: Changing defect scenario changes simulator behavior using the EXISTING scenario engine.
TEST 14: No hardware is ever marked connected because the simulator is running.
TEST 15: 168h remains the primary prediction target.
TEST 16: Existing prediction/conformal logic remains unchanged.
"""
import asyncio
import os
import sys
import unittest
import numpy as np

# Ensure root directory is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.ingestion.simulator import LiveSimulatorAdapter
from backend.ingestion.manager import IngestionManager
from backend.ingestion.base import TelemetryPacket, TelemetrySourceType
from backend.core.config import CONFIG, DEFAULT_PARAMETER_SPECS


class TestLiveStreamingSection(unittest.IsolatedAsyncioTestCase):
    """Automated unit and integration tests for Section 25 live streaming requirements."""

    async def asyncSetUp(self):
        self.mgr = IngestionManager()
        self.sim = self.mgr.sources["simulator"]

    async def asyncTearDown(self):
        try:
            await self.mgr.stop_stream()
        except Exception:
            pass

    async def test_01_simulator_start_stream_generates_event(self):
        """TEST 1: Select simulator. Start stream. At least one telemetry event is generated."""
        received_packets = []

        async def packet_callback(data):
            received_packets.append(data)

        # Register callback
        self.sim.subscribe(packet_callback)
        start_status = await self.mgr.start_stream("simulator", {
            "component_id": "C-01008",
            "parameter": "leakage_current_uA",
            "sampling_rate": 0.05
        })

        self.assertEqual(start_status["connection_status"], "CONNECTED")
        self.assertEqual(start_status["source_type"], "simulator")

        # Allow time for background emission
        await asyncio.sleep(0.3)
        self.assertGreater(len(received_packets), 0, "At least one telemetry event must be generated.")

    async def test_02_messages_processed_increases(self):
        """TEST 2: Messages Processed increases."""
        initial_count = self.mgr.messages_count
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.35)

        st = self.mgr.get_status()
        self.assertGreater(st["messages_count"], initial_count)
        self.assertGreater(st["messages_processed"], 0)

    async def test_03_points_in_buffer_increases(self):
        """TEST 3: Points in buffer increases."""
        buffer = []

        # Intercept fast-path emitted points
        original_broadcast = self.mgr.broadcast

        async def mock_broadcast(event_type, data):
            if event_type == "LIVE_SAMPLE":
                buffer.append(data)
            await original_broadcast(event_type, data)

        self.mgr.broadcast = mock_broadcast
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.35)

        self.assertGreater(len(buffer), 0, "Buffer should receive incoming telemetry points.")

    async def test_04_current_telemetry_reading_becomes_non_null(self):
        """TEST 4: Current telemetry reading becomes non-null."""
        last_val = None

        original_broadcast = self.mgr.broadcast

        async def mock_broadcast(event_type, data):
            nonlocal last_val
            if event_type == "LIVE_SAMPLE":
                last_val = data.get("value")
            await original_broadcast(event_type, data)

        self.mgr.broadcast = mock_broadcast
        await self.mgr.start_stream("simulator", {
            "component_id": "C-01008",
            "parameter": "leakage_current_uA",
            "sampling_rate": 0.05
        })
        await asyncio.sleep(0.3)

        self.assertIsNotNone(last_val, "Telemetry reading must be populated with actual measurement.")
        self.assertIsInstance(last_val, float)
        self.assertGreater(last_val, 0.0)

    async def test_05_chart_receives_telemetry_data(self):
        """TEST 5: Chart receives telemetry data."""
        chart_points = []

        original_broadcast = self.mgr.broadcast

        async def mock_broadcast(event_type, data):
            if event_type == "LIVE_SAMPLE":
                chart_points.append({
                    "hour": data.get("timestamp_hours"),
                    "val": data.get("value")
                })
            await original_broadcast(event_type, data)

        self.mgr.broadcast = mock_broadcast
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.35)

        self.assertGreater(len(chart_points), 0)
        self.assertTrue(all("hour" in pt and "val" in pt for pt in chart_points))

    async def test_06_data_quality_engine_processes_event(self):
        """TEST 6: Data Quality Engine processes the event."""
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.35)

        st = self.mgr.get_status()
        self.assertGreater(st["data_quality"]["good_count"], 0)
        self.assertGreater(st["data_quality"]["good_pct"], 0.0)

    async def test_07_source_type_remains_simulated(self):
        """TEST 7: source_type remains SIMULATED."""
        emitted_source_types = []

        original_broadcast = self.mgr.broadcast

        async def mock_broadcast(event_type, data):
            if event_type == "LIVE_SAMPLE":
                emitted_source_types.append(data.get("source_type"))
            await original_broadcast(event_type, data)

        self.mgr.broadcast = mock_broadcast
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.3)

        self.assertGreater(len(emitted_source_types), 0)
        for st in emitted_source_types:
            self.assertEqual(st, "SIMULATED", "Simulator telemetry must strictly carry source_type=SIMULATED.")

    async def test_08_pause_stops_new_events(self):
        """TEST 8: Pause stops new events."""
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.2)

        pause_res = await self.mgr.pause_stream()
        self.assertEqual(pause_res["connection_status"], "PAUSED")

        count_at_pause = self.mgr.messages_count
        await asyncio.sleep(0.25)
        count_after_pause = self.mgr.messages_count

        self.assertEqual(count_at_pause, count_after_pause, "No new events should be generated while paused.")

    async def test_09_resume_continues_events(self):
        """TEST 9: Resume continues events."""
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.15)
        await self.mgr.pause_stream()

        count_paused = self.mgr.messages_count
        resume_res = await self.mgr.resume_stream()
        self.assertEqual(resume_res["connection_status"], "CONNECTED")

        await asyncio.sleep(0.25)
        count_resumed = self.mgr.messages_count

        self.assertGreater(count_resumed, count_paused, "Telemetry generation should resume after unpausing.")

    async def test_10_stop_prevents_further_events(self):
        """TEST 10: Stop prevents further events."""
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.2)

        stop_res = await self.mgr.stop_stream()
        self.assertEqual(stop_res["connection_status"], "DISCONNECTED")
        final_count = self.mgr.messages_count

        await asyncio.sleep(0.25)
        self.assertEqual(self.mgr.messages_count, final_count, "Stop stream must prevent any further events.")

    async def test_11_changing_component_changes_telemetry_source(self):
        """TEST 11: Changing component changes the telemetry source correctly."""
        received_cids = []

        original_broadcast = self.mgr.broadcast

        async def mock_broadcast(event_type, data):
            if event_type == "LIVE_SAMPLE":
                received_cids.append(data.get("component_id"))
            await original_broadcast(event_type, data)

        self.mgr.broadcast = mock_broadcast
        await self.mgr.start_stream("simulator", {
            "component_id": "C-01008",
            "sampling_rate": 0.05
        })
        await asyncio.sleep(0.2)

        # Dynamically change component
        self.mgr.configure_source({"component_id": "C-02016", "lot_id": "LOT-2411B"})
        await asyncio.sleep(0.25)

        self.assertIn("C-01008", received_cids)
        self.assertIn("C-02016", received_cids)

    async def test_12_changing_parameter_changes_selected_measurement(self):
        """TEST 12: Changing parameter changes the selected measurement correctly."""
        received_params = []

        original_broadcast = self.mgr.broadcast

        async def mock_broadcast(event_type, data):
            if event_type == "LIVE_SAMPLE":
                received_params.append(data.get("parameter"))
            await original_broadcast(event_type, data)

        self.mgr.broadcast = mock_broadcast
        await self.mgr.start_stream("simulator", {
            "parameter": "leakage_current_uA",
            "sampling_rate": 0.05
        })
        await asyncio.sleep(0.2)

        # Dynamically switch parameter
        self.mgr.configure_source({"parameter": "standby_current_mA"})
        await asyncio.sleep(0.25)

        self.assertIn("leakage_current_uA", received_params)
        self.assertIn("standby_current_mA", received_params)

    async def test_13_changing_defect_scenario_changes_simulator_behavior(self):
        """TEST 13: Changing defect scenario changes simulator behavior using the EXISTING scenario engine."""
        sim = LiveSimulatorAdapter()
        await sim.connect({"scenario": "NORMAL", "sampling_rate": 0.05})
        pkt_normal = await sim.read()
        self.assertEqual(pkt_normal.extra["scenario"], "NORMAL")

        # Change to Accelerating Runaway
        sim.configure({"scenario": "ACCELERATING_RUNAWAY"})
        pkt_accel = await sim.read()
        self.assertEqual(pkt_accel.extra["scenario"], "ACCELERATING_RUNAWAY")

        # Change to Stuck Sensor
        sim.configure({"scenario": "STUCK_SENSOR"})
        pkt_stuck = await sim.read()
        self.assertEqual(pkt_stuck.extra["scenario"], "STUCK_SENSOR")
        await sim.stop()

    async def test_14_no_hardware_is_ever_marked_connected(self):
        """TEST 14: No hardware is ever marked connected because the simulator is running."""
        await self.mgr.start_stream("simulator", {"sampling_rate": 0.05})
        await asyncio.sleep(0.2)

        st = self.mgr.get_status()
        hw_st = self.mgr.get_hardware_status()

        self.assertFalse(st["hardware_connected"])
        self.assertFalse(st["physical_hardware_connected"])
        self.assertFalse(st["live_hardware_verified"])
        self.assertFalse(hw_st["physical_hardware_connected"])
        self.assertFalse(hw_st["hardware_connected"])
        self.assertEqual(hw_st["hardware_connection_state"], "DISCONNECTED")

    async def test_15_168h_remains_primary_prediction_target(self):
        """TEST 15: 168h remains the primary prediction target."""
        from backend.core.config import CHECKPOINTS, CHECKPOINT_LABELS
        self.assertEqual(CHECKPOINTS[-1], 168)
        self.assertEqual(CHECKPOINT_LABELS[-1], "168h")
        self.assertEqual(self.sim.max_burnin_hours, 168.0)

    async def test_16_existing_prediction_and_conformal_logic_preserved(self):
        """TEST 16: Existing prediction/conformal logic remains unchanged."""
        from backend.prediction.conformal import CANONICAL_BENCHMARK_CONFORMAL_QUANTILES
        self.assertIn("leakage_current_uA", CANONICAL_BENCHMARK_CONFORMAL_QUANTILES)
        self.assertAlmostEqual(CANONICAL_BENCHMARK_CONFORMAL_QUANTILES["leakage_current_uA"], 2.25, places=2)


if __name__ == "__main__":
    unittest.main()
