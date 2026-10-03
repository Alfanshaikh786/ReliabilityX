"""
ReliabilityX CSV Replay Ingestion Adapter
Replays historical or uploaded CSV burn-in datasets chronologically as live streaming telemetry.
Emulates physical equipment data arrival at discrete gate milestones (0h -> 24h -> 96h -> 168h).
"""
from __future__ import annotations
import asyncio
import io
import os
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.ingestion.base import TelemetrySource, TelemetryPacket
from backend.core.config import DEFAULT_PARAMETER_SPECS
from backend.core.db import get_db_connection


class CsvReplayAdapter(TelemetrySource):
    """
    CSV Replay Adapter.
    Streams tabular checkpoint data row-by-row into the real-time AI pipeline,
    verifying end-to-end telemetry arrival without requiring active ATE hardware.
    """

    def __init__(self, source_name: str = "CSV_REPLAY_GATE"):
        super().__init__(source_name=source_name)
        self.sampling_rate_sec: float = 0.5
        self.records: List[Dict[str, Any]] = []
        self.cursor_idx: int = 0
        self._is_paused: bool = False
        self._task: Optional[asyncio.Task] = None
        self.dataset_id: Optional[str] = None
        self.loop_replay: bool = False

    async def connect(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Loads data from specified file path or active SQLite dataset and starts replay."""
        if config:
            self.configure(config)

        if not self.records:
            # Fallback to loading active measurements from DB
            self.load_from_active_db()

        if not self.records:
            self._last_error = "No replay records available. Load a dataset first."
            return False

        self.is_connected = True
        self._is_paused = False
        self._last_error = None

        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run_loop())
        return True

    def configure(self, config: Dict[str, Any]) -> None:
        if "sampling_rate" in config:
            self.sampling_rate_sec = max(0.05, min(5.0, float(config["sampling_rate"])))
        if "loop" in config:
            self.loop_replay = bool(config["loop"])
        if "csv_path" in config and os.path.exists(config["csv_path"]):
            self.load_from_csv(config["csv_path"])
        elif "dataset_id" in config:
            self.load_from_db(config["dataset_id"])

    def load_from_csv(self, file_path: str) -> int:
        """Loads raw CSV and prepares chronological stream buffer."""
        df = pd.read_csv(file_path)
        return self._prepare_from_dataframe(df)

    def load_from_active_db(self) -> int:
        """Queries the currently active dataset from SQLite."""
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id FROM datasets WHERE is_active = 1 LIMIT 1")
        active = c.fetchone()
        if not active:
            conn.close()
            return 0
        return self.load_from_db(active["id"], conn)

    def load_from_db(self, dataset_id: str, conn=None) -> int:
        """Loads measurements for a given dataset_id from SQLite."""
        close_needed = False
        if conn is None:
            conn = get_db_connection()
            close_needed = True

        c = conn.cursor()
        c.execute("""
        SELECT component_id, lot_id, test_stage, timestamp_hours, parameter_name, 
               processed_value, raw_value, is_valid, noise_flag
        FROM measurements
        WHERE dataset_id = ?
        ORDER BY timestamp_hours ASC, component_id ASC
        """, (dataset_id,))
        rows = c.fetchall()
        if close_needed:
            conn.close()

        self.dataset_id = dataset_id
        self.records = [dict(r) for r in rows]
        self.cursor_idx = 0
        return len(self.records)

    def _prepare_from_dataframe(self, df: pd.DataFrame) -> int:
        # Normalize columns if needed
        records = []
        # Sort by timestamp/stage
        stage_order = {"0h": 0, "24h": 24, "96h": 96, "168h": 168}
        
        for _, row in df.iterrows():
            stage_str = str(row.get("test_stage", "BURN_IN"))
            hours = float(row.get("timestamp", stage_order.get(stage_str, 0.0)))
            param = str(row.get("parameter_name", "leakage_current_uA"))
            val = float(row.get("parameter_value", row.get("raw_value", 0.0)))
            records.append({
                "component_id": str(row.get("component_id", "C-0001")),
                "lot_id": str(row.get("lot_id", "LOT-01")),
                "test_stage": stage_str,
                "timestamp_hours": hours,
                "parameter_name": param,
                "processed_value": val,
                "raw_value": val,
                "is_valid": int(row.get("is_valid", 1)),
                "noise_flag": int(row.get("noise_flag", 0))
            })

        records.sort(key=lambda x: (x["timestamp_hours"], x["component_id"]))
        self.records = records
        self.cursor_idx = 0
        return len(self.records)

    async def pause(self) -> None:
        self._is_paused = True

    async def resume(self) -> None:
        self._is_paused = False

    async def stop(self) -> None:
        self._is_paused = False
        self.is_connected = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        self.cursor_idx = 0

    async def disconnect(self) -> bool:
        await self.stop()
        return True

    async def read(self) -> Optional[TelemetryPacket]:
        if not self.is_connected or self._is_paused or not self.records:
            return None

        if self.cursor_idx >= len(self.records):
            if self.loop_replay:
                self.cursor_idx = 0
            else:
                self.is_connected = False
                return None

        rec = self.records[self.cursor_idx]
        self.cursor_idx += 1

        param = rec["parameter_name"]
        spec = DEFAULT_PARAMETER_SPECS.get(param, DEFAULT_PARAMETER_SPECS["leakage_current_uA"])
        val = float(rec["processed_value"])

        quality = "GOOD"
        if rec.get("noise_flag") == 1:
            quality = "SUSPECT_SPIKE"
        elif rec.get("is_valid") == 0:
            quality = "LIMIT_BREACH" if val > spec.max_limit else "SUSPECT_SPIKE"

        packet = TelemetryPacket(
            component_id=rec["component_id"],
            lot_id=rec["lot_id"],
            timestamp=datetime.utcnow().isoformat(),
            timestamp_hours=float(rec["timestamp_hours"]),
            test_stage=rec["test_stage"],
            parameter=param,
            value=val,
            unit=spec.unit,
            source=self.source_name,
            quality=quality,
            extra={
                "replay_index": self.cursor_idx,
                "total_records": len(self.records)
            }
        )
        return packet

    async def _run_loop(self) -> None:
        while self.is_connected:
            try:
                if not self._is_paused:
                    packet = await self.read()
                    if packet is not None:
                        await self.emit(packet)
                    elif self.cursor_idx >= len(self.records) and not self.loop_replay:
                        break
                await asyncio.sleep(self.sampling_rate_sec)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._last_error = f"CSV Replay exception: {str(e)}"
                await asyncio.sleep(1.0)
