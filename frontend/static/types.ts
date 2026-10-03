// ==============================================================================
// ReliabilityX — Data Types & Interface Specifications
// SIH26170: AI-Driven Anomaly Detection in Component Burn-In & Screening
// ==============================================================================

export type TabType =
  | "dashboard"
  | "screening"
  | "live_telemetry"
  | "components"
  | "lots"
  | "predictions"
  | "inspection"
  | "reports"
  | "engineering"
  | "audit";

export interface LiveStreamStatus {
  connection_status: "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "STALE" | "PAUSED" | "LIVE" | "OFFLINE" | string;
  raw_connection_status?: string;
  seconds_since_last_packet?: number;
  source_type: "simulator" | "csv_replay" | "mqtt" | string;
  source_name: string;
  source_integration_note?: string;
  messages_count: number;
  messages_received?: number;
  messages_processed?: number;
  messages_rejected?: number;
  queue_depth?: number;
  last_latency_ms: number;
  avg_latency_ms?: number;
  p95_latency_ms?: number;
  processing_rate?: number;
  last_update: string;
  subscribers: number;
  adapter_health?: any;
  data_quality?: {
    good_pct: number;
    warnings_pct: number;
    rejected_pct: number;
    good_count: number;
    warnings_count: number;
    rejected_count: number;
    recent_rejected_reasons?: any[];
  };
  alerts_count: number;
  recent_alerts?: LiveAlertItem[];
}

export interface LiveTelemetryPoint {
  component_id: string;
  lot_id: string;
  timestamp: string;
  timestamp_hours: number;
  test_stage: string;
  parameter: string;
  parameter_display: string;
  value: number;
  unit: string;
  source: string;
  quality: string;
  limit: number;
  nominal: number;
  drift_rate: number;
  accel: number;
  distance_to_limit: number;
  state: "NORMAL" | "DRIFTING" | "ACCELERATING" | "UNSTABLE" | "HIGH RISK" | string;
  risk: "PASS" | "WATCH" | "REVIEW" | "HIGH RISK" | string;
  alert?: LiveAlertItem;
  predicted_168h?: number | null;
  estimated_prediction_interval?: [number, number] | null;
  p90_upper_bound?: number | null;
  p90_worst_case?: number | null;
  uncertainty_std?: number | null;
  prediction_status?: string;
  prediction_available?: boolean;
  p90_tooltip?: string;
  pipeline_status?: {
    telemetry: boolean;
    quality: boolean;
    features: boolean;
    anomaly: boolean;
    behaviour: boolean;
    prediction: boolean;
    prediction_label: string;
    risk: boolean;
    status_string: string;
  };
}

export interface LiveAlertItem {
  component_id: string;
  lot_id: string;
  title: string;
  parameter: string;
  value: number;
  limit: number;
  unit: string;
  state: string;
  risk: string;
  timestamp: string;
  reason: string;
}

export interface LiveLotHealth {
  lot_id: string;
  anomaly_percentage: number;
  drifting_count: number;
  accelerating_count: number;
  high_risk_count: number;
  is_lot_wide_pattern: boolean;
  pattern_description: string;
}

export interface RawMeasurementRecord {
  id: number;
  component_id: string;
  lot_id: string;
  timestamp: string;
  timestamp_hours: number;
  test_stage: string;
  parameter_name: string;
  value: number;
  unit: string;
  source: string;
  quality: string;
  created_at: string;
}

export interface ComponentItem {
  component_id: string;
  lot_id: string;
  dataset_id?: string;
  current_state: string;
  risk_level: string;
  inspection_priority: number;
  priority_reason: string;
  rules_fired: string[];
  behaviour_fingerprint?: any;
  explanation?: any;
}

export interface MeasurementItem {
  test_stage: string;
  timestamp_hours: number;
  parameter_name: string;
  raw_value: number;
  processed_value: number;
  is_valid: number;
  noise_flag: number;
}

export interface PredictionItem {
  component_id: string;
  lot_id?: string;
  current_state?: string;
  risk_level?: string;
  parameter_name: string;
  stage_used: string;
  model_name: string;
  model_version: string;
  predicted_168h: number;
  uncertainty_std: number;
  lower_bound_95: number;
  upper_bound_95: number;
  p90_worst_case: number;
  actual_168h: number | null;
  engineering_limit: number;
  is_p90_breach?: boolean;
}

export interface LotItem {
  lot_id: string;
  component_count: number;
  pass_count: number;
  watch_count: number;
  review_count: number;
  high_risk_count: number;
  anomaly_percentage: number;
  avg_drift?: number;
  accelerating_count: number;
  is_lot_wide_pattern: number | boolean;
  pattern_description: string;
  dominant_abnormal_param?: string;
}

export interface ToastInfo {
  message: string;
  type: "success" | "error" | "info";
}
