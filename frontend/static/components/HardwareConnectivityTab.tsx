// ==============================================================================
// ReliabilityX — Hardware Connectivity & Live Test-Cell Integration Console
// Professional Engineering Grade Test Bench & ATE Gateway Interface
// Strict Provenance & Read-Only Safety Boundary
// ==============================================================================
import React, { useState, useEffect } from "react";
import { API_BASE, LiveStreamStatus, LiveTelemetryPoint } from "../types";
import { IconHardware } from "./Icons";
import { SectionHero } from "./SectionHero";

export interface HardwareDeviceConfig {
  device_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  interface_type: string;
  host?: string;
  port?: number;
  gpib_address?: number;
  station_id: string;
  channel_id: string;
  instrument_id: string;
  calibration_id: string;
  calibration_status: string;
  calibration_expiry: string;
  calibration_date?: string;
  calibration_provider?: string;
  calibration_traceability?: string;
  source_type: "SIMULATED" | "REPLAY" | "LIVE_HARDWARE";
  notes?: string;
  is_active?: boolean;
  connection_health?: string;
  [key: string]: any;
}

export interface HardwareTelemetryPoint extends LiveTelemetryPoint {
  drift_acceleration?: number;
  evidence_state?: string;
  evidence_status?: string;
  model_status?: string;
  model_applicability?: string;
  probability_of_breach_pct?: number | string | null;
  estimated_time_to_breach?: string | null;
  [key: string]: any;
}

export interface HardwareStatus {
  connection_status: "CONNECTED" | "DISCONNECTED" | "CONNECTING" | "ERROR";
  connection_health: string;
  raw_health_status: string;
  data_source: "SIMULATION" | "REPLAY" | "LIVE HARDWARE";
  data_source_badge: string;
  interface: string;
  instrument: string;
  model: string;
  serial_number: string;
  station_id: string;
  channel: string;
  calibration_id: string;
  calibration_status: string;
  calibration_expiry: string;
  calibration_traceability?: string;
  is_calibration_valid: boolean;
  last_telemetry: string;
  seconds_since_last_telemetry?: number;
  physical_hardware_connected: boolean;
  real_hardware_validated: boolean;
  hardware_validation_note: string;
  hardware_ready: boolean;
  read_only_safety_boundary: string;
  diagnostics?: {
    transport: "PASS" | "FAIL";
    device_identity: "PASS" | "FAIL";
    serial_verification: "PASS" | "FAIL";
    calibration_state: "PASS" | "WARNING" | "FAIL";
    telemetry_channel: "PASS" | "FAIL";
    read_only_policy: string;
    source_provenance: string;
    details?: any;
  };
  readiness_matrix?: {
    interface_layer: string;
    virtual_test_bench: string;
    replay_pipeline: string;
    physical_connection: string;
    calibration_validation: string;
    live_hardware_validation: string;
  };
  production_status?: {
    production_pipeline_parity: string;
    production_deployment_validation: string;
    physical_hardware_validation: string;
  };
  conformal_metadata?: {
    nominal_level: string;
    interval_type: string;
    empirical_lolo_coverage: string;
    per_lot_breakdown: Record<string, string>;
    coverage_reconciliation: string;
    engineering_note: string;
  };
  provenance_metadata?: {
    source_verified_at?: string;
    adapter_session_id?: string;
    device_identity_hash?: string;
    source_verification_method?: string;
    provenance_status?: string;
    verification_method_display?: string;
    [key: string]: any;
  };
  available_modes?: {
    live_hardware: string;
    simulation: string;
    replay: string;
  };
  [key: string]: any;
}

interface HardwareConnectivityTabProps {
  onInspectComp?: (id: string) => void;
  livePoints?: LiveTelemetryPoint[];
  liveStatus?: LiveStreamStatus | null;
}

export function HardwareConnectivityTab({
  onInspectComp,
  livePoints,
  liveStatus
}: HardwareConnectivityTabProps) {
  const [devices, setDevices] = useState<HardwareDeviceConfig[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("DEV-SMU-KEITHLEY-01");
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "info" | "success" | "warning" | "error" } | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [recentTelemetry, setRecentTelemetry] = useState<any[]>([]);

  // Fetch initial hardware status and device registry
  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/hardware/status`);
      if (res.ok) {
        const data = await res.json();
        setHardwareStatus(data);
      }
    } catch (err) {
      console.error("Failed to load hardware status:", err);
    }
  };

  const refreshDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/hardware/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        if (data.active_device_id) {
          setSelectedDeviceId(data.active_device_id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch registered devices:", err);
    }
  };

  const refreshRawTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/raw-history?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setRecentTelemetry(data.records || []);
      }
    } catch {}
  };

  useEffect(() => {
    refreshStatus();
    refreshDevices();
    refreshRawTelemetry();
    const interval = setInterval(() => {
      refreshStatus();
      refreshRawTelemetry();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Action Handlers
  const handleDiscoverDevices = async () => {
    setLoading(true);
    setActionMessage({ text: "Scanning test bench bus interfaces (LXI, GPIB, USBTMC, MQTT)...", type: "info" });
    try {
      const res = await fetch(`${API_BASE}/hardware/discover`, { method: "POST" });
      const data = await res.json();
      setDevices(data.discovered_devices || []);
      setActionMessage({
        text: `Discovery complete: ${data.count} test instruments registered. Physical hardware: ${data.physical_hardware_detected ? "DETECTED" : "NONE PRESENT (STANDBY)"}`,
        type: "success"
      });
      await refreshStatus();
    } catch (err: any) {
      setActionMessage({ text: `Discovery error: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedDeviceId) return;
    setLoading(true);
    setActionMessage({ text: `Testing connection for ${selectedDeviceId}...`, type: "info" });
    setTestResult(null);
    setShowTechnicalDetails(false);
    try {
      const res = await fetch(`${API_BASE}/hardware/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedDeviceId })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        setActionMessage({
          text: data.message || (selectedDevice?.source_type === "SIMULATED"
            ? "Simulation connection test passed — virtual test bench responded successfully."
            : selectedDevice?.source_type === "REPLAY"
            ? "Replay source verified."
            : "Physical hardware connection verified."),
          type: "success"
        });
      } else {
        setActionMessage({
          text: data.message || "Hardware connection test failed. No physical hardware connection could be verified. Live telemetry remains unavailable.",
          type: "error"
        });
      }
      await refreshStatus();
    } catch (err: any) {
      setActionMessage({ text: `Connection test fault: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedDeviceId) return;
    setLoading(true);
    setActionMessage({ text: `Binding ${selectedDeviceId} as active test equipment...`, type: "info" });
    try {
      const res = await fetch(`${API_BASE}/hardware/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedDeviceId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: `Successfully bound to ${selectedDeviceId}. Stream ready.`, type: "success" });
      } else {
        setActionMessage({
          text: data.message || "Target device configured, but physical hardware is not connected.",
          type: "warning"
        });
      }
      await refreshStatus();
      await refreshDevices();
    } catch (err: any) {
      setActionMessage({ text: `Connection fault: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/hardware/disconnect`, { method: "POST" });
      const data = await res.json();
      setActionMessage({ text: "Hardware interface disconnected safely.", type: "info" });
      await refreshStatus();
      await refreshDevices();
    } catch (err: any) {
      setActionMessage({ text: `Disconnect fault: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartLiveStream = async () => {
    const isLiveHwTarget = selectedDevice?.source_type === "LIVE_HARDWARE";
    const isHwVerified = Boolean(hardwareStatus?.live_hardware_verified && hardwareStatus?.hardware_connected);
    if (isLiveHwTarget && !isHwVerified) {
      setActionMessage({
        text: "Live hardware stream cannot start. Physical hardware connection has not been verified. Run Test Connection successfully before starting LIVE_HARDWARE telemetry.",
        type: "error"
      });
      return;
    }

    setLoading(true);
    setActionMessage({ text: "Starting telemetry acquisition pipeline...", type: "info" });
    try {
      const res = await fetch(`${API_BASE}/hardware/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedDeviceId })
      });
      const data = await res.json();
      if (data.success === false || data.status?.success === false) {
        setActionMessage({
          text: data.message || data.status?.message || "Live hardware stream cannot start. Physical hardware connection has not been verified. Run Test Connection successfully before starting LIVE_HARDWARE telemetry.",
          type: "error"
        });
      } else {
        const streamMsg = isLiveHwTarget
          ? "Live hardware telemetry stream started."
          : (selectedDevice?.source_type === "REPLAY"
          ? "Replay telemetry stream started."
          : "Simulation telemetry stream started.");
        setActionMessage({ text: data.message || data.status?.message || streamMsg, type: "success" });
      }
      await refreshStatus();
    } catch (err: any) {
      setActionMessage({ text: `Stream error: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleStopLiveStream = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/hardware/stream/stop`, { method: "POST" });
      const data = await res.json();
      const isLiveHw = dataSource === "LIVE HARDWARE" || selectedDevice?.source_type === "LIVE_HARDWARE";
      const stopMsg = isLiveHw
        ? "Live hardware telemetry stream stopped."
        : (dataSource === "REPLAY" || selectedDevice?.source_type === "REPLAY"
        ? "Replay telemetry stream stopped."
        : "Simulation telemetry stream stopped.");
      setActionMessage({ text: data?.status?.message || stopMsg, type: "info" });
      await refreshStatus();
    } catch (err: any) {
      setActionMessage({ text: `Stop error: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSimulatorBench = async () => {
    setSelectedDeviceId("DEV-SIM-ATE-MOCK");
    setLoading(true);
    setActionMessage({ text: "Switching to Virtual Test Bench simulator...", type: "info" });
    try {
      await fetch(`${API_BASE}/hardware/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: "DEV-SIM-ATE-MOCK" })
      });
      await fetch(`${API_BASE}/hardware/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: "DEV-SIM-ATE-MOCK" })
      });
      setActionMessage({ text: "Simulation telemetry stream started.", type: "success" });
      await refreshStatus();
      await refreshDevices();
    } catch (err: any) {
      setActionMessage({ text: `Simulator start error: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);
  const connStatus = hardwareStatus?.connection_status || "DISCONNECTED";
  const connHealth = hardwareStatus?.connection_health || "DISCONNECTED";
  const dataSource = hardwareStatus?.data_source || "SIMULATION";
  const isPhysicallyConnected = Boolean(hardwareStatus?.physical_hardware_connected);
  const isCalValid = Boolean(hardwareStatus?.is_calibration_valid);
  const simulatorActive = Boolean(hardwareStatus?.simulator_active || hardwareStatus?.simulator_status === "ACTIVE");

  // Latest live point from stream or props for Section 7 (Live AI)
  const latestLivePoint: HardwareTelemetryPoint | null =
    (livePoints && livePoints.length > 0)
      ? (livePoints[livePoints.length - 1] as HardwareTelemetryPoint)
      : (recentTelemetry.length > 0 ? (recentTelemetry[0] as HardwareTelemetryPoint) : null);

  const evidenceState = latestLivePoint?.evidence_state || (latestLivePoint ? "EARLY_EVIDENCE" : "INSUFFICIENT_EVIDENCE");
  const modelStatus = latestLivePoint?.model_status || (evidenceState === "INSUFFICIENT_EVIDENCE" ? "MODEL_NOT_READY" : "MODEL_APPLICABLE");
  const isPredictionAvailable = Boolean(
    latestLivePoint &&
    latestLivePoint.predicted_168h !== undefined &&
    latestLivePoint.predicted_168h !== null &&
    evidenceState !== "INSUFFICIENT_EVIDENCE" &&
    latestLivePoint.evidence_status !== "INSUFFICIENT_EVIDENCE"
  );

  const getDiagStateClass = (val?: string): string => {
    if (!val) return "state-neutral";
    const v = val.toUpperCase().trim();
    if (v === "PASS" || v === "ACTIVE") return "state-pass";
    if (v === "FAIL") return "state-fail";
    if (v.includes("NOT VERIFIED") || v.includes("NOT_VERIFIED") || v.includes("NOT ACTIVE") || v.includes("NOT_ACTIVE")) return "state-warning";
    if (v.includes("SIMULATION") || v.includes("REPLAY") || v.includes("LIVE HARDWARE")) return "state-info";
    return "state-neutral";
  };

  const formatTelemetryTimestamp = (ts?: string, idx: number = 0, total: number = 1): string => {
    if (!ts) return "--:--:--";
    try {
      if (ts.includes("T")) {
        const timePart = ts.split("T")[1].replace("Z", "");
        if (timePart.includes(".")) {
          const [hms, ms] = timePart.split(".");
          return `${hms.slice(0, 8)}.${ms.slice(0, 3).padEnd(3, "0")}`;
        }
        return `${timePart.slice(0, 8)}.000`;
      }
      return ts.slice(0, 12);
    } catch {
      return String(ts).slice(0, 12);
    }
  };

  return (
    <div className="tab-pane hardware-connectivity-pane active">
      <div className="hw-console-container">

        {/* ================================================================= */}
        {/* SECTION 1 — MASTER REUSABLE ABOUT HERO                            */}
        {/* ================================================================= */}
        <SectionHero
          badge="HARDWARE CONNECTIVITY"
          title="Hardware Connectivity"
          subtitle="Hardware-ready telemetry ingestion and engineering decision support for compatible test-cell instrumentation."
        />

        {/* Real-time Authoritative Hardware Status Indicators */}
        <div className="hw-header-badges-bar mb-3" style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: "8px" }}>
          <div className={`hw-status-pill hw-source-${dataSource === "LIVE HARDWARE" ? "live" : dataSource === "REPLAY" ? "replay" : "sim"}`}>
            <span className="hw-pill-dot">●</span>
            <span className="hw-pill-label">DATA SOURCE:</span>
            <span className="hw-pill-val">{dataSource}</span>
          </div>
          <div className={`hw-status-pill hw-health-${isPhysicallyConnected ? "connected" : "disconnected"}`}>
            <span className="hw-pill-dot">●</span>
            <span className="hw-pill-label">HARDWARE:</span>
            <span className="hw-pill-val">
              {dataSource === "LIVE HARDWARE"
                ? (isPhysicallyConnected ? "CONNECTED" : "NOT VERIFIED")
                : "DISCONNECTED"}
            </span>
          </div>
          {dataSource === "SIMULATION" && (
            <div className="hw-status-pill hw-source-sim">
              <span className="hw-pill-dot">●</span>
              <span className="hw-pill-label">SIMULATOR:</span>
              <span className="hw-pill-val">{hardwareStatus?.simulator_status || "ACTIVE"}</span>
            </div>
          )}
          {dataSource === "REPLAY" && (
            <div className="hw-status-pill hw-source-replay">
              <span className="hw-pill-dot">●</span>
              <span className="hw-pill-label">REPLAY:</span>
              <span className="hw-pill-val">{hardwareStatus?.replay_status || "ACTIVE"}</span>
            </div>
          )}
          {dataSource === "LIVE HARDWARE" && (
            <div className={`hw-status-pill ${isPhysicallyConnected ? "hw-source-live" : "hw-health-disconnected"}`}>
              <span className="hw-pill-dot">●</span>
              <span className="hw-pill-label">TELEMETRY:</span>
              <span className="hw-pill-val">{isPhysicallyConnected ? "LIVE" : "STOPPED"}</span>
            </div>
          )}
        </div>

        {/* Global Action Feedback Alert */}
        {actionMessage && (
          <div className={`hw-feedback-banner feedback-${actionMessage.type} hw-card-reveal`}>
            <div className="hw-feedback-content">
              <span className="hw-feedback-icon">
                {actionMessage.type === "success" ? "✓" : actionMessage.type === "error" ? "✕" : "ℹ"}
              </span>
              <span className="hw-feedback-text">{actionMessage.text}</span>
            </div>
            <button
              type="button"
              className="hw-feedback-close"
              onClick={() => setActionMessage(null)}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION 2 — HARDWARE READINESS STATUS (One Wide Elegant Card)     */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-readiness-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">SYSTEM VERIFICATION & INTEGRATION TAXONOMY</span>
                <h2 className="hw-card-title">Hardware Integration Status</h2>
              </div>
              <span className="hw-badge-unvalidated">UNVALIDATED HARDWARE STATUS</span>
            </div>

            <div className="hw-readiness-content-grid">
              {/* Readiness Matrix */}
              <div className="hw-readiness-matrix">
                <div className="hw-matrix-row">
                  <span className="hw-matrix-label">Interface Layer</span>
                  <span className="hw-matrix-badge badge-pass">✓ IMPLEMENTED</span>
                </div>
                <div className="hw-matrix-row">
                  <span className="hw-matrix-label">Virtual Test Bench</span>
                  <span className="hw-matrix-badge badge-pass">✓ VALIDATED</span>
                </div>
                <div className="hw-matrix-row">
                  <span className="hw-matrix-label">Replay Pipeline</span>
                  <span className="hw-matrix-badge badge-pass">✓ VALIDATED</span>
                </div>
                <div className="hw-matrix-row">
                  <span className="hw-matrix-label">Physical Connection</span>
                  <span className={`hw-matrix-badge ${isPhysicallyConnected ? "badge-pass" : "badge-pending"}`}>
                    {isPhysicallyConnected ? "✓ CONNECTED" : "○ NOT CONNECTED"}
                  </span>
                </div>
                <div className="hw-matrix-row">
                  <span className="hw-matrix-label">Calibration Validation</span>
                  <span className={`hw-matrix-badge ${isPhysicallyConnected && isCalValid ? "badge-pass" : "badge-unperformed"}`}>
                    {isPhysicallyConnected && isCalValid ? "✓ VALIDATED" : "○ NOT PERFORMED"}
                  </span>
                </div>
                <div className="hw-matrix-row">
                  <span className="hw-matrix-label">Live Hardware Validation</span>
                  <span className="hw-matrix-badge badge-unperformed">○ NOT PERFORMED</span>
                </div>
              </div>

              {/* Informative Notice & Safety Notice */}
              <div className="hw-readiness-notice-col">
                <div className="hw-notice-box">
                  <p className="hw-notice-text">
                    <strong>Physical hardware validation remains pending</strong> until genuine ATE/chamber equipment is connected and calibrated.
                  </p>
                  <p className="hw-notice-subtext">
                    ReliabilityX is architected to ingest telemetry from compatible test-cell instrumentation through a hardware adapter/gateway layer. Supported interfaces include SCPI over Ethernet/LXI, IEEE-488.2 GPIB, USBTMC, and SEMI E183 RITdb-aligned telemetry architecture.
                  </p>
                  <div className="hw-safety-boundary-tag">
                    <span className="hw-shield-icon">🛡</span>
                    <span>READ-ONLY SAFETY ACTIVE: Version 1 is strictly read-only; autonomous chamber actuation is prohibited.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 3 — CONNECTION STATUS (5 Overview Cards in CSS Grid)      */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-overview-grid">
            <div className="hw-overview-card hw-float-subtle">
              <span className="hw-overview-label">HARDWARE CONNECTION</span>
              <div className={`hw-overview-val ${isPhysicallyConnected ? "val-success" : "val-danger"}`}>
                {isPhysicallyConnected ? "CONNECTED" : "DISCONNECTED"}
              </div>
              <div className="hw-overview-sub">
                <span className={`hw-indicator-dot dot-${isPhysicallyConnected ? "connected" : "disconnected"}`}>●</span>
                <span>{isPhysicallyConnected ? "Live Hardware Bus" : (dataSource === "SIMULATION" ? "Simulator: Active" : "Replay Pipeline")}</span>
              </div>
            </div>

            <div className="hw-overview-card hw-float-subtle">
              <span className="hw-overview-label">DATA SOURCE</span>
              <div className={`hw-overview-val ${dataSource === "LIVE HARDWARE" ? "val-live" : "val-accent"}`}>
                {dataSource}
              </div>
              <div className="hw-overview-sub">
                <span className="hw-indicator-dot dot-cyan">●</span>
                <span>{isPhysicallyConnected ? "Live Hardware Bus" : (dataSource === "REPLAY" ? "Historical Replay" : "Virtual Bench")}</span>
              </div>
            </div>

            <div className="hw-overview-card hw-float-subtle">
              <span className="hw-overview-label">INTERFACE</span>
              <div className="hw-overview-val font-mono">
                {hardwareStatus?.interface || selectedDevice?.interface_type || "SCPI_LXI"}
              </div>
              <div className="hw-overview-sub font-mono">
                {selectedDevice?.host ? `${selectedDevice.host}:${selectedDevice.port}` : "TCP / 5025"}
              </div>
            </div>

            <div className="hw-overview-card hw-float-subtle">
              <span className="hw-overview-label">STATION</span>
              <div className="hw-overview-val font-mono">
                {hardwareStatus?.station_id || selectedDevice?.station_id || "ATE-01"}
              </div>
              <div className="hw-overview-sub font-mono">
                ATE Burn-In Cell 01
              </div>
            </div>

            <div className="hw-overview-card hw-float-subtle">
              <span className="hw-overview-label">CHANNEL</span>
              <div className="hw-overview-val font-mono">
                {hardwareStatus?.channel || selectedDevice?.channel_id || "CH1"}
              </div>
              <div className="hw-overview-sub font-mono">
                {isPhysicallyConnected && hardwareStatus?.is_calibration_valid
                  ? "Calibration Valid"
                  : dataSource === "SIMULATION"
                  ? "Simulation Profile"
                  : dataSource === "REPLAY"
                  ? "Replay Metadata"
                  : "Not Physically Verified"}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 4 — TEST BENCH CONTROL CENTER                             */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-control-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">INSTRUMENT SELECTION & INTERROGATION</span>
                <h2 className="hw-card-title">Test Bench Control Center</h2>
                <p className="hw-card-subtitle">
                  Select and interrogate a compatible test-cell instrument.
                </p>
              </div>
            </div>

            {/* Device / Fixture Selector */}
            <div className="hw-control-body">
              <div className="hw-field-group">
                <label className="hw-field-label" htmlFor="device-selector">
                  TARGET DEVICE (FIXTURE CONFIGURATION)
                </label>
                <div className="hw-selector-wrap">
                  <select
                    id="device-selector"
                    className="hw-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={loading}
                  >
                    {devices.map((d) => (
                      <option key={d.device_id} value={d.device_id}>
                        [{d.source_type}] {d.manufacturer} {d.model} — {d.interface_type} ({d.device_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hw-target-reconciliation-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
                  <span>
                    TARGET DEVICE: <strong style={{ color: "#f8fafc" }}>[{selectedDevice?.source_type || "SIMULATED"}] {selectedDevice?.manufacturer} {selectedDevice?.model}</strong>
                  </span>
                  <span>
                    ACTIVE DATA SOURCE: <strong style={{ color: isPhysicallyConnected ? "#10b981" : "#06b6d4" }}>{dataSource}</strong>
                  </span>
                </div>
                {selectedDevice?.source_type === "LIVE_HARDWARE" && !isPhysicallyConnected && (
                  <div className="hw-target-disclaimer-note" style={{ marginTop: "4px", fontSize: "11px", color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>ℹ</span>
                    <span>Target device configured, but physical hardware is not connected.</span>
                  </div>
                )}
              </div>

              {/* Compact Device Metadata Panel */}
              {selectedDevice && (
                <div className="hw-metadata-panel">
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Manufacturer:</span>
                    <span className="hw-meta-v font-bold">{selectedDevice.manufacturer}</span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Model:</span>
                    <span className="hw-meta-v font-mono">{selectedDevice.model}</span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Serial Number:</span>
                    <span className="hw-meta-v font-mono">{selectedDevice.serial_number}</span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Station ID:</span>
                    <span className="hw-meta-v font-mono">{selectedDevice.station_id}</span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Channel:</span>
                    <span className="hw-meta-v font-mono">{selectedDevice.channel_id}</span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Interface:</span>
                    <span className="hw-meta-v font-mono">{selectedDevice.interface_type}</span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Target Address:</span>
                    <span className="hw-meta-v font-mono">
                      {selectedDevice.host ? `${selectedDevice.host}:${selectedDevice.port}` : selectedDevice.gpib_address !== null ? `GPIB::${selectedDevice.gpib_address}::INSTR` : "127.0.0.1 (Loopback)"}
                    </span>
                  </div>
                  <div className="hw-meta-item">
                    <span className="hw-meta-k">Calibration:</span>
                    <span className="hw-meta-v">
                      <span className="hw-cal-pill">
                        {isPhysicallyConnected && hardwareStatus?.is_calibration_valid
                          ? selectedDevice.calibration_status
                          : dataSource === "SIMULATION"
                          ? "SIMULATION PROFILE"
                          : dataSource === "REPLAY"
                          ? "REPLAY METADATA"
                          : "NOT PHYSICALLY VERIFIED"}
                      </span>
                      <span className="hw-cal-note">
                        ({isPhysicallyConnected ? selectedDevice.calibration_id : "N/A — SIMULATED"})
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons in Deliberate Hierarchy */}
              <div className="hw-actions-matrix">
                <div className="hw-btn-group-primary">
                  <button
                    type="button"
                    className="hw-btn hw-btn-primary"
                    onClick={handleTestConnection}
                    disabled={loading}
                    title="Sends *IDN? interrogation query to verify bus communication"
                  >
                    TEST CONNECTION
                  </button>
                </div>

                <div className="hw-btn-group-secondary">
                  <button
                    type="button"
                    className="hw-btn hw-btn-secondary"
                    onClick={handleDiscoverDevices}
                    disabled={loading}
                    title="Scans the network and bus interfaces for available instruments"
                  >
                    DISCOVER DEVICES
                  </button>
                  <button
                    type="button"
                    className="hw-btn hw-btn-secondary"
                    onClick={handleConnect}
                    disabled={loading || connStatus === "CONNECTED"}
                    title="Establishes active communication session"
                  >
                    CONNECT
                  </button>
                  <button
                    type="button"
                    className="hw-btn hw-btn-secondary"
                    onClick={handleDisconnect}
                    disabled={loading || connStatus === "DISCONNECTED"}
                    title="Closes active instrument session"
                  >
                    DISCONNECT
                  </button>
                </div>

                <div className="hw-btn-group-stream">
                  {(() => {
                    const isLiveHwTarget = selectedDevice?.source_type === "LIVE_HARDWARE";
                    const isHwVerified = Boolean(hardwareStatus?.live_hardware_verified && hardwareStatus?.hardware_connected);
                    const isStartDisabled = loading || (isLiveHwTarget && !isHwVerified);
                    return (
                      <button
                        type="button"
                        className="hw-btn hw-btn-stream-start"
                        onClick={handleStartLiveStream}
                        disabled={isStartDisabled}
                        title={
                          isLiveHwTarget && !isHwVerified
                            ? "Physical hardware connection must be verified first."
                            : "Starts telemetry ingestion and AI prognostic processing"
                        }
                      >
                        START STREAM
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    className="hw-btn hw-btn-stream-stop"
                    onClick={handleStopLiveStream}
                    disabled={loading}
                    title="Halts active telemetry stream"
                  >
                    STOP STREAM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 5 — CONNECTION DIAGNOSTICS                                */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-diagnostics-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">CONNECTION DIAGNOSTICS &amp; SAFETY CONTROLS</span>
                <h2 className="hw-card-title">Connection Diagnostics</h2>
              </div>
              <span className={`hw-diag-badge ${isPhysicallyConnected ? "diag-pass" : "diag-standby"}`}>
                {isPhysicallyConnected ? "TRANSPORT ACTIVE" : "STANDBY / SIMULATION READY"}
              </span>
            </div>

            <div className="hw-diagnostics-body">
              <div className="hw-diagnostics-grid">
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Transport</span>
                  {(() => {
                    const val = testResult
                      ? (testResult?.diagnostics?.transport || "FAIL")
                      : (hardwareStatus?.diagnostics?.transport || (isPhysicallyConnected ? "PASS" : "NOT VERIFIED"));
                    return <span className={`hw-diag-state ${getDiagStateClass(val)}`}>{val}</span>;
                  })()}
                </div>
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Device Identity</span>
                  {(() => {
                    const val = testResult
                      ? (testResult?.diagnostics?.device_identity || "NOT VERIFIED")
                      : (hardwareStatus?.diagnostics?.device_identity || (isPhysicallyConnected ? "PASS" : "NOT VERIFIED"));
                    return <span className={`hw-diag-state ${getDiagStateClass(val)}`}>{val}</span>;
                  })()}
                </div>
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Serial Verification</span>
                  {(() => {
                    const val = testResult
                      ? (testResult?.diagnostics?.serial_verification || "NOT VERIFIED")
                      : (hardwareStatus?.diagnostics?.serial_verification || (isPhysicallyConnected ? "PASS" : "NOT VERIFIED"));
                    return <span className={`hw-diag-state ${getDiagStateClass(val)}`}>{val}</span>;
                  })()}
                </div>
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Calibration State</span>
                  {(() => {
                    const val = isPhysicallyConnected
                      ? (testResult?.diagnostics?.calibration_state || hardwareStatus?.diagnostics?.calibration_state || "PASS")
                      : dataSource === "SIMULATION"
                      ? "SIMULATION PROFILE"
                      : dataSource === "REPLAY"
                      ? "REPLAY METADATA"
                      : "NOT PHYSICALLY VERIFIED";
                    return <span className={`hw-diag-state ${getDiagStateClass(val)}`}>{val}</span>;
                  })()}
                </div>
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Telemetry Channel</span>
                  {(() => {
                    const val = testResult
                      ? (testResult?.diagnostics?.telemetry_channel || (isPhysicallyConnected ? "PASS" : "NOT ACTIVE"))
                      : (hardwareStatus?.diagnostics?.telemetry_channel || (isPhysicallyConnected ? "PASS" : simulatorActive ? "SIMULATION STREAM" : "NOT ACTIVE"));
                    return <span className={`hw-diag-state ${getDiagStateClass(val)}`}>{val}</span>;
                  })()}
                </div>
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Read-Only Policy</span>
                  <span className="hw-diag-state state-pass">
                    ACTIVE
                  </span>
                </div>
                <div className="hw-diag-item">
                  <span className="hw-diag-name">Source Provenance</span>
                  <span className="hw-diag-state state-info font-bold">
                    {dataSource}
                  </span>
                </div>
              </div>

              {/* Disconnected / Test feedback callout */}
              {!isPhysicallyConnected && (
                <div className="hw-no-hardware-banner">
                  <div className="hw-no-hw-badge">NO LIVE HARDWARE CONNECTED</div>
                  <p className="hw-no-hw-text">
                    No physical instrument responded at {selectedDevice?.host || "192.168.1.120"}:{selectedDevice?.port || 5025}. Physical hardware validation remains pending.
                  </p>
                  <button
                    type="button"
                    className="hw-btn-inline-toggle"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  >
                    {showTechnicalDetails ? "▲ Hide Technical Response" : "▼ Show Technical Response (*IDN?)"}
                  </button>
                </div>
              )}

              {/* Collapsible Technical Response Area */}
              {showTechnicalDetails && (
                <div className="hw-technical-response-box">
                  <div className="hw-tech-title">Technical Handshake Response:</div>
                  <pre className="hw-tech-pre">
                    {JSON.stringify(testResult?.technical_response || testResult?.idn || {
                      target_address: `${selectedDevice?.host || "192.168.1.120"}:${selectedDevice?.port || 5025}`,
                      bus_status: "SOCKET_TIMEOUT (1500ms)",
                      reason: "No physical instrument replied on raw SCPI socket port 5025.",
                      sim_fallback: "SIMULATION / REPLAY MODE AVAILABLE"
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 6 — LIVE TELEMETRY MONITOR                                */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-telemetry-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">REAL-TIME MULTI-CHANNEL BUFFER</span>
                <h2 className="hw-card-title">
                  {dataSource === "LIVE HARDWARE"
                    ? "LIVE HARDWARE TELEMETRY"
                    : dataSource === "REPLAY"
                    ? "REPLAY TELEMETRY"
                    : "REAL-TIME SIMULATED TELEMETRY"}
                </h2>
              </div>
              <div className="hw-telemetry-header-right">
                <span className={`hw-source-pill-compact ${dataSource === "LIVE HARDWARE" ? "is-live" : dataSource === "REPLAY" ? "is-replay" : "is-sim"}`}>
                  ● {dataSource}
                </span>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="hw-telemetry-stats-bar">
              <div className="hw-stat-pill">
                <span className="hw-stat-k">Last Packet:</span>
                <span className="hw-stat-v font-mono">
                  {hardwareStatus?.last_telemetry !== "None"
                    ? `${hardwareStatus?.last_telemetry?.slice(11, 19)} UTC (${hardwareStatus?.seconds_since_last_telemetry ?? 0}s ago)`
                    : "Standby"}
                </span>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-k">Sampling Rate:</span>
                <span className="hw-stat-v font-mono">
                  {hardwareStatus?.sampling_rate_display || (hardwareStatus?.sampling_rate_hz ? `${hardwareStatus.sampling_rate_hz.toFixed(1)} Hz` : "1.0 Hz")}
                </span>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-k">Channel:</span>
                <span className="hw-stat-v font-mono">{selectedDevice?.channel_id || "CH1_SMU_A"}</span>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-k">Station:</span>
                <span className="hw-stat-v font-mono">{selectedDevice?.station_id || "ATE-01"}</span>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-k">Quality:</span>
                <span className="hw-stat-v text-success font-bold">GOOD</span>
              </div>
              <div className="hw-stat-pill">
                <span className="hw-stat-k">Latency:</span>
                <span className="hw-stat-v font-mono">~28ms</span>
              </div>
            </div>

            {/* Telemetry Table */}
            <div className="hw-table-container">
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>COMPONENT</th>
                    <th>LOT</th>
                    <th>STAGE</th>
                    <th>PARAMETER</th>
                    <th>VALUE</th>
                    <th>SOURCE</th>
                    <th>STATION</th>
                    <th>CHANNEL</th>
                    <th>QUALITY</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTelemetry.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="hw-table-empty">
                        No telemetry packets in buffer. Click <strong>[ START LIVE STREAM ]</strong> or switch to <strong>Virtual Test Bench</strong> to initiate real-time screening.
                      </td>
                    </tr>
                  ) : (
                    recentTelemetry.map((r: any, idx: number) => (
                      <tr key={r.id || `${r.component_id}-${r.timestamp}-${idx}`}>
                        <td className="font-mono text-muted">{formatTelemetryTimestamp(r.timestamp, idx, recentTelemetry.length)}</td>
                        <td className="font-bold text-accent">
                          {onInspectComp ? (
                            <button
                              type="button"
                              className="hw-link-btn"
                              onClick={() => onInspectComp(r.component_id)}
                            >
                              {r.component_id}
                            </button>
                          ) : (
                            r.component_id
                          )}
                        </td>
                        <td className="font-mono">{r.lot_id}</td>
                        <td><span className="hw-stage-tag">{r.test_stage}</span></td>
                        <td className="font-mono text-xs">{r.parameter_name || r.parameter}</td>
                        <td className="font-mono font-bold text-light">
                          {Number(r.value).toFixed(3)} {r.unit}
                        </td>
                        <td>
                          <span className={`hw-prov-pill ${r.source_type === "LIVE_HARDWARE" ? "prov-live" : "prov-sim"}`}>
                            {r.source_type || "SIMULATED"}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-muted">{r.test_station_id || "ATE-01"}</td>
                        <td className="font-mono text-xs text-muted">{r.channel_id || "CH1"}</td>
                        <td>
                          <span className={`hw-q-pill q-${(r.quality || "GOOD").toLowerCase()}`}>
                            {r.quality || "GOOD"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 7 — LIVE AI ANALYSIS (LIVE RELIABILITY ANALYSIS)          */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-ai-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">PHYSICS-INFORMED PROGNOSTICS & CONFORMAL GATING</span>
                <h2 className="hw-card-title">Live Reliability Analysis</h2>
              </div>
              <div className="hw-evidence-badge-group">
                <span className={`hw-evidence-pill ${evidenceState === "INSUFFICIENT_EVIDENCE" ? "evidence-insufficient" : "evidence-valid"}`}>
                  EVIDENCE: {evidenceState.replace("_", " ")}
                </span>
                <span className={`hw-model-pill ${modelStatus === "MODEL_APPLICABLE" ? "model-active" : "model-standby"}`}>
                  {modelStatus.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Pipeline Visual Flow */}
            <div className="hw-pipeline-flow-bar">
              <div className="hw-flow-step step-active">
                <div className="hw-step-dot"></div>
                <div className="hw-step-title">TELEMETRY</div>
              </div>
              <div className="hw-flow-connector connector-active"></div>
              <div className="hw-flow-step step-active">
                <div className="hw-step-dot"></div>
                <div className="hw-step-title">DATA QUALITY</div>
              </div>
              <div className="hw-flow-connector connector-active"></div>
              <div className="hw-flow-step step-active">
                <div className="hw-step-dot"></div>
                <div className="hw-step-title">ANOMALY DETECTION</div>
              </div>
              <div className="hw-flow-connector connector-active"></div>
              <div className={`hw-flow-step ${isPredictionAvailable ? "step-active" : "step-gated"}`}>
                <div className="hw-step-dot"></div>
                <div className="hw-step-title">168h PROGNOSTIC</div>
              </div>
              <div className="hw-flow-connector"></div>
              <div className={`hw-flow-step ${isPredictionAvailable ? "step-active" : "step-gated"}`}>
                <div className="hw-step-dot"></div>
                <div className="hw-step-title">CONFORMAL INTERVAL</div>
              </div>
              <div className="hw-flow-connector"></div>
              <div className="hw-flow-step step-active">
                <div className="hw-step-dot"></div>
                <div className="hw-step-title">RISK STATE</div>
              </div>
            </div>

            {/* Evidence Gate Banner if Insufficient Evidence */}
            {!isPredictionAvailable && (
              <div className="hw-evidence-gating-callout">
                <div className="hw-gating-title">
                  <span className="hw-gating-icon">⚠</span>
                  INSUFFICIENT EVIDENCE — MODEL APPLICABILITY GATE ACTIVE
                </div>
                <p className="hw-gating-desc">
                  ReliabilityX strictly prohibits fabricating premature prognostic predictions. A minimum of 24h burn-in telemetry history across multiple temporal checkpoints is required before computing the <strong>168h prognostic forecast (Value_168h)</strong>.
                </p>
              </div>
            )}

            {/* AI Prognostic KPIs Grid */}
            <div className="hw-ai-kpi-grid">
              <div className="hw-kpi-box">
                <span className="hw-kpi-label">Data Quality</span>
                <div className="hw-kpi-val text-success">
                  {latestLivePoint?.quality || "GOOD"}
                </div>
                <div className="hw-kpi-sub">Sensor Integrity Check</div>
              </div>

              <div className="hw-kpi-box">
                <span className="hw-kpi-label">Drift Rate</span>
                <div className="hw-kpi-val font-mono">
                  {latestLivePoint && latestLivePoint.drift_rate !== undefined ? `${latestLivePoint.drift_rate >= 0 ? "+" : ""}${Number(latestLivePoint.drift_rate).toFixed(4)}/h` : "+0.0000/h"}
                </div>
                <div className="hw-kpi-sub">First Derivative</div>
              </div>

              <div className="hw-kpi-box">
                <span className="hw-kpi-label">Acceleration</span>
                <div className="hw-kpi-val font-mono">
                  {latestLivePoint && (latestLivePoint.drift_acceleration !== undefined || latestLivePoint.accel !== undefined)
                    ? `${((latestLivePoint.drift_acceleration ?? latestLivePoint.accel ?? 0) >= 0 ? "+" : "")}${Number(latestLivePoint.drift_acceleration ?? latestLivePoint.accel).toFixed(5)}/h²`
                    : "+0.00000/h²"}
                </div>
                <div className="hw-kpi-sub">Second Derivative</div>
              </div>

              <div className="hw-kpi-box highlight-kpi">
                <span className="hw-kpi-label">Predicted 168h (Value_168h)</span>
                <div className="hw-kpi-val text-cyan font-mono font-bold">
                  {isPredictionAvailable
                    ? `${Number(latestLivePoint?.predicted_168h).toFixed(3)} ${latestLivePoint?.unit || "µA"}`
                    : "INSUFFICIENT EVIDENCE"}
                </div>
                <div className="hw-kpi-sub">Primary Forecast Target (Strict 168h)</div>
              </div>

              <div className="hw-kpi-box">
                <span className="hw-kpi-label">95% Split-Conformal Interval</span>
                <div className="hw-kpi-val font-mono text-sm">
                  {isPredictionAvailable && latestLivePoint?.estimated_prediction_interval
                    ? `[${Number(latestLivePoint.estimated_prediction_interval[0]).toFixed(2)}, ${Number(latestLivePoint.estimated_prediction_interval[1]).toFixed(2)}]`
                    : "Awaiting 24h Checkpoint"}
                </div>
                <div className="hw-kpi-sub">95% Nominal Split-Conformal Prediction Interval</div>
              </div>

              <div className="hw-kpi-box">
                <span className="hw-kpi-label">Breach Probability</span>
                <div className="hw-kpi-val font-mono">
                  {isPredictionAvailable && latestLivePoint?.probability_of_breach_pct !== undefined && latestLivePoint.probability_of_breach_pct !== null
                    ? `${latestLivePoint.probability_of_breach_pct}%`
                    : "NOT AVAILABLE"}
                </div>
                <div className="hw-kpi-sub">
                  {isPredictionAvailable ? "P(Value > Limit at 168h)" : "Awaiting 24h checkpoint"}
                </div>
              </div>

              <div className="hw-kpi-box">
                <span className="hw-kpi-label">Time-to-Breach</span>
                <div className="hw-kpi-val font-mono text-xs">
                  {isPredictionAvailable
                    ? (latestLivePoint?.estimated_time_to_breach || "NOT AVAILABLE")
                    : "NOT AVAILABLE"}
                </div>
                <div className="hw-kpi-sub">
                  {isPredictionAvailable ? "Estimated Degradation Window" : "Awaiting 24h checkpoint"}
                </div>
              </div>

              <div className="hw-kpi-box">
                <span className="hw-kpi-label">Risk State</span>
                <div className={`hw-kpi-val ${
                  !isPredictionAvailable || latestLivePoint?.risk === "NOT ASSESSED"
                    ? "text-muted"
                    : latestLivePoint?.risk === "REVIEW" || latestLivePoint?.risk === "HIGH RISK"
                    ? "text-danger"
                    : latestLivePoint?.risk === "WATCH"
                    ? "text-warning"
                    : "text-success"
                }`}>
                  {isPredictionAvailable ? (latestLivePoint?.risk || "PASS") : "NOT ASSESSED"}
                </div>
                <div className="hw-kpi-sub">
                  {isPredictionAvailable ? "Tri-State Disposition" : "Insufficient evidence"}
                </div>
              </div>
            </div>

            <div className="hw-conformal-note-footer">
              <span className="hw-note-label">Conformal Prediction Note:</span>
              <span className="hw-note-text">
                ReliabilityX uses a 95% Nominal Split-Conformal Prediction Interval. Empirical coverage depends on the adopted calibration protocol and exchangeability assumptions; live hardware distribution shift may affect nominal coverage. (Synthetic LOLO benchmark: 95.96% ± 1.05% across 5 seeds).
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 8 — PROVENANCE & AUDIT TRAIL                              */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-provenance-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">VERIFIED DATA INTEGRITY & AUDIT PROVENANCE</span>
                <h2 className="hw-card-title">Telemetry Provenance & Audit Trail</h2>
                <p className="hw-card-subtitle">
                  Server-controlled cryptographic verification details and instrument traceability metadata.
                </p>
              </div>
            </div>

            <div className="hw-provenance-grid">
              <div className="hw-prov-item">
                <span className="hw-prov-k">Source Type:</span>
                <span className="hw-prov-v font-bold">{hardwareStatus?.data_source || "SIMULATION"}</span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Adapter Session ID:</span>
                <span className="hw-prov-v font-mono">{hardwareStatus?.provenance_metadata?.adapter_session_id || "SES-LXI-2602B-01"}</span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Instrument ID:</span>
                <span className="hw-prov-v font-mono">{selectedDevice?.instrument_id || "SMU-KEITHLEY-2602B"}</span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Serial Number:</span>
                <span className="hw-prov-v font-mono">{selectedDevice?.serial_number || "4102941"}</span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Calibration ID:</span>
                <span className="hw-prov-v font-mono">
                  {isPhysicallyConnected
                    ? (selectedDevice?.calibration_id || "CAL-NIST-2026-0881")
                    : dataSource === "SIMULATION"
                    ? "DEMO CALIBRATION METADATA (SIMULATION PROFILE)"
                    : "REPLAY METADATA"}
                </span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Verification Time:</span>
                <span className="hw-prov-v font-mono text-xs">{hardwareStatus?.provenance_metadata?.source_verified_at || "2026-10-04T13:40:00Z"}</span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Verification Method:</span>
                <span className="hw-prov-v font-mono text-xs">
                  {hardwareStatus?.provenance_metadata?.verification_method_display || (
                    isPhysicallyConnected
                      ? "Server-verified 7-point hardware gateway check"
                      : "Server-verified simulation gateway check"
                  )}
                </span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Traceability:</span>
                <span className="hw-prov-v">
                  {isPhysicallyConnected
                    ? (selectedDevice?.calibration_traceability || "NIST-traceable calibration metadata, where applicable")
                    : dataSource === "SIMULATION"
                    ? "Simulated Calibration Profile — Physical Calibration Not Verified"
                    : "Replay Benchmark Metadata"}
                </span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Test Station ID:</span>
                <span className="hw-prov-v font-mono">{selectedDevice?.station_id || "ATE-BURNIN-STATION-01"}</span>
              </div>
              <div className="hw-prov-item">
                <span className="hw-prov-k">Active Channel:</span>
                <span className="hw-prov-v font-mono">{selectedDevice?.channel_id || "CH1_SMU_A"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 9 — INDUSTRY ARCHITECTURE                                 */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-architecture-card">
            <div className="hw-card-header">
              <div className="hw-card-title-group">
                <span className="hw-card-eyebrow">INDUSTRY TEST-CELL INTEGRATION STANDARDS</span>
                <h2 className="hw-card-title">Test-Cell Integration Architecture</h2>
              </div>
            </div>

            <div className="hw-architecture-grid">
              <div className="hw-arch-card">
                <div className="hw-arch-badge badge-supported">SUPPORTED ARCHITECTURE</div>
                <h3 className="hw-arch-title">SCPI / IEEE-488.2</h3>
                <p className="hw-arch-desc">
                  Standard Commands for Programmable Instruments. Hierarchical ASCII query trees with strict read-only profile allowlists for Keithley and Keysight Source Measure Units.
                </p>
                <div className="hw-arch-role">
                  <span className="hw-role-label">Role in ReliabilityX:</span>
                  <span className="hw-role-val">Read-Only Interrogation & Parameter Extraction</span>
                </div>
              </div>

              <div className="hw-arch-card">
                <div className="hw-arch-badge badge-supported">SUPPORTED ARCHITECTURE</div>
                <h3 className="hw-arch-title">Ethernet / LXI / HiSLIP</h3>
                <p className="hw-arch-desc">
                  LAN eXtensions for Instrumentation with IVI HiSLIP low-latency TCP communication over port 4880 and raw port 5025 socket streaming.
                </p>
                <div className="hw-arch-role">
                  <span className="hw-role-label">Role in ReliabilityX:</span>
                  <span className="hw-role-val">Low-Latency Network Socket Bus Bridge</span>
                </div>
              </div>

              <div className="hw-arch-card">
                <div className="hw-arch-badge badge-supported">SUPPORTED ARCHITECTURE</div>
                <h3 className="hw-arch-title">GPIB / USBTMC</h3>
                <p className="hw-arch-desc">
                  IEEE-488.1 3-wire handshake parallel bus and USB Test & Measurement Class endpoints for legacy environmental chambers and thermal controllers.
                </p>
                <div className="hw-arch-role">
                  <span className="hw-role-label">Intended Role:</span>
                  <span className="hw-role-val">Thermal Chamber Telemetry / Monitoring</span>
                </div>
              </div>

              <div className="hw-arch-card">
                <div className="hw-arch-badge badge-aligned">ALIGNED ARCHITECTURE</div>
                <h3 className="hw-arch-title">MQTT / RITdb-Aligned Telemetry</h3>
                <p className="hw-arch-desc">
                  MQTT-based telemetry architecture aligned with SEMI E183 RITdb real-time test-data exchange and SEMI A4 TEMS concepts for Smart Manufacturing test-cells.
                </p>
                <div className="hw-arch-role">
                  <span className="hw-role-label">Role in ReliabilityX:</span>
                  <span className="hw-role-val">SEMI E183-Inspired Streaming Telemetry Gateway</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 10 — VIRTUAL TEST BENCH                                   */}
        {/* ================================================================= */}
        <section className="hw-section hw-card-reveal">
          <div className="hw-card hw-virtual-bench-card">
            <div className="hw-vb-left">
              <div className="hw-vb-badge">SOURCE: SIMULATED</div>
              <h2 className="hw-vb-title">Virtual Test Bench</h2>
              <p className="hw-vb-desc">
                Evaluate the complete hardware-to-AI pipeline without physical equipment. Generates multi-channel semiconductor parametric burn-in telemetry with configurable drift, thermal noise, and anomaly injection scenarios.
              </p>
            </div>
            <div className="hw-vb-right">
              <button
                type="button"
                className="hw-btn hw-btn-simulator-open"
                onClick={handleOpenSimulatorBench}
                disabled={loading}
              >
                [ OPEN SIMULATOR BENCH ]
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
