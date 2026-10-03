export type BehaviourState = 'NORMAL' | 'DRIFTING' | 'ACCELERATING' | 'UNSTABLE' | 'HIGH RISK';
export type RiskLevel = 'PASS' | 'WATCH' | 'REVIEW' | 'HIGH RISK';
export type EngineerDecision = 'PASS' | 'WATCH' | 'REVIEW' | 'REJECT';

export interface ParameterSpec {
  name: string;
  display_name: string;
  unit: string;
  min_limit: number;
  max_limit: number;
  nominal_baseline: number;
  description: string;
  is_critical: boolean;
}

export interface ComponentItem {
  component_id: string;
  lot_id: string;
  dataset_id?: string;
  current_state: BehaviourState;
  risk_level: RiskLevel;
  inspection_priority: number;
  priority_reason: string;
  rules_fired: string[];
  behaviour_fingerprint?: {
    overall_state: BehaviourState;
    primary_driver: string;
    trajectory_type: string;
    features_summary?: any;
    evidence_points?: string[];
  };
  evidence?: {
    factor_contributions: Record<string, number>;
    top_drivers: string[];
    narrative_explanation: string;
  };
  created_at?: string;
}

export interface MeasurementItem {
  test_stage: '0h' | '24h' | '96h' | '168h';
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
  current_state?: BehaviourState;
  risk_level?: RiskLevel;
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
  error_absolute?: number | null;
  engineering_limit: number;
  is_p90_breach?: boolean;
}

export interface AnomalyResultItem {
  detector_name: string;
  raw_score: number | null;
  normalized_score: number;
  is_anomalous: boolean;
  evidence: string;
  detector_status: string;
}

export interface DecisionItem {
  id?: number;
  component_id: string;
  ai_recommendation: string;
  engineer_decision: EngineerDecision;
  engineer_name: string;
  comments: string;
  action_timestamp: string;
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

export interface WhatIfAnalysis {
  parameter_name: string;
  current_value: number;
  current_hour: number;
  remaining_hours: number;
  engineering_limit: number;
  headroom: number;
  current_drift_rate: number;
  max_allowable_drift_rate: number;
  margin_status: 'HEALTHY_MARGIN' | 'NARROW_MARGIN' | 'INSUFFICIENT_MARGIN' | 'BREACHED';
  is_already_breached: boolean;
  engineering_guidance: string;
}

export interface ComponentDetailData {
  component: ComponentItem;
  measurements: MeasurementItem[];
  features: any[];
  anomaly_results: AnomalyResultItem[];
  predictions: PredictionItem[];
  decisions: DecisionItem[];
  what_if_analysis: WhatIfAnalysis;
  specifications: Record<string, ParameterSpec>;
}

export interface DashboardOverview {
  dataset_id: string;
  total_components: number;
  total_lots: number;
  risk_distribution: {
    PASS: number;
    WATCH: number;
    REVIEW: number;
    HIGH_RISK: number;
  };
  state_distribution: Record<string, number>;
  burn_in_pipeline: {
    stage_0h: number;
    stage_24h: number;
    stage_96h: number;
    stage_168h: number;
  };
  top_priorities: ComponentItem[];
  lots_summary: LotItem[];
  recent_alerts: any[];
}

export interface PipelineStage {
  id: number;
  name: string;
  status: string;
  details: string;
}

export interface DataQualitySummary {
  rows_received: number;
  valid_rows: number;
  missing_values: number;
  invalid_records: number;
  duplicate_records: number;
  components_processed: number;
  lots_processed: number;
  quality_status: 'EXCELLENT' | 'ACCEPTABLE' | 'REQUIRES_ATTENTION';
  warnings: string[];
}

export interface AuditLogItem {
  id?: number;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_name: string;
  details: any;
}

export interface ReportsSummary {
  dataset: {
    id: string;
    name: string;
    mode: string;
    created_at: string;
  };
  total_components: number;
  risk_counts: Record<string, number>;
  state_counts: Record<string, number>;
  lots: LotItem[];
  priorities: any[];
  decisions_count: number;
  model_version: string;
  pipeline_version: string;
  generated_at: string;
}
