import {
  DashboardOverview,
  ComponentItem,
  ComponentDetailData,
  LotItem,
  PredictionItem,
  ReportsSummary,
  DataQualitySummary,
  AuditLogItem,
  WhatIfAnalysis,
  EngineerDecision
} from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  return res.json();
}

export async function fetchPipelineStatus() {
  const res = await fetch(`${API_BASE}/pipeline/status`);
  return res.json();
}

export async function fetchDataQualitySummary(): Promise<DataQualitySummary> {
  const res = await fetch(`${API_BASE}/data/quality-summary`);
  return res.json();
}

export async function fetchComponents(params?: {
  lot_id?: string;
  risk_level?: string;
  current_state?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ components: ComponentItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.lot_id) query.append('lot_id', params.lot_id);
  if (params?.risk_level) query.append('risk_level', params.risk_level);
  if (params?.current_state) query.append('current_state', params.current_state);
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.offset) query.append('offset', params.offset.toString());

  const res = await fetch(`${API_BASE}/components?${query.toString()}`);
  return res.json();
}

export async function fetchComponentDetail(componentId: string): Promise<ComponentDetailData> {
  const res = await fetch(`${API_BASE}/components/${componentId}`);
  if (!res.ok) throw new Error(`Component ${componentId} not found`);
  return res.json();
}

export async function submitQADecision(
  componentId: string,
  decision: EngineerDecision,
  engineerName: string,
  comments: string = ''
) {
  const formData = new FormData();
  formData.append('engineer_decision', decision);
  formData.append('engineer_name', engineerName);
  formData.append('comments', comments);

  const res = await fetch(`${API_BASE}/components/${componentId}/decision`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to record decision');
  return res.json();
}

export async function fetchLots(): Promise<{ lots: LotItem[] }> {
  const res = await fetch(`${API_BASE}/lots`);
  return res.json();
}

export async function fetchLotDetail(lotId: string) {
  const res = await fetch(`${API_BASE}/lots/${lotId}`);
  return res.json();
}

export async function fetchPredictions(parameter?: string, limit: number = 100): Promise<{ predictions: PredictionItem[] }> {
  const query = new URLSearchParams();
  if (parameter) query.append('parameter', parameter);
  query.append('limit', limit.toString());

  const res = await fetch(`${API_BASE}/predictions?${query.toString()}`);
  return res.json();
}

export async function fetchInspectionPriorities(): Promise<{ priorities: ComponentItem[] }> {
  const res = await fetch(`${API_BASE}/inspection-priority`);
  return res.json();
}

export async function fetchModelPerformance() {
  const res = await fetch(`${API_BASE}/models/performance`);
  return res.json();
}

export async function fetchAuditLogs(limit: number = 50): Promise<{ audit_logs: AuditLogItem[] }> {
  const res = await fetch(`${API_BASE}/traceability/audit-log?limit=${limit}`);
  return res.json();
}

export async function fetchReportsSummary(): Promise<ReportsSummary> {
  const res = await fetch(`${API_BASE}/reports/summary`);
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updateConfig(payload: any) {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function simulateWhatIf(payload: {
  current_value: number;
  current_hour: number;
  current_drift_rate: number;
  parameter_name: string;
  target_limit?: number;
}): Promise<WhatIfAnalysis> {
  const res = await fetch(`${API_BASE}/counterfactual/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function loadDemoDataset() {
  const res = await fetch(`${API_BASE}/data/load-demo`, { method: 'POST' });
  return res.json();
}

export async function uploadUserDataset(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}
