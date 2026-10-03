"""
ReliabilityX MQTT Telemetry Ingestion Adapter
Connects to industrial IoT / MQTT message brokers (e.g., Mosquitto, EMQX, AWS IoT).
Receives incoming test equipment telemetry topics, normalizes JSON payloads, and injects into ReliabilityX.
Includes built-in simulated test socket when external broker is not present.
"""
import asyncio
import json
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.ingestion.base import TelemetrySource, TelemetryPacket
from backend.core.config import DEFAULT_PARAMETER_SPECS

try:
    import paho.mqtt.client as mqtt_client
    PAHO_AVAILABLE = True
except ImportError:
    PAHO_AVAILABLE = False


class MqttAdapter(TelemetrySource):
    """
    MQTT Ingestion Adapter.
    Subscribes to test equipment publish topics, e.g.:
    reliabilityx/ate/<test_bench_id>/<lot_id>/<component_id>
    Payload format:
    {
        "component_id": "C-01008",
        "lot_id": "LOT-2411C",
        "timestamp": "2026-10-02T10:15:00Z",
        "timestamp_hours": 24.0,
        "test_stage": "24h",
        "parameter": "leakage_current_uA",
        "value": 6.84,
        "unit": "µA",
        "source": "MQTT_TEST_BENCH_01"
    }
    """

    def __init__(self, source_name: str = "MQTT_BROKER_01"):
        super().__init__(source_name=source_name)
        self.broker_host: str = "localhost"
        self.broker_port: int = 1883
        self.topic: str = "reliabilityx/telemetry/#"
        self.use_virtual_mode: bool = not PAHO_AVAILABLE
        self._mqtt_client = None
        self._virtual_task: Optional[asyncio.Task] = None
        self._is_paused: bool = False

    async def connect(self, config: Optional[Dict[str, Any]] = None) -> bool:
        if config:
            self.configure(config)

        self.is_connected = True
        self._is_paused = False
        self._last_error = None

        if PAHO_AVAILABLE and not self.use_virtual_mode:
            try:
                self._mqtt_client = mqtt_client.Client(client_id=f"ReliabilityX_{random.randint(1000, 9999)}")
                self._mqtt_client.on_message = self._on_paho_message
                self._mqtt_client.connect(self.broker_host, self.broker_port, 60)
                self._mqtt_client.subscribe(self.topic)
                self._mqtt_client.loop_start()
                return True
            except Exception as e:
                self._last_error = f"MQTT connection failed ({str(e)}). Falling back to virtual broker."
                self.use_virtual_mode = True

        # Virtual MQTT receiver loop (emulates equipment sending via MQTT)
        if self._virtual_task is None or self._virtual_task.done():
            self._virtual_task = asyncio.create_task(self._virtual_broker_loop())
        return True

    def configure(self, config: Dict[str, Any]) -> None:
        if "broker_host" in config:
            self.broker_host = str(config["broker_host"])
        if "broker_port" in config:
            self.broker_port = int(config["broker_port"])
        if "topic" in config:
            self.topic = str(config["topic"])
        if "virtual_mode" in config:
            self.use_virtual_mode = bool(config["virtual_mode"])

    def _on_paho_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            packet = self._normalize_payload(payload)
            # Dispatch synchronously or schedule on event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.emit(packet), loop)
        except Exception as e:
            self._last_error = f"MQTT message decode error: {str(e)}"

    def _normalize_payload(self, data: Dict[str, Any]) -> TelemetryPacket:
        param = data.get("parameter", data.get("parameter_name", "leakage_current_uA"))
        spec = DEFAULT_PARAMETER_SPECS.get(param, DEFAULT_PARAMETER_SPECS["leakage_current_uA"])
        val = float(data.get("value", data.get("parameter_value", spec.nominal_baseline)))
        
        quality = data.get("quality", "GOOD")
        if val > spec.max_limit:
            quality = "LIMIT_BREACH"

        return TelemetryPacket(
            component_id=str(data.get("component_id", "C-01008")),
            lot_id=str(data.get("lot_id", "LOT-2411C")),
            timestamp=str(data.get("timestamp", datetime.utcnow().isoformat())),
            timestamp_hours=float(data.get("timestamp_hours", 0.0)),
            test_stage=str(data.get("test_stage", "BURN_IN")),
            parameter=param,
            value=val,
            unit=str(data.get("unit", spec.unit)),
            source=self.source_name,
            quality=quality,
            extra={"mqtt_topic": self.topic, "virtual": self.use_virtual_mode}
        )

    async def _virtual_broker_loop(self) -> None:
        """Emulates an incoming MQTT message stream for equipment benches."""
        cur_hour = 0.0
        while self.is_connected:
            try:
                if not self._is_paused:
                    spec = DEFAULT_PARAMETER_SPECS["leakage_current_uA"]
                    val = round(spec.nominal_baseline + (0.03 * cur_hour) + random.gauss(0, 0.2), 3)
                    payload = {
                        "component_id": "C-MQTT-01",
                        "lot_id": "LOT-MQTT-A",
                        "timestamp": datetime.utcnow().isoformat(),
                        "timestamp_hours": round(cur_hour, 1),
                        "test_stage": "BURN_IN",
                        "parameter": "leakage_current_uA",
                        "value": val,
                        "unit": "µA",
                        "source": self.source_name
                    }
                    packet = self._normalize_payload(payload)
                    await self.emit(packet)
                    cur_hour += 2.0
                    if cur_hour > 168.0:
                        cur_hour = 0.0
                await asyncio.sleep(1.5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._last_error = f"Virtual MQTT loop error: {str(e)}"
                await asyncio.sleep(1.0)

    async def pause(self) -> None:
        self._is_paused = True

    async def resume(self) -> None:
        self._is_paused = False

    async def stop(self) -> None:
        self._is_paused = False
        self.is_connected = False
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except Exception:
                pass
            self._mqtt_client = None

        if self._virtual_task and not self._virtual_task.done():
            self._virtual_task.cancel()
            try:
                await self._virtual_task
            except asyncio.CancelledError:
                pass
        self._virtual_task = None

    async def disconnect(self) -> bool:
        await self.stop()
        return True

    async def read(self) -> Optional[TelemetryPacket]:
        # MQTT is push-based (callbacks), polling returns None
        return None

    def health(self) -> Dict[str, Any]:
        info = super().health()
        info.update({
            "broker": f"{self.broker_host}:{self.broker_port}",
            "topic": self.topic,
            "mode": "VIRTUAL_EMULATED" if self.use_virtual_mode else "LIVE_PAHO_CLIENT"
        })
        return info
