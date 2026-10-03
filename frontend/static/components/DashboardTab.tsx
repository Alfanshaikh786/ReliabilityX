// ==============================================================================
// ReliabilityX — Hero Dashboard Tab Component
// Overview & Screening Intelligence with Trajectory and Real-Time What-If
// ==============================================================================
import React from "react";
import { StateBadge, RiskBadge } from "./Badges";
import { TrajectorySvgChart } from "./TrajectorySvgChart";

interface DashboardTabProps {
  overview: any;
  loading: boolean;
  heroCompId: string;
  heroCompData: any;
  heroCompLoading: boolean;
  heroParam: string;
  heroSimulatedDrift: number;
  heroSimResult: any;
  onSelectHeroComp: (id: string) => void;
  onSelectHeroParam: (param: string) => void;
  onChangeSimDrift: (drift: number) => void;
  onOpenInspectModal: (id: string) => void;
  onNavigateTab: (tab: any) => void;
}

export function DashboardTab({
  overview,
  loading,
  heroCompId,
  heroCompData,
  heroCompLoading,
  heroParam,
  heroSimulatedDrift,
  heroSimResult,
  onSelectHeroComp,
  onSelectHeroParam,
  onChangeSimDrift,
  onOpenInspectModal,
  onNavigateTab
}: DashboardTabProps) {
  const riskDist = overview?.risk_distribution || {};
  const lotsList = overview?.lots_summary || overview?.lot_summary || [];
  const prioritiesList = overview?.top_priorities || overview?.inspection_priority || [];
  const comp = heroCompData?.component;
  const pred = heroCompData?.prediction;
  const explain = comp?.explanation || heroCompData?.evidence;

  const sampleComps = [
    { id: "C-01008", lot: "LOT-2411A", label: "C-01008 (Accelerating / High Risk)" },
    { id: "C-00421", lot: "LOT-2411B", label: "C-00421 (Drifting / Review)" },
    { id: "C-01001", lot: "LOT-2411A", label: "C-01001 (Stable / Normal PASS)" },
    { id: "C-01015", lot: "LOT-2411C", label: "C-01015 (Unstable / High Risk)" }
  ];

  const paramsList = [
    { id: "leakage_current_uA", label: "Leakage Current (μA)", limit: 50.0 },
    { id: "standby_current_mA", label: "Standby Current (mA)", limit: 12.0 },
    { id: "propagation_delay_ns", label: "Propagation Delay (ns)", limit: 8.5 },
    { id: "voltage_ref_V", label: "Reference Voltage (V)", limit: 2.60 }
  ];

  const currentParamObj = paramsList.find(p => p.id === heroParam) || paramsList[0];

  return (
    <div className="tab-pane active">
      {/* 1. Page Header */}
      <div id="section-overview-header" className="hero-header mb-4">
        <h1 className="page-main-title">RELIABILITY OVERVIEW & SCREENING INTELLIGENCE</h1>
        <p className="page-main-subtitle">
          Early detection of non-linear component degradation during Burn-In and Environmental Stress Screening (ESS).
          Anticipates latent wearout and limits prior to physical test failures.
        </p>
      </div>

      {/* 2. KPI Row (Exactly 4 Equal-Width Cards with Generous Spacing) */}
      <div id="section-kpi-summary" className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">COMPONENTS MONITORED</div>
          <div className="kpi-value">{loading ? "--" : (overview?.total_components || 125)}</div>
          <div className="kpi-sub">Across {lotsList.length || 5} active flight lots</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">NORMAL (PASS)</div>
          <div className="kpi-value text-green">{loading ? "--" : (riskDist.PASS || 0)}</div>
          <div className="kpi-sub">Nominal burn-in trajectory</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">WATCH (DRIFT)</div>
          <div className="kpi-value text-yellow">{loading ? "--" : (riskDist.WATCH || 0)}</div>
          <div className="kpi-sub">Moderate drift within ±2σ bounds</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">ATTENTION REQUIRED</div>
          <div className="kpi-value text-red">
            {loading ? "--" : ((riskDist["HIGH RISK"] ?? riskDist.HIGH_RISK ?? 0) + (riskDist.REVIEW || 0))}
          </div>
          <div className="kpi-sub">
            {(riskDist["HIGH RISK"] ?? riskDist.HIGH_RISK ?? 0)} High Risk • {riskDist.REVIEW || 0} Review
          </div>
        </div>
      </div>

      {/* 3 & 4. Main 2-Column Grid (Left: 68% Trajectory Chart, Right: 32% Component Insight) */}
      <div id="section-trajectory-simulation" className="dashboard-hero-grid mb-4">
        {/* Left / Center: Trajectory Chart & What-If Simulator */}
        <div className="card" style={{ padding: "18px" }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span className="card-title">COMPONENT RELIABILITY TRAJECTORY</span>
              <div className="btn-group">
                {paramsList.map(p => (
                  <button
                    key={p.id}
                    className={`btn btn-sm ${heroParam === p.id ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => onSelectHeroParam(p.id)}
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    {p.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="chart-legend-clean">
              <span className="legend-badge">
                <span className="legend-swatch" style={{ background: "#38BDF8", height: "4px" }}></span> Actual Telemetry (0–96h)
              </span>
              <span className="legend-badge">
                <span className="legend-swatch" style={{ background: "#38BDF8", borderTop: "2px dashed #38BDF8" }}></span> 168h Forecast
              </span>
              <span className="legend-badge">
                <span className="legend-swatch" style={{ background: "#F87171", borderTop: "2px dashed #F87171" }}></span> Limit ({currentParamObj.limit})
              </span>
              <span className="legend-badge">
                <span className="legend-swatch" style={{ background: "#FB923C", borderTop: "2px dotted #FB923C" }}></span> P90 Estimated Upper Bound
              </span>
              <span className="legend-badge">
                <span className="legend-swatch" style={{ background: "rgba(56, 189, 248, 0.35)", width: "12px", height: "8px", borderRadius: "2px" }}></span> Estimated Prediction Interval
              </span>
            </div>
          </div>

          {/* Central Trajectory SVG */}
          {heroCompLoading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
              Loading degradation telemetry models...
            </div>
          ) : (
            <div>
              <TrajectorySvgChart
                data={heroCompData}
                paramName={heroParam}
                simulatedDriftRate={heroSimulatedDrift}
              />

              {/* 4 Metric Cards Under Chart */}
              <div className="chart-metrics-grid">
                <div className="chart-metric-card">
                  <div className="chart-metric-title">168h Forecast</div>
                  <div className="chart-metric-val">
                    {pred?.predicted_168h ? pred.predicted_168h.toFixed(2) : "47.20"} {currentParamObj.label.match(/\((.*?)\)/)?.[1] || "μA"}
                  </div>
                  <div className="chart-metric-sub">Physics-informed model</div>
                </div>

                <div className="chart-metric-card">
                  <div className="chart-metric-title">Spec Limit</div>
                  <div className="chart-metric-val">{currentParamObj.limit.toFixed(1)} {currentParamObj.label.match(/\((.*?)\)/)?.[1] || "μA"}</div>
                  <div className="chart-metric-sub">Engineering Datasheet</div>
                </div>

                <div className="chart-metric-card">
                  <div className="chart-metric-title">Uncertainty (±1.96σ)</div>
                  <div className="chart-metric-val">±{pred?.uncertainty_std ? (pred.uncertainty_std * 1.96).toFixed(2) : "1.85"}</div>
                  <div className="chart-metric-sub">Estimated Prediction Interval</div>
                </div>

                <div className="chart-metric-card" title="P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit.">
                  <div className="chart-metric-title">P90 Estimated Upper Bound ℹ️</div>
                  <div className={`chart-metric-val ${(pred?.p90_upper_bound || pred?.p90_worst_case || 49.05) > currentParamObj.limit ? "text-red" : ""}`}>
                    {(pred?.p90_upper_bound || pred?.p90_worst_case) ? (pred?.p90_upper_bound || pred?.p90_worst_case).toFixed(2) : "49.05"}
                  </div>
                  <div className="chart-metric-sub">P90 Risk Bound</div>
                </div>
              </div>

              {/* Real-Time What-If Sensitivity Simulator */}
              <div className="whatif-panel-clean mt-3">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>🎛️</span>
                    <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>Interactive What-If Drift Sensitivity Simulator</strong>
                  </div>
                  <span className="badge badge-state-accel">Real-Time In-Browser Counterfactual</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <input
                    type="range"
                    min="0.01"
                    max="0.40"
                    step="0.01"
                    value={heroSimulatedDrift}
                    onChange={(e) => onChangeSimDrift(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: "#38BDF8", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "12.5px", fontWeight: 700, minWidth: "90px", textAlign: "right" }}>
                    +{(heroSimulatedDrift * 100).toFixed(1)}% / 24h
                  </span>
                </div>

                {heroSimResult && (
                  <div style={{ marginTop: "8px", fontSize: "11.5px", color: "var(--text-sub)", display: "flex", gap: "16px" }}>
                    <span>Simulated 168h: <strong>{heroSimResult.counterfactual_predicted_168h?.toFixed(2)} μA</strong></span>
                    <span>Delta: <strong style={{ color: heroSimResult.delta_vs_baseline > 0 ? "#DC2626" : "#16A34A" }}>+{heroSimResult.delta_vs_baseline?.toFixed(2)}</strong></span>
                    <span>Spec Breach: <strong style={{ color: heroSimResult.counterfactual_exceeds_limit ? "#DC2626" : "#16A34A" }}>{heroSimResult.counterfactual_exceeds_limit ? "YES (HIGH RISK)" : "NO (SAFE)"}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Hero Component Insight Panel */}
        <div className="card" style={{ padding: "18px" }}>
          <div className="card-header">
            <span className="card-title">COMPONENT INSIGHT</span>
            <select
              value={heroCompId}
              onChange={(e) => onSelectHeroComp(e.target.value)}
              className="component-quick-select"
              style={{ padding: "3px 8px", fontSize: "11.5px" }}
            >
              {sampleComps.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.id}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main)" }}>{heroCompId}</span>
            <span className="card-badge">LOT: {comp?.lot_id || "LOT-2411A"}</span>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <StateBadge state={comp?.current_state || "ACCELERATING"} />
            <RiskBadge risk={comp?.risk_level || "HIGH RISK"} />
          </div>

          {/* Current Behaviour State */}
          <div style={{ marginBottom: "16px" }}>
            <div className="chart-metric-title mb-1">CURRENT BEHAVIOUR STATE:</div>
            <div className="fingerprint-flow">
              <span className={`fp-node ${comp?.current_state === "NORMAL" ? "active" : ""}`}>NORMAL</span>
              <span className={`fp-node ${comp?.current_state === "DRIFTING" ? "active" : ""}`}>DRIFTING</span>
              <span className={`fp-node ${comp?.current_state === "ACCELERATING" ? "active" : ""}`}>ACCELERATING</span>
              <span className={`fp-node ${comp?.current_state === "UNSTABLE" ? "active" : ""}`}>UNSTABLE</span>
            </div>
            <div className="text-muted" style={{ fontSize: "10.5px", marginTop: "4px" }}>
              Observed behaviour state (non-sequential classification)
            </div>
          </div>

          {/* Evidence Attribution (Why Flagged?) */}
          <div style={{ marginBottom: "16px" }}>
            <div className="chart-metric-title mb-1">WHY FLAGGED? (EVIDENCE ATTRIBUTION)</div>
            {explain?.factor_attributions ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {explain.factor_attributions.map((f: any, idx: number) => (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                      <span>{f.factor_name}</span>
                      <strong>{(f.contribution_ratio * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ height: "5px", background: "#1E293B", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${f.contribution_ratio * 100}%`, background: idx === 0 ? "#FB923C" : "#38BDF8" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "11.5px", color: "var(--text-sub)", lineHeight: 1.4 }}>
                Second derivative of leakage current indicates thermal-electrical wearout acceleration.
              </div>
            )}
          </div>

          {/* Narrative Verdict */}
          <div className="narrative-box-clean mb-3">
            <strong>Verdict: </strong>
            {explain?.narrative_explanation || "Non-linear wearout detected. Projected to breach specification limit prior to 168h end-of-screen."}
          </div>

          {/* Inspect Button */}
          <button
            className="btn btn-primary btn-block"
            onClick={() => onOpenInspectModal(heroCompId)}
          >
            View Component
          </button>
        </div>
      </div>

      {/* 5. Risk / Lot Summary Section */}
      <div id="section-lot-health-summary" className="card mb-4">
        <div className="card-header">
          <span className="card-title">FLIGHT LOT HEALTH & ANOMALY SUMMARY</span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab("lots")}>
            View All Lots ({lotsList.length})
          </button>
        </div>
        <div className="lot-summary-grid">
          {lotsList.slice(0, 4).map((lot: any) => (
            <div key={lot.lot_id} className="lot-summary-card">
              <div className="lot-card-header">
                <strong>{lot.lot_id}</strong>
                <span className={`badge ${lot.anomaly_percentage > 25 ? "badge-risk" : lot.anomaly_percentage > 10 ? "badge-watch" : "badge-pass"}`}>
                  {lot.anomaly_percentage}% Anomaly
                </span>
              </div>
              <div className="lot-card-sub">{lot.component_count} units monitored • {lot.accelerating_count} accelerating</div>
              <div className="lot-card-pattern">{lot.pattern_description || "Nominal degradation curve"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Recent Alerts / Inspection Priority Queue */}
      <div id="section-critical-priority-queue" className="card mb-4">
        <div className="card-header">
          <span className="card-title">CRITICAL FLIGHT UNITS REQUIRING ATTENTION</span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab("inspection")}>
            View All ({prioritiesList.length})
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Component ID</th>
                <th>Lot ID</th>
                <th>State</th>
                <th>Risk Tier</th>
                <th>Primary Degradation Factor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>Loading priority telemetry...</td>
                </tr>
              ) : prioritiesList.slice(0, 5).map((item: any, idx: number) => (
                <tr key={item.component_id}>
                  <td><strong style={{ color: "var(--accent-blue)" }}>#{idx + 1}</strong></td>
                  <td><strong>{item.component_id}</strong></td>
                  <td>{item.lot_id}</td>
                  <td><StateBadge state={item.current_state} /></td>
                  <td><RiskBadge risk={item.risk_level} /></td>
                  <td style={{ fontSize: "12px", color: "var(--text-sub)" }}>{item.priority_reason || "Critical wearout"}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenInspectModal(item.component_id)}
                    >
                      Inspect Unit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
