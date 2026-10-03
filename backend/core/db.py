"""
Database module for ReliabilityX
Structured SQLite database with relational tables and audit tracking.
Designed to be compatible with PostgreSQL if upgraded.
"""
import os
import shutil
import sqlite3
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.core.config import CONFIG

logger = logging.getLogger("ReliabilityX.DB")


def _connect_raw(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_db_ready(db_path: str = None):
    """
    Ensures that the SQLite database file at db_path exists, has all schema tables,
    and contains an active screening dataset (the Arrhenius benchmark).
    If the file is missing or has 0 active datasets, it seeds it automatically from
    the pre-calculated seed_benchmark.db (or runs the generator pipeline as fallback).
    This guarantees production parity between local and serverless deployments like Vercel.
    """
    target_path = db_path or CONFIG.db_path

    # Ensure target parent directory exists (e.g. /tmp on Vercel)
    db_dir = os.path.dirname(os.path.abspath(target_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    needs_seed = False
    if not os.path.exists(target_path) or os.path.getsize(target_path) == 0:
        needs_seed = True
    else:
        try:
            conn = _connect_raw(target_path)
            c = conn.cursor()
            c.execute("SELECT COUNT(*) as cnt FROM datasets WHERE is_active = 1")
            row = c.fetchone()
            conn.close()
            if not row or row["cnt"] == 0:
                needs_seed = True
        except Exception:
            needs_seed = True

    if needs_seed:
        # Check for bundled seed_benchmark.db in multiple potential runtime locations
        candidate_seeds = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "seed_benchmark.db"),
            os.path.join(os.getcwd(), "backend", "data", "seed_benchmark.db"),
            os.path.join(os.path.abspath("."), "backend", "data", "seed_benchmark.db"),
            "/var/task/backend/data/seed_benchmark.db",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "seed_benchmark.db")
        ]
        for sp in candidate_seeds:
            if os.path.exists(sp) and os.path.getsize(sp) > 0 and os.path.abspath(sp) != os.path.abspath(target_path):
                try:
                    shutil.copyfile(sp, target_path)
                    logger.info(f"Initialized database from seed benchmark ({sp}) -> {target_path}")
                    return
                except Exception as e:
                    logger.warning(f"Could not copy seed database from {sp}: {e}")

        # Fallback: initialize schema and run generator
        init_db(target_path)
        try:
            from backend.data.generator import generate_burnin_dataset
            from backend.core.orchestrator import PipelineOrchestrator
            df_demo, meta_demo = generate_burnin_dataset(num_lots=5, components_per_lot=25, seed=42)
            orch = PipelineOrchestrator(db_path=target_path)
            orch.run_pipeline(
                raw_df=df_demo,
                dataset_id="demo-arrhenius-v1",
                dataset_name="Physics-Informed Arrhenius Burn-In Benchmark (Demo)",
                dataset_mode="demo",
                filename="arrhenius_benchmark_stream.csv",
                ground_truth=meta_demo["ground_truth"]
            )
        except Exception as e:
            logger.error(f"Failed fallback benchmark generation: {e}")


def get_db_connection(db_path: str = None) -> sqlite3.Connection:
    target_path = db_path or CONFIG.db_path
    ensure_db_ready(target_path)
    return _connect_raw(target_path)


def init_db(db_path: str = None):
    target_path = db_path or CONFIG.db_path
    db_dir = os.path.dirname(os.path.abspath(target_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = _connect_raw(target_path)
    cursor = conn.cursor()

    # Datasets
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mode TEXT NOT NULL, -- 'demo' or 'user_uploaded'
        filename TEXT,
        row_count INTEGER DEFAULT 0,
        component_count INTEGER DEFAULT 0,
        lot_count INTEGER DEFAULT 0,
        quality_summary_json TEXT,
        created_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 0
    )
    """)

    # Lots
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lots (
        lot_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        component_count INTEGER DEFAULT 0,
        pass_count INTEGER DEFAULT 0,
        watch_count INTEGER DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        high_risk_count INTEGER DEFAULT 0,
        anomaly_percentage REAL DEFAULT 0.0,
        avg_drift REAL DEFAULT 0.0,
        accelerating_count INTEGER DEFAULT 0,
        is_lot_wide_pattern INTEGER DEFAULT 0,
        pattern_description TEXT,
        dominant_abnormal_param TEXT,
        PRIMARY KEY (lot_id, dataset_id)
    )
    """)

    # Components
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS components (
        component_id TEXT NOT NULL,
        lot_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        current_state TEXT NOT NULL, -- 'NORMAL', 'DRIFTING', 'ACCELERATING', 'UNSTABLE', 'HIGH RISK'
        risk_level TEXT NOT NULL,    -- 'PASS', 'WATCH', 'REVIEW', 'HIGH RISK'
        inspection_priority INTEGER DEFAULT 999,
        priority_reason TEXT,
        rules_fired_json TEXT,
        behaviour_fingerprint_json TEXT,
        evidence_breakdown_json TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (component_id, dataset_id)
    )
    """)

    # Measurements (Immutable raw data preserved)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id TEXT NOT NULL,
        lot_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        test_stage TEXT NOT NULL, -- '0h', '24h', '96h', '168h'
        timestamp_hours REAL NOT NULL,
        parameter_name TEXT NOT NULL,
        raw_value REAL NOT NULL,
        processed_value REAL NOT NULL,
        is_valid INTEGER DEFAULT 1,
        noise_flag INTEGER DEFAULT 0,
        source_record_id TEXT
    )
    """)

    # Live Telemetry Raw Stream (Immutable test equipment measurements)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS live_telemetry_raw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id TEXT NOT NULL,
        lot_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        timestamp_hours REAL NOT NULL,
        test_stage TEXT NOT NULL,
        parameter_name TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        source TEXT NOT NULL,
        quality TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Feature Engineering Metrics
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS features (
        component_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        parameter_name TEXT NOT NULL,
        val_0h REAL,
        val_24h REAL,
        val_96h REAL,
        val_168h REAL,
        delta_0_24 REAL,
        delta_24_96 REAL,
        delta_96_168 REAL,
        pct_change_24 REAL,
        pct_change_168 REAL,
        drift_rate_24 REAL,
        drift_rate_96 REAL,
        drift_acceleration REAL,
        lot_zscore_24 REAL,
        robust_zscore_24 REAL,
        distance_to_limit REAL,
        rate_of_approach REAL,
        safety_slope REAL,
        PRIMARY KEY (component_id, dataset_id, parameter_name)
    )
    """)

    # Anomaly Detection Results
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomaly_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        detector_name TEXT NOT NULL, -- 'DPAT', 'Robust_Z', 'Isolation_Forest', 'Mahalanobis', 'LOF', 'Ensemble'
        raw_score REAL,
        normalized_score REAL NOT NULL,
        is_anomalous INTEGER NOT NULL,
        evidence TEXT,
        detector_status TEXT NOT NULL -- 'ACTIVE', 'FALLBACK', 'SKIPPED'
    )
    """)

    # 168h Predictions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        parameter_name TEXT NOT NULL,
        stage_used TEXT NOT NULL, -- '24h' or '96h'
        model_name TEXT NOT NULL,
        model_version TEXT NOT NULL,
        predicted_168h REAL NOT NULL,
        uncertainty_std REAL NOT NULL,
        lower_bound_95 REAL NOT NULL,
        upper_bound_95 REAL NOT NULL,
        p90_worst_case REAL NOT NULL,
        actual_168h REAL,
        error_absolute REAL
    )
    """)

    # QA Decisions & Human-in-the-loop Reviews
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        ai_recommendation TEXT NOT NULL,
        engineer_decision TEXT NOT NULL, -- 'PASS', 'WATCH', 'REVIEW', 'REJECT'
        engineer_name TEXT NOT NULL,
        comments TEXT,
        action_timestamp TEXT NOT NULL
    )
    """)

    # Audit Logs (Full test-to-decision traceability)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        details_json TEXT
    )
    """)

    # Model Performance Evaluation Metrics
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        evaluation_timestamp TEXT NOT NULL,
        mae REAL,
        rmse REAL,
        r2 REAL,
        precision REAL,
        recall REAL,
        f1_score REAL,
        false_positives INTEGER,
        false_negatives INTEGER,
        total_defects INTEGER,
        confusion_matrix_json TEXT
    )
    """)

    conn.commit()
    conn.close()


def log_audit(action: str, entity_type: str, entity_id: str, user_name: str, details: Dict[str, Any], db_path: str = CONFIG.db_path, conn: Optional[sqlite3.Connection] = None):
    should_close = False
    if conn is None:
        conn = get_db_connection(db_path)
        should_close = True
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_name, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        datetime.utcnow().isoformat(),
        action,
        entity_type,
        entity_id,
        user_name,
        json.dumps(details)
    ))
    if should_close:
        conn.commit()
        conn.close()
