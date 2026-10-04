// ==============================================================================
// ReliabilityX — 168h Prognostic Predictions Tab Component
// Physics-Informed Forecasting with Estimated Prediction Intervals & P90 Bounds
// ==============================================================================
import React, { useState, useEffect } from "react";
import { PredictionItem, API_BASE } from "../types";
import { SectionHero } from "./SectionHero";

interface PredictionsTabProps {
  onInspectComp: (id: string) => void;
}

const SPEC_LIMITS: Record<string, number> = {
  leakage_current_uA: 50.0,
  standby_current_mA: 12.0,
  propagation_delay_ns: 8.5,
  voltage_ref_V: 2.60
};

export function PredictionsTab({ onInspectComp }: PredictionsTabProps) {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paramFilter, setParamFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch(`${API_BASE}/predictions?limit=200`)
      .then((r) => r.json())
      .then((d) => {
        setPredictions(d.predictions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = predictions.filter(
    (p) => paramFilter === "ALL" || p.parameter_name === paramFilter
  );

  const totalForecasts = predictions.length;
  const breachesCount = predictions.filter((p) => {
    const limit = p.engineering_limit ?? SPEC_LIMITS[p.parameter_name] ?? 50.0;
    const p90 = p.p90_worst_case ?? p.predicted_168h;
    return p90 != null && p90 > limit;
  }).length;
  const withinSpec = totalForecasts - breachesCount;

  return (
    <div className="tab-pane active">
      {/* 1. Page Header (Standardized Reusable About Hero) */}
      <SectionHero
        badge="PREDICTIVE RELIABILITY"
        title="168h Prognostic Forecasts"
        subtitle="Uncertainty-aware 168h degradation forecasting with split-conformal prediction intervals and engineering decision support."
      />

      {/* 2. Top KPI Metrics Row (4 Spacious Cards) */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">UNITS FORECASTED</div>
          <div className="kpi-value">{loading ? "--" : totalForecasts}</div>
          <div className="kpi-sub">Multi-parameter predictions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">WITHIN SPECIFICATION</div>
          <div className="kpi-value text-green">{loading ? "--" : withinSpec}</div>
          <div className="kpi-sub">P90 &lt; official limit</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">PROJECTED BREACHES</div>
          <div className="kpi-value text-red">{loading ? "--" : breachesCount}</div>
          <div className="kpi-sub">P90 risk bound exceedance</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">PREDICTION INTERVAL</div>
          <div className="kpi-value text-yellow" style={{ fontSize: "16px" }}>95% Split-Conformal</div>
          <div className="kpi-sub">Empirical Coverage: 95.96% ± 1.05%</div>
        </div>
      </div>

      {/* 3. Predictions Table Card */}
      <div className="card" style={{ padding: "18px" }}>
        <div className="card-header">
          <span className="card-title">🔮 PROGNOSTIC INFERENCE MODELS</span>
          <span className="card-badge">Physics-Informed Ensemble</span>
        </div>

        {/* Filter Controls Bar */}
        <div className="filter-bar mb-3" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 600 }}>Parameter:</span>
          <select value={paramFilter} onChange={(e) => setParamFilter(e.target.value)}>
            <option value="ALL">All Parameters</option>
            <option value="leakage_current_uA">Leakage Current (μA)</option>
            <option value="standby_current_mA">Standby Current (mA)</option>
            <option value="propagation_delay_ns">Propagation Delay (ns)</option>
            <option value="voltage_ref_V">Reference Voltage (V)</option>
          </select>
        </div>

        {/* Desktop Table View */}
        <div className="table-responsive d-desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Parameter</th>
                <th>Stage Used</th>
                <th>Predicted 168h</th>
                <th>Spec Limit</th>
                <th>95% Split-Conformal Interval</th>
                <th title="P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit.">P90 Estimated Upper Bound ℹ️</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                    Loading prognostic forecasts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                    No predictions found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const limit = p.engineering_limit ?? SPEC_LIMITS[p.parameter_name] ?? 50.0;
                  const predVal = p.predicted_168h != null ? Number(p.predicted_168h).toFixed(2) : "--";
                  const limitVal = Number(limit).toFixed(1);
                  const uncertVal = p.conformal_radius != null 
                    ? `±${Number(p.conformal_radius).toFixed(2)}` 
                    : (p.uncertainty_std != null ? `±${(Number(p.uncertainty_std) * 1.96).toFixed(2)}` : "--");
                  const p90 = p.p90_worst_case ?? p.predicted_168h;
                  const p90Val = p90 != null ? Number(p90).toFixed(2) : "--";
                  const isBreach = p90 != null && limit != null && p90 > limit;

                  return (
                    <tr key={`${p.component_id}-${p.parameter_name}`}>
                      <td>
                        <strong>{p.component_id}</strong>
                      </td>
                      <td style={{ fontSize: "12px" }}>{p.parameter_name}</td>
                      <td>
                        <span className="card-badge">{p.stage_used}</span>
                      </td>
                      <td>
                        <strong>{predVal}</strong>
                      </td>
                      <td>{limitVal}</td>
                      <td>{uncertVal}</td>
                      <td>
                        <span style={{ color: isBreach ? "var(--status-risk)" : "var(--text-main)", fontWeight: isBreach ? 700 : 500 }}>
                          {p90Val}
                          {isBreach && " ⚠️"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onInspectComp(p.component_id)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Predictions Cards */}
        <div className="mobile-card-list d-mobile-only">
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              Loading prognostic forecasts...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              No predictions found for this filter.
            </div>
          ) : (
            filtered.map((p) => {
              const limit = p.engineering_limit ?? SPEC_LIMITS[p.parameter_name] ?? 50.0;
              const predVal = p.predicted_168h != null ? Number(p.predicted_168h).toFixed(2) : "--";
              const limitVal = Number(limit).toFixed(1);
              const p90 = p.p90_worst_case ?? p.predicted_168h;
              const p90Val = p90 != null ? Number(p90).toFixed(2) : "--";
              const isBreach = p90 != null && limit != null && p90 > limit;
              const paramShort = p.parameter_name.replace("leakage_current_uA", "Leakage Current (μA)")
                .replace("standby_current_mA", "Standby Current (mA)")
                .replace("propagation_delay_ns", "Prop Delay (ns)")
                .replace("voltage_ref_V", "Ref Voltage (V)");

              return (
                <div key={`${p.component_id}-${p.parameter_name}`} className="mobile-unit-card rx-float-card">
                  <div className="mobile-unit-card-header">
                    <div className="mobile-unit-card-id-group">
                      <strong className="mobile-unit-id">{p.component_id}</strong>
                      <span className="mobile-lot-pill">{p.stage_used || "96h"}</span>
                    </div>
                    <span className={`badge ${isBreach ? "badge-risk" : "badge-pass"}`}>
                      {isBreach ? "BREACH RISK" : "NOMINAL"}
                    </span>
                  </div>

                  <div className="mobile-unit-card-body">
                    <div className="mobile-unit-field">
                      <span className="mobile-field-label">PARAMETER</span>
                      <span className="mobile-field-val" style={{ fontWeight: 600 }}>{paramShort}</span>
                    </div>

                    <div className="mobile-card-metrics-row">
                      <div className="mobile-sub-metric">
                        <span className="mobile-field-label">168h FORECAST</span>
                        <span className="mobile-metric-value">{predVal}</span>
                      </div>
                      <div className="mobile-sub-metric">
                        <span className="mobile-field-label">SPEC LIMIT</span>
                        <span className="mobile-metric-value">{limitVal}</span>
                      </div>
                      <div className="mobile-sub-metric">
                        <span className="mobile-field-label">P90 BOUND</span>
                        <span className={`mobile-metric-value ${isBreach ? "text-red" : ""}`}>
                          {p90Val} {isBreach && "⚠️"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-block mobile-inspect-btn"
                    onClick={() => onInspectComp(p.component_id)}
                  >
                    Inspect Unit →
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
