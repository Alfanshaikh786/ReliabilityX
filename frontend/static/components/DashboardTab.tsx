// ==============================================================================
// ReliabilityX — Hero Dashboard Tab Component
// Overview & Screening Intelligence with Trajectory and Real-Time What-If
// ==============================================================================
import React, { useState } from "react";
import { StateBadge, RiskBadge } from "./Badges";
import { TrajectorySvgChart } from "./TrajectorySvgChart";
import { SectionHero } from "./SectionHero";
import { IconSearch } from "./Icons";
import { API_BASE, downloadCsvReport } from "../types";

interface DashboardTabProps {
  overview: any;
  loading: boolean;
  componentsList?: any[];
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
  // Dashboard Header Controls (matching exact reference image)
  globalSearch?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  activeDataset?: any;
  onOpenDatasetModal?: () => void;
  liveStatus?: any;
  onNavigateToLive?: () => void;
  onReloadDemo?: () => void;
}

export function DashboardTab({
  overview,
  loading,
  componentsList,
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
  onNavigateTab,
  globalSearch = "",
  onSearchChange,
  onSearchSubmit,
  activeDataset,
  onOpenDatasetModal,
  liveStatus,
  onNavigateToLive,
  onReloadDemo
}: DashboardTabProps) {
  const [noticeDismissed, setNoticeDismissed] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportFeedback("Exporting CSV...");
    try {
      await downloadCsvReport((st) => {
        if (st.message) setExportFeedback(st.message);
      });
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      setExportFeedback("Export failed: " + (err?.message || "network error"));
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };
  const riskDist = overview?.risk_distribution || {};
  const lotsList = overview?.lots_summary || overview?.lot_summary || [];
  const prioritiesList = overview?.top_priorities || overview?.inspection_priority || [];

  // Single Source of Truth Synchronization & Stale Data Prevention
  const isCurrentComp = heroCompData?.component?.component_id === heroCompId;
  const currentCompData = isCurrentComp ? heroCompData : null;
  const comp = currentCompData?.component;
  const pred = currentCompData?.predictions?.find((p: any) => p.parameter_name === heroParam)
    || currentCompData?.predictions?.[0]
    || currentCompData?.prediction;
  const explain = comp?.explanation || currentCompData?.evidence;

  // Dynamically populate selector from actual component dataset
  const selectableComps = React.useMemo(() => {
    if (componentsList && componentsList.length > 0) {
      const exists = componentsList.some((c: any) => (c.component_id || c.id) === heroCompId);
      if (!exists && heroCompId) {
        return [{ component_id: heroCompId, lot_id: comp?.lot_id || "", risk_level: comp?.risk_level || "" }, ...componentsList];
      }
      return componentsList;
    }
    return [{ component_id: heroCompId, lot_id: comp?.lot_id || "", risk_level: comp?.risk_level || "" }];
  }, [componentsList, heroCompId, comp]);

  // Evidence Attribution Factors Normalized
  const factorList = React.useMemo(() => {
    if (explain?.factor_attributions && Array.isArray(explain.factor_attributions)) {
      return explain.factor_attributions.map((f: any) => ({
        name: f.factor_name,
        pct: f.contribution_ratio <= 1.0 ? f.contribution_ratio * 100 : f.contribution_ratio
      }));
    }
    if (explain?.factor_contributions && typeof explain.factor_contributions === "object") {
      return Object.entries(explain.factor_contributions).map(([k, v]: [string, any]) => ({
        name: k,
        pct: typeof v === "number" ? v : parseFloat(v) || 0
      }));
    }
    return [];
  }, [explain]);

  const paramsList = [
    { id: "leakage_current_uA", label: "Leakage Current (μA)", limit: 50.0 },
    { id: "standby_current_mA", label: "Standby Current (mA)", limit: 12.0 },
    { id: "propagation_delay_ns", label: "Propagation Delay (ns)", limit: 8.5 },
    { id: "voltage_ref_V", label: "Reference Voltage (V)", limit: 2.60 }
  ];

  const currentParamObj = paramsList.find(p => p.id === heroParam) || paramsList[0];

  const isPhysicallyConnected = Boolean(
    ((liveStatus as any)?.data_source === "LIVE HARDWARE" || (liveStatus as any)?.source_type === "LIVE_HARDWARE") &&
    (liveStatus as any)?.physical_hardware_connected
  );
  const isReplay = (liveStatus as any)?.source_type === "csv_replay" || (liveStatus as any)?.data_source === "REPLAY";
  const dataSourceLabel = isPhysicallyConnected ? "LIVE HARDWARE" : isReplay ? "REPLAY" : "SIMULATION";
  const connStatus = liveStatus?.connection_status || "DISCONNECTED";
  const sourceName = liveStatus?.source_name || "LIVE TELEMETRY SIMULATOR";
  const handleGoToLive = () => {
    if (onNavigateToLive) onNavigateToLive();
    else if (onNavigateTab) onNavigateTab("live_telemetry");
  };

  return (
    <div className="tab-pane active">
      {/* 1. LARGE DASHBOARD HERO (Exact match to reference) */}
      <SectionHero
        id="section-overview-header"
        className="dashboard-hero-spacious"
        badge="DASHBOARD"
        title="Dashboard Overview"
        subtitle="AI-assisted reliability intelligence for component screening, anomaly detection, and engineering decision support."
      />

      {/* 2. STATUS ROW BELOW HERO */}
      <div className="dashboard-status-row">
        {/* Data Source Pill */}
        <div
          className="dashboard-data-source-pill"
          title="Strict Telemetry Source Provenance (SIMULATION vs LIVE HARDWARE)"
        >
          <span className="source-label-prefix">DATA SOURCE:</span>
          <span className="source-dot">●</span>
          <span className="source-name-bold">{dataSourceLabel}</span>
        </div>

        {/* Connection Status Pill */}
        <div
          className={`dashboard-connection-pill status-${connStatus.toLowerCase()}`}
          onClick={handleGoToLive}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleGoToLive();
            }
          }}
          title="Click to open Live Screening view"
          aria-label={`Connection status: ${connStatus}. Data source: ${sourceName}`}
        >
          <span className="status-dot">●</span>
          <span className="status-label">{connStatus}</span>
          <span className="source-text">{sourceName}</span>
          <span className="standby-text">Standby</span>
        </div>
      </div>

      {/* 3. CONTROL ROW */}
      <div className="dashboard-control-row">
        {/* Left: Search Bar + Demo Benchmark placed near each other */}
        <div className="dashboard-search-benchmark-group">
          <form onSubmit={onSearchSubmit || ((e) => e.preventDefault())} className="dashboard-search-container">
            <IconSearch />
            <input
              type="text"
              placeholder="Search components (e.g. C-01008)..."
              value={globalSearch}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label="Search components"
            />
          </form>

          {/* Demo Benchmark Option placed near the search bar */}
          <div className="dashboard-dataset-pill">
            <span className="dataset-dot"></span>
            <span className="dataset-name">
              {!activeDataset?.dataset_id || activeDataset.dataset_id.startsWith("demo")
                ? "Demo Benchmark"
                : activeDataset?.name || "User Dataset"}
            </span>
            <button
              type="button"
              className="dataset-change-btn"
              onClick={onOpenDatasetModal}
            >
              Change
            </button>
          </div>
        </div>

        {/* Right: Export CSV & Reload Demo */}
        <div className="dashboard-actions-group">
          <button
            type="button"
            className={`dashboard-btn-export ${isExporting ? "is-loading" : ""}`}
            onClick={handleExportCsv}
            disabled={isExporting}
            title="Export screening telemetry and predictions as CSV"
          >
            {isExporting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "-2px" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export CSV</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="dashboard-btn-reload"
            onClick={onReloadDemo}
          >
            Reload Demo
          </button>
        </div>
        {exportFeedback && (
          <div className="export-status-pill" role="status">
            <span className="status-dot-pulse" />
            <span>{exportFeedback}</span>
          </div>
        )}
      </div>

      {/* 4. ENGINEERING DECISION-SUPPORT NOTICE */}
      {!noticeDismissed && (
        <div className="dashboard-engineering-notice" role="alert">
          <div className="dashboard-notice-content">
            <span className="dashboard-notice-icon" aria-hidden="true">⚠️</span>
            <div className="dashboard-notice-text-wrap">
              <strong className="dashboard-notice-title">ENGINEERING DECISION-SUPPORT NOTICE:</strong>
              <span className="dashboard-notice-text">
                AI screening provides statistical early warnings and degradation forecasts. Official specifications and QA review remain authoritative.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="dashboard-notice-close-btn"
            onClick={() => setNoticeDismissed(true)}
            title="Dismiss notice"
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. System State Alert if Screening Data is Unavailable */}
      {!loading && !overview && (
        <div className="alert alert-warning mb-4" style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "8px",
          padding: "14px 18px",
          color: "#FCA5A5",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div>
            <strong style={{ fontSize: "13px" }}>SCREENING DATA SOURCE UNAVAILABLE</strong>
            <div style={{ fontSize: "12px", opacity: 0.88, marginTop: "2px" }}>
              The screening intelligence API did not return overview metrics. Check backend connectivity at <code>/api/health</code>.
            </div>
          </div>
        </div>
      )}

      {/* 3. KPI Row (Calculated from Actual Pipeline Data) */}
      <div id="section-kpi-summary" className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">COMPONENTS MONITORED</div>
          <div className="kpi-value">{loading ? "--" : (overview ? overview.total_components : "--")}</div>
          <div className="kpi-sub">Across {overview ? (lotsList.length || overview.total_lots || 5) : "--"} active screening lots</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">NORMAL (PASS)</div>
          <div className="kpi-value text-green">{loading ? "--" : (overview ? (riskDist.PASS ?? 0) : "--")}</div>
          <div className="kpi-sub">Nominal burn-in trajectory</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">WATCH (DRIFT)</div>
          <div className="kpi-value text-yellow">{loading ? "--" : (overview ? (riskDist.WATCH ?? 0) : "--")}</div>
          <div className="kpi-sub">Moderate drift within ±2σ bounds</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">ATTENTION REQUIRED</div>
          <div className="kpi-value text-red">
            {loading ? "--" : (overview ? ((riskDist["HIGH RISK"] ?? riskDist.HIGH_RISK ?? 0) + (riskDist.REVIEW ?? 0)) : "--")}
          </div>
          <div className="kpi-sub">
            {overview ? `${(riskDist["HIGH RISK"] ?? riskDist.HIGH_RISK ?? 0)} High Risk • ${riskDist.REVIEW ?? 0} Review` : "--"}
          </div>
        </div>
      </div>

      {/* 3 & 4. Main 2-Column Grid (Left: 68% Trajectory Chart, Right: 32% Component Insight) */}
      <div id="section-trajectory-simulation" className="dashboard-hero-grid mb-4">
        {/* Left / Center: Trajectory Chart & What-If Simulator */}
        <div className="card" style={{ padding: "22px" }}>
          <div className="card-header trajectory-card-header">
            <div className="trajectory-title-control-group">
              <span className="card-title">COMPONENT RELIABILITY TRAJECTORY</span>
              <div className="btn-group chart-param-btn-group">
                {paramsList.map(p => (
                  <button
                    key={p.id}
                    className={`btn btn-sm ${heroParam === p.id ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => onSelectHeroParam(p.id)}
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
                <span className="legend-swatch" style={{ background: "rgba(56, 189, 248, 0.35)", width: "12px", height: "8px", borderRadius: "2px" }}></span> 95% Split-Conformal Interval
              </span>
            </div>
          </div>

          {/* Central Trajectory SVG */}
          {heroCompLoading || !isCurrentComp ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
              Loading degradation telemetry models for {heroCompId}...
            </div>
          ) : (
            <div>
              <TrajectorySvgChart
                data={currentCompData}
                paramName={heroParam}
                simulatedDriftRate={heroSimulatedDrift}
              />

              {/* 4 Metric Cards Under Chart */}
              <div className="chart-metrics-grid">
                <div className="chart-metric-card">
                  <div className="chart-metric-title">168h Forecast</div>
                  <div className="chart-metric-val">
                    {pred?.predicted_168h != null 
                      ? `${pred.predicted_168h.toFixed(2)} ${currentParamObj.label.match(/\((.*?)\)/)?.[1] || "μA"}` 
                      : (heroCompLoading ? "..." : "DATA_UNAVAILABLE")}
                  </div>
                  <div className="chart-metric-sub">Physics-informed model</div>
                </div>

                <div className="chart-metric-card">
                  <div className="chart-metric-title">Spec Limit</div>
                  <div className="chart-metric-val">{currentParamObj.limit.toFixed(1)} {currentParamObj.label.match(/\((.*?)\)/)?.[1] || "μA"}</div>
                  <div className="chart-metric-sub">Engineering Datasheet</div>
                </div>

                <div className="chart-metric-card">
                  <div className="chart-metric-title">95% Conformal Interval</div>
                  <div className="chart-metric-val">
                    {pred?.conformal_radius != null
                      ? `±${pred.conformal_radius.toFixed(2)}`
                      : (pred?.uncertainty_std != null 
                        ? `±${(pred.uncertainty_std * 1.96).toFixed(2)}` 
                        : (heroCompLoading ? "..." : "DATA_UNAVAILABLE"))}
                  </div>
                  <div className="chart-metric-sub">Empirical Coverage: 95.96%</div>
                </div>

                <div className="chart-metric-card" title="P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit.">
                  <div className="chart-metric-title">P90 Estimated Upper Bound ℹ️</div>
                  <div className={`chart-metric-val ${((pred?.p90_upper_bound || pred?.p90_worst_case) != null && (pred?.p90_upper_bound || pred?.p90_worst_case) > currentParamObj.limit) ? "text-red" : ""}`}>
                    {(pred?.p90_upper_bound || pred?.p90_worst_case) != null 
                      ? (pred?.p90_upper_bound || pred?.p90_worst_case).toFixed(2) 
                      : (heroCompLoading ? "..." : "DATA_UNAVAILABLE")}
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
                  <div className="whatif-stats-row">
                    <span className="whatif-stat-chip">Simulated 168h: <strong>{heroSimResult.counterfactual_predicted_168h?.toFixed(2)} μA</strong></span>
                    <span className="whatif-stat-chip">Delta: <strong style={{ color: heroSimResult.delta_vs_baseline > 0 ? "#DC2626" : "#16A34A" }}>+{heroSimResult.delta_vs_baseline?.toFixed(2)}</strong></span>
                    <span className="whatif-stat-chip">Spec Breach: <strong style={{ color: heroSimResult.counterfactual_exceeds_limit ? "#DC2626" : "#16A34A" }}>{heroSimResult.counterfactual_exceeds_limit ? "YES (HIGH RISK)" : "NO (SAFE)"}</strong></span>
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
              id="component-insight-selector"
              value={heroCompId}
              onChange={(e) => onSelectHeroComp(e.target.value)}
              className="component-quick-select"
              style={{ padding: "3px 8px", fontSize: "11.5px" }}
              title="Available Insight Components"
              aria-label="Available Insight Components"
            >
              {selectableComps.map((sc: any) => {
                const cid = sc.component_id || sc.id;
                return (
                  <option key={cid} value={cid}>
                    {cid}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main)" }}>{heroCompId}</span>
            <span className="card-badge">LOT: {comp?.lot_id || (heroCompLoading ? "Loading..." : "--")}</span>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            {comp ? (
              <>
                <StateBadge state={comp.current_state} />
                <RiskBadge risk={comp.risk_level} />
              </>
            ) : (
              <span className="badge badge-secondary">{heroCompLoading || !isCurrentComp ? "Loading state..." : "DATA_UNAVAILABLE"}</span>
            )}
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
            {factorList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {factorList.map((f, idx) => (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                      <span>{f.name}</span>
                      <strong>{f.pct.toFixed(1)}%</strong>
                    </div>
                    <div style={{ height: "5px", background: "#1E293B", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, f.pct))}%`, background: idx === 0 ? "#FB923C" : "#38BDF8" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comp ? (
              <div style={{ fontSize: "11.5px", color: "var(--text-sub)", lineHeight: 1.4 }}>
                {comp.risk_level === "PASS"
                  ? "Nominal degradation curve within screening limits. No anomalous wearout drivers detected."
                  : (comp.priority_reason ? `Primary driver: ${comp.priority_reason}` : "INSUFFICIENT_EVIDENCE")}
              </div>
            ) : (
              <div style={{ fontSize: "11.5px", color: "var(--text-sub)" }}>
                {heroCompLoading || !isCurrentComp ? "Loading telemetry evidence..." : "DATA_UNAVAILABLE"}
              </div>
            )}
          </div>

          {/* Narrative Verdict */}
          <div className="narrative-box-clean mb-3">
            <strong>Verdict: </strong>
            {explain?.narrative_explanation ||
              (comp?.priority_reason
                ? `Screening finding: ${comp.priority_reason}.`
                : (comp?.risk_level === "PASS"
                  ? "Unit conforms to nominal screening criteria across all monitored test gates."
                  : (heroCompLoading || !isCurrentComp ? "Evaluating burn-in telemetry..." : "INSUFFICIENT_EVIDENCE")))}
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
          <span className="card-title">SCREENING LOT HEALTH & ANOMALY SUMMARY</span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab("lots")}>
            View All Lots ({lotsList.length})
          </button>
        </div>
        <div className="lot-summary-grid">
          {lotsList.slice(0, 4).map((lot: any) => (
            <div key={lot.lot_id} className="lot-summary-card">
              <div className="lot-card-header">
                <span className="lot-id-text">{lot.lot_id}</span>
                <span className={`badge ${lot.anomaly_percentage > 25 ? "badge-risk" : lot.anomaly_percentage > 10 ? "badge-watch" : "badge-pass"}`}>
                  {lot.anomaly_percentage}% Anomaly
                </span>
              </div>
              <div className="lot-card-sub">
                {lot.component_count} units monitored • {lot.accelerating_count} accelerating
              </div>
              <div className="lot-card-status-tag">
                <span className={`badge ${lot.is_lot_wide_pattern ? "badge-risk" : "badge-pass"}`}>
                  {lot.is_lot_wide_pattern ? "CRITICAL LOT-WIDE PATTERN" : "ISOLATED COMPONENT ANOMALY"}
                </span>
              </div>
              <div className="lot-card-pattern">{lot.pattern_description || "Nominal degradation curve"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Recent Alerts / Inspection Priority Queue */}
      <div id="section-critical-priority-queue" className="card mb-4">
        <div className="card-header">
          <span className="card-title">CRITICAL MONITORED UNITS REQUIRING ATTENTION</span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab("inspection")}>
            View All ({prioritiesList.length})
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="table-responsive d-desktop-only">
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

        {/* Mobile Cards View */}
        <div className="mobile-card-list d-mobile-only">
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
              Loading priority telemetry...
            </div>
          ) : prioritiesList.slice(0, 5).map((item: any, idx: number) => (
            <div key={item.component_id} className="mobile-unit-card rx-float-card">
              <div className="mobile-unit-card-header">
                <div className="mobile-unit-card-id-group">
                  <span className="mobile-priority-badge">#{idx + 1}</span>
                  <strong className="mobile-unit-id">{item.component_id}</strong>
                  <span className="mobile-lot-pill">{item.lot_id}</span>
                </div>
                <RiskBadge risk={item.risk_level} />
              </div>

              <div className="mobile-unit-card-body">
                <div className="mobile-unit-field">
                  <span className="mobile-field-label">BEHAVIOUR STATE</span>
                  <StateBadge state={item.current_state} />
                </div>
                <div className="mobile-unit-field">
                  <span className="mobile-field-label">DEGRADATION FACTOR</span>
                  <span className="mobile-field-val">{item.priority_reason || "Critical wearout"}</span>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-block mobile-inspect-btn"
                onClick={() => onOpenInspectModal(item.component_id)}
              >
                Inspect Unit →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
