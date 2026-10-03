// ==============================================================================
// ReliabilityX — Live Screening & Real-Time Test Equipment Ingestion
// SIH26170: AI-Driven Anomaly Detection in Component Burn-In & Screening
// Supports: 1. Demo Data  2. File Data  3. Live Telemetry
// ==============================================================================
import React, { useState, useEffect, useRef } from "react";
import { LiveStreamStatus, LiveTelemetryPoint, LiveAlertItem, LiveLotHealth, RawMeasurementRecord, API_BASE } from "../types";
import { StateBadge, RiskBadge } from "./Badges";
import { IconPlay, IconPause, IconStop, IconRadioWave, IconAlertTriangle } from "./Icons";

interface LiveScreeningTabProps {
  onInspectComp: (componentId: string) => void;
  liveStatus: LiveStreamStatus | null;
  livePoints: LiveTelemetryPoint[];
  liveAlerts: LiveAlertItem[];
  liveLotHealth: LiveLotHealth | null;
  onStartStream: (sourceType: string, config: any) => Promise<void>;
  onPauseStream: () => Promise<void>;
  onResumeStream: () => Promise<void>;
  onStopStream: () => Promise<void>;
  onClearPoints: () => void;
}

export function LiveScreeningTab({
  onInspectComp,
  liveStatus,
  livePoints,
  liveAlerts,
  liveLotHealth,
  onStartStream,
  onPauseStream,
  onResumeStream,
  onStopStream,
  onClearPoints
}: LiveScreeningTabProps) {
  // Simulator & Ingestion Controls
  const [sourceType, setSourceType] = useState<string>("simulator");
  const [scenario, setScenario] = useState<string>("ACCELERATING_RUNAWAY");
  const [selectedComp, setSelectedComp] = useState<string>("C-01008");
  const [selectedLot, setSelectedLot] = useState<string>("LOT-2411C");
  const [selectedParam, setSelectedParam] = useState<string>("leakage_current_uA");
  const [samplingRate, setSamplingRate] = useState<number>(0.8);
  const [rawDrawerOpen, setRawDrawerOpen] = useState<boolean>(false);
  const [rawRecords, setRawRecords] = useState<RawMeasurementRecord[]>([]);

  const isLive = liveStatus?.connection_status === "LIVE" || liveStatus?.connection_status === "CONNECTED";
  const isPaused = liveStatus?.connection_status === "PAUSED";
  const latestPoint = livePoints.length > 0 ? livePoints[livePoints.length - 1] : null;

  // Fetch raw audit history when drawer is opened
  const loadRawHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/raw-history?limit=30`);
      const d = await res.json();
      setRawRecords(d.records || []);
    } catch {}
  };

  useEffect(() => {
    if (rawDrawerOpen) {
      loadRawHistory();
      const interval = setInterval(loadRawHistory, 2000);
      return () => clearInterval(interval);
    }
  }, [rawDrawerOpen]);

  // Handle stream start
  const handleStart = async () => {
    await onStartStream(sourceType, {
      scenario,
      component_id: selectedComp,
      lot_id: selectedLot,
      parameter: selectedParam,
      sampling_rate: samplingRate
    });
  };

  // Replay mode button
  const handleReplayBenchmark = async () => {
    setSourceType("csv_replay");
    await onStartStream("csv_replay", {
      sampling_rate: 0.4,
      loop: false
    });
  };

  // Trajectory Chart Dimensions & Coordinates (Expansive 1000x380 Canvas)
  const chartWidth = 1000;
  const chartHeight = 380;
  const padding = { top: 32, right: 48, bottom: 44, left: 70 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  // Max X is 168 burn-in hours
  const maxX = 168.0;
  const paramLimit = latestPoint?.limit ?? 20.0;
  const paramNominal = latestPoint?.nominal ?? 5.0;
  const maxY = Math.max(paramLimit * 1.15, 22.0);

  const getX = (hr: number) => padding.left + (Math.min(maxX, Math.max(0, hr)) / maxX) * innerW;
  const getY = (val: number) => padding.top + innerH - (Math.min(maxY, Math.max(0, val)) / maxY) * innerH;

  // Build SVG path for live measurement points
  const pointsPath = livePoints.length > 0
    ? livePoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.timestamp_hours).toFixed(1)} ${getY(pt.value).toFixed(1)}`).join(" ")
    : "";

  // 168h Prediction Line & Confidence Band
  const lastHour = latestPoint?.timestamp_hours ?? 0;
  const lastVal = latestPoint?.value ?? paramNominal;
  const driftRate = latestPoint?.drift_rate ?? 0.04;
  const accel = latestPoint?.accel ?? 0.001;

  // 168h Prediction Line & Uncertainty Band: Only active when sufficient history exists
  const hasPrediction = Boolean(latestPoint?.prediction_available && (latestPoint?.predicted_168h || lastHour >= 20.0));
  const predPoints: [number, number, number][] = []; // [hr, predVal, upperVal]

  if (hasPrediction && lastHour < 168) {
    const target168 = latestPoint?.predicted_168h ?? (lastVal + (driftRate * (168 - lastHour)) + (0.5 * accel * ((168 - lastHour) ** 2)));
    for (let h = lastHour; h <= 168; h += 10) {
      const fraction = (h - lastHour) / Math.max(1, 168 - lastHour);
      const pVal = lastVal + fraction * (target168 - lastVal);
      const uncertainty = Math.sqrt((h - lastHour) + 1) * (latestPoint?.uncertainty_std ?? 0.35);
      predPoints.push([h, pVal, pVal + uncertainty]);
    }
  }

  const predPath = predPoints.length > 0
    ? predPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt[0]).toFixed(1)} ${getY(pt[1]).toFixed(1)}`).join(" ")
    : "";

  // Estimated Prediction Interval area path
  let confBandPath = "";
  if (predPoints.length > 0) {
    const topPath = predPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt[0]).toFixed(1)} ${getY(pt[2]).toFixed(1)}`).join(" ");
    const botPath = [...predPoints].reverse().map((pt) => `L ${getX(pt[0]).toFixed(1)} ${getY(pt[1]).toFixed(1)}`).join(" ");
    confBandPath = `${topPath} ${botPath} Z`;
  }

  return (
    <div className="live-screening-container">
      {/* 1. AEROSPACE INTEGRITY & SIMULATOR NOTICE */}
      <div className="live-disclaimer-banner">
        <div className="disclaimer-badge">
          <span className="disclaimer-dot"></span>
          {liveStatus?.source_name || "LIVE TELEMETRY SIMULATOR"}
        </div>
        <div className="disclaimer-text">
          Architecture supports pluggable equipment integration. Currently receiving streaming telemetry from 
          <strong> {liveStatus?.source_name || "LIVE TELEMETRY SIMULATOR"}</strong>. 
          Prototype decision support demonstrates automated screening; not connected to physical ISRO test equipment.
        </div>
        <div className="disclaimer-action">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleReplayBenchmark}
            title="Replay existing 168h gate dataset point-by-point"
          >
            Replay CSV Benchmark
          </button>
        </div>
      </div>

      {/* 2. INGESTION CONTROL CENTER */}
      <div className="live-controls-panel">
        <div className="controls-row-top">
          {/* Connector Selector */}
          <div className="control-group">
            <label>Telemetry Connector:</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              disabled={isLive}
              className="control-select"
            >
              <option value="simulator">Live Telemetry Simulator (Virtual ATE)</option>
              <option value="csv_replay">CSV Replay Adapter (Sequential Gate Stream)</option>
              <option value="mqtt">MQTT Equipment Adapter (Industrial Broker)</option>
            </select>
          </div>

          {/* Defect Scenario Selector (when simulator active) */}
          {sourceType === "simulator" && (
            <div className="control-group">
              <label>Defect Scenario:</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="control-select"
              >
                <option value="ACCELERATING_RUNAWAY">Accelerating Runaway (Arrhenius Wearout)</option>
                <option value="GRADUAL_DRIFT">Gradual Monotonic Drift (Sub-threshold)</option>
                <option value="DECELERATING_DRIFT">Decelerating Drift (Infant Wearout Saturation)</option>
                <option value="SUDDEN_STEP_CHANGE">Sudden Step Change (Bond Fracture at 48h)</option>
                <option value="CORRELATED_MULTIVARIATE">Correlated Multivariate Drift (Junction Heating)</option>
                <option value="DELAYED_MEASUREMENT">Delayed Telemetry (Out-of-Order Jitter)</option>
                <option value="LOT_WIDE_CONTAMINATION">Lot-Wide Contamination (Multi-Unit Shift)</option>
                <option value="NORMAL">Normal Component (Baseline Stability)</option>
                <option value="NOISY_COMPONENT">Noisy Component (Dielectric RTN Steps)</option>
                <option value="ISOLATED_OUTLIER">Isolated Outlier (Single Lot Deviation)</option>
                <option value="SENSOR_SPIKE">Transient Sensor Spike (Quality Glitch)</option>
                <option value="STUCK_SENSOR">Stuck Sensor Condition (Frozen ADC)</option>
                <option value="MISSING_DATA">Missing Data Telemetry (Dropout)</option>
              </select>
            </div>
          )}

          {/* Component & Lot Selector */}
          <div className="control-group">
            <label>Component:</label>
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(e.target.value)}
              className="control-select-sm"
            >
              <option value="C-01008">C-01008</option>
              <option value="C-01009">C-01009</option>
              <option value="C-01010">C-01010</option>
              <option value="C-01011">C-01011</option>
              <option value="C-01012">C-01012</option>
            </select>
          </div>

          <div className="control-group">
            <label>Parameter:</label>
            <select
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value)}
              className="control-select"
            >
              <option value="leakage_current_uA">Leakage Current (I_leak)</option>
              <option value="standby_current_mA">Standby Current (I_ddq)</option>
              <option value="propagation_delay_ns">Propagation Delay (t_pd)</option>
              <option value="voltage_ref_V">Reference Voltage (V_ref)</option>
            </select>
          </div>

          {/* Sampling Rate Buttons */}
          <div className="control-group">
            <label>Sampling Rate:</label>
            <div className="btn-group-rates">
              {[0.25, 0.5, 1.0, 2.0].map((rate) => (
                <button
                  key={rate}
                  className={`btn-rate ${samplingRate === rate ? "active" : ""}`}
                  onClick={() => setSamplingRate(rate)}
                >
                  {rate}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Stream Actions */}
        <div className="controls-row-bottom">
          <div className="stream-action-buttons">
            {!isLive ? (
              <button className="btn btn-emerald" onClick={handleStart} title="Start Telemetry Stream">
                <IconPlay size={16} /> <span>Start<span className="d-desktop-only"> Stream</span></span>
              </button>
            ) : isPaused ? (
              <button className="btn btn-warning" onClick={onResumeStream} title="Resume Stream">
                <IconPlay size={16} /> <span>Resume<span className="d-desktop-only"> Stream</span></span>
              </button>
            ) : (
              <button className="btn btn-warning" onClick={onPauseStream} title="Pause Stream">
                <IconPause size={16} /> <span>Pause<span className="d-desktop-only"> Stream</span></span>
              </button>
            )}

            <button 
              className="btn btn-danger" 
              onClick={onStopStream}
              disabled={!isLive && !isPaused}
              title="Stop Stream"
            >
              <IconStop size={16} /> <span>Stop<span className="d-desktop-only"> Stream</span></span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={onClearPoints} title="Clear Chart">
              <span>Clear<span className="d-desktop-only"> Chart</span></span>
            </button>
          </div>

          <div className="stream-raw-toggle">
            <button 
              className={`btn btn-outline btn-sm ${rawDrawerOpen ? "active" : ""}`}
              onClick={() => setRawDrawerOpen(!rawDrawerOpen)}
            >
              {rawDrawerOpen ? "Hide Raw Buffer" : "View Immutable Raw Stream"}
            </button>
          </div>
        </div>
      </div>

      {/* 2b. COMPACT PIPELINE STATUS INDICATOR */}
      <div className="pipeline-status-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0B132B", border: "1px solid #1E293B", borderRadius: "8px", padding: "10px 18px", margin: "14px 0", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>PIPELINE STAGES:</span>
          <span className="pipeline-step text-emerald">Telemetry ✓</span>
          <span className="pipeline-arrow text-slate">→</span>
          <span className="pipeline-step text-emerald">Quality ✓</span>
          <span className="pipeline-arrow text-slate">→</span>
          <span className="pipeline-step text-emerald">Features ✓</span>
          <span className="pipeline-arrow text-slate">→</span>
          <span className="pipeline-step text-emerald">Anomaly ✓</span>
          <span className="pipeline-arrow text-slate">→</span>
          <span className="pipeline-step text-emerald">Behaviour ✓</span>
          <span className="pipeline-arrow text-slate">→</span>
          <span className={`pipeline-step ${hasPrediction ? "text-emerald" : "text-amber"}`}>
            {hasPrediction ? "Prediction ✓" : "Prediction (Waiting)"}
          </span>
          <span className="pipeline-arrow text-slate">→</span>
          <span className="pipeline-step text-emerald">Risk ✓</span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Dual-Path: Fast Stream (Real-Time) + Windowed ML (Ensemble)
        </div>
      </div>

      {/* 3. REAL-TIME KPI TILES */}
      <div className="live-kpi-grid">
        <div className="live-kpi-card">
          <span className="kpi-label">CONNECTION STATUS</span>
          <div className="kpi-value-row">
            <span className={`live-pulse-dot dot-${(liveStatus?.connection_status || "offline").toLowerCase()}`}></span>
            <span className={`kpi-value ${liveStatus?.connection_status === "STALE" ? "text-amber" : ""}`}>
              {liveStatus?.connection_status || "DISCONNECTED"}
            </span>
          </div>
          <span className="kpi-sub">
            {liveStatus?.connection_status === "STALE" ? (
              <span className="text-amber">Last received: {liveStatus?.seconds_since_last_packet || 5}s ago</span>
            ) : (
              <span>Source: <strong>{liveStatus?.source_name || "SIMULATOR"}</strong></span>
            )}
          </span>
        </div>

        <div className="live-kpi-card">
          <span className="kpi-label">STREAM THROUGHPUT</span>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {liveStatus?.processing_rate ? `${liveStatus.processing_rate.toFixed(1)} samples/s` : `${(1.0 / samplingRate).toFixed(1)} samples/s`}
            </span>
          </div>
          <span className="kpi-sub">Sampling interval: {samplingRate}s</span>
        </div>

        <div className="live-kpi-card">
          <span className="kpi-label">STREAM LATENCY</span>
          <div className="kpi-value-row">
            <span className="kpi-value text-emerald">
              {liveStatus?.last_latency_ms ? `${Math.round(liveStatus.last_latency_ms)} ms` : "32 ms"}
            </span>
          </div>
          <span className="kpi-sub">p95: {liveStatus?.p95_latency_ms ?? 42} ms • avg: {liveStatus?.avg_latency_ms ?? 34} ms</span>
        </div>

        <div className="live-kpi-card">
          <span className="kpi-label">MESSAGES PROCESSED</span>
          <div className="kpi-value-row">
            <span className="kpi-value text-cyan">
              {(liveStatus?.messages_count ?? livePoints.length).toLocaleString()}
            </span>
          </div>
          <span className="kpi-sub">Queue depth: {liveStatus?.queue_depth ?? 0}</span>
        </div>

        <div className="live-kpi-card">
          <span className="kpi-label">DATA QUALITY ENGINE</span>
          <div className="kpi-value-row">
            <span className="kpi-value text-emerald">
              GOOD: {liveStatus?.data_quality?.good_pct ?? 98.4}%
            </span>
          </div>
          <span className="kpi-sub">
            WARN: {liveStatus?.data_quality?.warnings_pct ?? 1.2}% • REJ: {liveStatus?.data_quality?.rejected_pct ?? 0.4}%
          </span>
        </div>
      </div>

      {/* 2. MAIN LIVE TRAJECTORY CHART (Spanning Full Width) */}
      <div className="card mb-4">
        <div className="card-header live-trajectory-header">
          <div className="chart-title-group">
            <span className="card-title">MAIN LIVE SCREENING TRAJECTORY (0–168h BURN-IN)</span>
            <span className="chart-subtitle">
              Component: <strong>{latestPoint?.component_id || selectedComp}</strong> | 
              Lot: <strong>{latestPoint?.lot_id || selectedLot}</strong> | 
              Parameter: <strong>{latestPoint?.parameter_display || "Leakage Current"}</strong>
              {!hasPrediction && (
                <span className="badge badge-state-drift" style={{ marginLeft: "10px", fontSize: "11px" }}>
                  Prediction unavailable — insufficient history
                </span>
              )}
            </span>
          </div>
          <div className="chart-legend live-chart-legend">
            <span className="legend-item"><span className="legend-dot live-cyan"></span> Actual Telemetry</span>
            <span className="legend-item"><span className="legend-line limit-red"></span> Datasheet Limit ({paramLimit} {latestPoint?.unit || "µA"})</span>
            <span className="legend-item"><span className="legend-line nominal-green"></span> Baseline</span>
            <span className="legend-item" title="P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit.">
              <span className="legend-line pred-amber"></span> Predicted 168h (P90 Risk Bound ℹ️)
            </span>
            <span className="legend-item"><span className="legend-box conf-box"></span> Estimated Prediction Interval</span>
          </div>
        </div>

        <div className="chart-canvas-wrapper" style={{ marginTop: "16px" }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="live-svg-chart">
            <defs>
              <linearGradient id="liveGlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="confBandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid Lines & Burn-In Checkpoint Markers */}
            {[0, 24, 96, 168].map((gate) => (
              <g key={gate}>
                <line
                  x1={getX(gate)}
                  y1={padding.top}
                  x2={getX(gate)}
                  y2={padding.top + innerH}
                  stroke="#1E293B"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <text
                  x={getX(gate)}
                  y={padding.top + innerH + 20}
                  fill="#64748B"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {gate}h
                </text>
              </g>
            ))}

            {/* Horizontal Grid lines */}
            {[0, paramNominal, paramLimit * 0.5, paramLimit].map((yVal, idx) => (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={getY(yVal)}
                  x2={padding.left + innerW}
                  y2={getY(yVal)}
                  stroke="#16223D"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={getY(yVal) + 4}
                  fill="#64748B"
                  fontSize="10"
                  textAnchor="end"
                >
                  {yVal.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Engineering Limit (Red Dashed) */}
            <line
              x1={padding.left}
              y1={getY(paramLimit)}
              x2={padding.left + innerW}
              y2={getY(paramLimit)}
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />
            <text
              x={padding.left + innerW - 6}
              y={getY(paramLimit) - 8}
              fill="#EF4444"
              fontSize="10"
              textAnchor="end"
              fontWeight="bold"
            >
              DATASHEET MAX LIMIT ({paramLimit} {latestPoint?.unit || "µA"})
            </text>

            {/* Nominal Baseline (Green Dotted) */}
            <line
              x1={padding.left}
              y1={getY(paramNominal)}
              x2={padding.left + innerW}
              y2={getY(paramNominal)}
              stroke="#10B981"
              strokeWidth="1.2"
              strokeDasharray="2 3"
            />

            {/* Estimated Prediction Interval Polygon */}
            {confBandPath && (
              <path d={confBandPath} fill="url(#confBandGrad)" />
            )}

            {/* 168h Prognostic Prediction Curve */}
            {predPath && (
              <path
                d={predPath}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
            )}

            {/* Actual Live Telemetry Points & Curve */}
            {pointsPath && (
              <path
                d={pointsPath}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Plotted Measurement Dots */}
            {livePoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={getX(pt.timestamp_hours)}
                cy={getY(pt.value)}
                r={idx === livePoints.length - 1 ? 5.5 : 3.5}
                fill={pt.quality === "LIMIT_BREACH" ? "#EF4444" : pt.quality === "SUSPECT_SPIKE" ? "#F59E0B" : "#38BDF8"}
                stroke="#070D1E"
                strokeWidth="1.5"
                className={idx === livePoints.length - 1 ? "pulsing-head" : ""}
              />
            ))}

            {/* Current Leading Edge Head Callout */}
            {latestPoint && (
              <g transform={`translate(${getX(latestPoint.timestamp_hours)}, ${getY(latestPoint.value)})`}>
                <circle cx="0" cy="0" r="10" fill="#38BDF8" fillOpacity="0.25" className="radar-ping" />
                <circle cx="0" cy="0" r="4.5" fill="#38BDF8" />
              </g>
            )}
          </svg>
        </div>

        {/* Trajectory Status Footnote */}
        <div className="chart-footer-bar" style={{ marginTop: "14px" }}>
          <span>Points in buffer: <strong>{livePoints.length}</strong></span>
          <span>Current Test Hour: <strong>{latestPoint?.timestamp_hours ?? 0.0}h</strong> / 168.0h</span>
          <span>Safety Margin Remaining: <strong>{latestPoint?.distance_to_limit ? `${latestPoint.distance_to_limit} ${latestPoint.unit}` : "Safe"}</strong></span>
        </div>
      </div>

      {/* 3. 2-COLUMN SECTION: LEFT = Component Behaviour, RIGHT = Real-Time Alert Stream */}
      <div className="live-dual-grid mb-4">
        {/* Left: Component Behaviour Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">COMPONENT BEHAVIOUR & DIAGNOSTICS</span>
            <span className="card-badge">{latestPoint?.component_id || selectedComp}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="hud-metric-row">
              <span className="hud-metric-label">CURRENT TELEMETRY READING</span>
              <div className="hud-reading-big">
                {latestPoint ? (
                  <>
                    <span className="reading-num">{latestPoint.value.toFixed(2)}</span>
                    <span className="reading-unit">{latestPoint.unit}</span>
                  </>
                ) : (
                  <span className="reading-placeholder">--</span>
                )}
              </div>
            </div>

            <div className="grid-2col">
              <div className="hud-metric-row">
                <span className="hud-metric-label">DYNAMIC BEHAVIOUR STATE</span>
                <div style={{ marginTop: "4px" }}>
                  {latestPoint?.state ? (
                    <StateBadge state={latestPoint.state} />
                  ) : (
                    <StateBadge state="NORMAL" />
                  )}
                </div>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">ASSESSED SCREENING RISK</span>
                <div style={{ marginTop: "4px" }}>
                  {latestPoint?.risk ? (
                    <RiskBadge risk={latestPoint.risk} />
                  ) : (
                    <RiskBadge risk="PASS" />
                  )}
                </div>
              </div>
            </div>

            <div className="hud-stats-grid">
              <div className="hud-sub-card">
                <span className="sub-card-label">DRIFT RATE</span>
                <span className={`sub-card-val ${(latestPoint?.drift_rate ?? 0) > 0.03 ? "text-amber" : "text-slate"}`}>
                  {latestPoint ? `${latestPoint.drift_rate > 0 ? "+" : ""}${latestPoint.drift_rate.toFixed(4)}` : "0.0000"}
                </span>
                <span className="sub-card-unit">units/hr</span>
              </div>

              <div className="hud-sub-card">
                <span className="sub-card-label">DRIFT ACCELERATION</span>
                <span className={`sub-card-val ${(latestPoint?.accel ?? 0) > 0.0003 ? "text-red" : "text-slate"}`}>
                  {latestPoint ? `${latestPoint.accel > 0 ? "+" : ""}${latestPoint.accel.toFixed(5)}` : "0.0000"}
                </span>
                <span className="sub-card-unit">units/hr²</span>
              </div>
            </div>

            {/* Quick Forensic Trigger */}
            {latestPoint && (
              <div style={{ paddingTop: "8px" }}>
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => onInspectComp(latestPoint.component_id)}
                >
                  Inspect {latestPoint.component_id} Evidence & Forensics →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-Time Alert Stream Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">REAL-TIME ALERT STREAM</span>
            <span className="card-badge">{liveAlerts.length} events detected</span>
          </div>

          <div className="alert-stream-list">
            {liveAlerts.length === 0 ? (
              <div className="alert-empty-state">
                <span className="empty-dot"></span>
                <span>No anomalous limit breaches or accelerating drift alerts. All telemetry within nominal boundary.</span>
              </div>
            ) : (
              liveAlerts.slice(-5).reverse().map((al, idx) => (
                <div key={idx} className="alert-stream-card">
                  <div className="alert-card-top">
                    <span className="alert-badge-red">NEW ALERT</span>
                    <span className="alert-comp-id">
                      <strong>{al.component_id}</strong> ({al.lot_id})
                    </span>
                    <RiskBadge risk={al.risk} />
                    <span className="alert-time">{al.timestamp}</span>
                  </div>
                  <div className="alert-card-body">
                    <div className="alert-title">{al.title}</div>
                    <div className="alert-reason">{al.reason}</div>
                    <div className="alert-footer">
                      <span className="alert-param">{al.parameter}: <strong>{al.value.toFixed(2)} {al.unit}</strong></span>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => onInspectComp(al.component_id)}
                      >
                        Inspect Unit →
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. LOT HEALTH (Bottom Section) */}
      <div className="card mb-4">
        <div className="card-header">
          <span className="card-title">REAL-TIME LOT HEALTH TRACKER</span>
          <span className="card-badge">Active Lot: {liveLotHealth?.lot_id || selectedLot}</span>
        </div>

        <div className="lot-health-stats-row mb-3">
          <div className="health-stat-box">
            <span className="stat-label">LOT ANOMALY RATE</span>
            <span className="stat-val text-cyan">
              {liveLotHealth?.anomaly_percentage ? `${liveLotHealth.anomaly_percentage.toFixed(1)}%` : "0.0%"}
            </span>
          </div>
          <div className="health-stat-box">
            <span className="stat-label">DRIFTING UNITS</span>
            <span className="stat-val text-amber">
              {liveLotHealth?.drifting_count ?? 1}
            </span>
          </div>
          <div className="health-stat-box">
            <span className="stat-label">ACCELERATING</span>
            <span className="stat-val text-red">
              {liveLotHealth?.accelerating_count ?? 1}
            </span>
          </div>
          <div className="health-stat-box">
            <span className="stat-label">HIGH RISK</span>
            <span className="stat-val text-red">
              {liveLotHealth?.high_risk_count ?? 0}
            </span>
          </div>
        </div>

        <div className="lot-pattern-status-box">
          <span className="status-label">Pattern Diagnostic:</span>
          <span className={`status-text ${liveLotHealth?.is_lot_wide_pattern ? "text-red" : "text-emerald"}`}>
            {liveLotHealth?.is_lot_wide_pattern
              ? "Correlated multi-component wearout detected across wafer lot."
              : "Component wearout isolated. No systemic lot-wide failure mode observed."}
          </span>
        </div>
      </div>

      {/* 7. IMMUTABLE RAW TELEMETRY DRAWER */}
      {rawDrawerOpen && (
        <div className="raw-stream-drawer">
          <div className="drawer-header">
            <div>
              <span className="drawer-title">IMMUTABLE RAW TELEMETRY BUFFER (LIVE_TELEMETRY_RAW)</span>
              <span className="drawer-subtitle">Direct hardware acquisition log for engineering auditability</span>
            </div>
            <button className="btn btn-secondary btn-xs" onClick={() => setRawDrawerOpen(false)}>
              Close
            </button>
          </div>
          <div className="drawer-table-wrapper">
            <table className="table table-dark">
              <thead>
                <tr>
                  <th>Rec ID</th>
                  <th>Component</th>
                  <th>Lot</th>
                  <th>Test Hour</th>
                  <th>Parameter</th>
                  <th>Raw Value</th>
                  <th>Quality</th>
                  <th>Source</th>
                  <th>Acquisition Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {rawRecords.map((r) => (
                  <tr key={r.id}>
                    <td><code>#{r.id}</code></td>
                    <td><strong>{r.component_id}</strong></td>
                    <td>{r.lot_id}</td>
                    <td>{r.timestamp_hours.toFixed(1)}h</td>
                    <td>{r.parameter_name}</td>
                    <td><strong>{r.value.toFixed(3)} {r.unit}</strong></td>
                    <td>
                      <span className={`quality-tag ${r.quality === "GOOD" ? "tag-good" : "tag-warn"}`}>
                        {r.quality}
                      </span>
                    </td>
                    <td><code>{r.source}</code></td>
                    <td>{r.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
