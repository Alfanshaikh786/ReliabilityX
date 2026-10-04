// ==============================================================================
// ReliabilityX — Dedicated Non-Sticky Section Header Component
// Exclusively shared across the 7 screening & monitoring sections:
// 1. Anomaly Detection / Screening Pipeline ("screening")
// 2. Dossier / Components Directory ("components")
// 3. Lots / Lot Health & Anomaly Triage ("lots")
// 4. Predictions / 168h Prognostic Forecasts ("predictions")
// 5. Dashboard / Dashboard Overview ("dashboard")
// 6. Live Stream / Live Screening Telemetry ("live_telemetry")
// 7. Hardware / Hardware Connectivity ("hardware_connectivity")
//
// NON-STICKY: Scrolls away naturally with the page content.
// Identical height, padding, spacing, alignment, and typography across all 7 sections.
// ==============================================================================
import React from "react";
import { TabType, LiveStreamStatus, API_BASE } from "../types";
import { IconSearch } from "./Icons";

export const SECTION_HEADER_TABS: TabType[] = [
  "dashboard",
];

interface SectionHeaderProps {
  activeTab: TabType;
  globalSearch: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  activeDataset: any;
  onOpenDatasetModal: () => void;
  onReloadDemo: () => void;
  liveStatus?: LiveStreamStatus | null;
  onNavigateToLive?: () => void;
  onToggleMobileMenu?: () => void;
}

export function SectionHeader({
  activeTab,
  globalSearch,
  onSearchChange,
  onSearchSubmit,
  activeDataset,
  onOpenDatasetModal,
  onReloadDemo,
  liveStatus,
  onNavigateToLive,
  onToggleMobileMenu,
}: SectionHeaderProps) {
  // Render ONLY for the 7 designated screening/monitoring sections
  if (!SECTION_HEADER_TABS.includes(activeTab)) {
    return null;
  }

  const getSectionTitle = () => {
    switch (activeTab) {
      case "screening":
        return "Screening Pipeline";
      case "components":
        return "Components Directory";
      case "lots":
        return "Lot Health & Anomaly Triage";
      case "predictions":
        return "168h Prognostic Forecasts";
      case "dashboard":
        return "Dashboard Overview";
      case "live_telemetry":
        return "Live Screening Telemetry";
      case "hardware_connectivity":
        return "Hardware Connectivity";
      default:
        return "ReliabilityX Suite";
    }
  };

  const getSectionBreadcrumb = () => {
    switch (activeTab) {
      case "screening":
        return "RELIABILITYX / ANOMALY DETECTION";
      case "components":
        return "RELIABILITYX / DOSSIER";
      case "lots":
        return "RELIABILITYX / LOTS";
      case "predictions":
        return "RELIABILITYX / PREDICTIONS";
      case "dashboard":
        return "RELIABILITYX / DASHBOARD";
      case "live_telemetry":
        return "RELIABILITYX / LIVE STREAM";
      case "hardware_connectivity":
        return "RELIABILITYX / HARDWARE";
      default:
        return `RELIABILITYX / ${activeTab.toUpperCase()}`;
    }
  };

  const status = liveStatus?.connection_status || "OFFLINE";
  const isPhysicallyConnected = Boolean(
    ((liveStatus as any)?.data_source === "LIVE HARDWARE" || (liveStatus as any)?.source_type === "LIVE_HARDWARE") &&
    (liveStatus as any)?.physical_hardware_connected
  );
  const isReplay = (liveStatus as any)?.source_type === "csv_replay" || (liveStatus as any)?.data_source === "REPLAY";
  const dataSourceLabel = isPhysicallyConnected ? "LIVE HARDWARE" : isReplay ? "REPLAY" : "SIMULATION";
  const dataSourceClass = isPhysicallyConnected ? "source-live" : isReplay ? "source-replay" : "source-sim";
  const sourceName = liveStatus?.source_name || "VIRTUAL TEST BENCH (SIMULATED)";
  const latencyDisplay = liveStatus?.last_latency_ms ? `${Math.round(liveStatus.last_latency_ms)}ms` : "35ms";
  const msgsDisplay = `${(liveStatus?.messages_count ?? 0).toLocaleString()} msgs`;

  return (
    <header className="section-header" aria-label={`${getSectionTitle()} Header`}>
      {/* ROW 1: Identity & Real-Time Status Cards */}
      <div className="section-header-row-primary">
        <div className="section-header-left">
          {onToggleMobileMenu && (
            <button
              type="button"
              className="section-header-menu-btn"
              onClick={onToggleMobileMenu}
              aria-label="Toggle navigation menu"
              title="Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}
          <div className="section-header-titles-group">
            <span className="section-header-breadcrumb">{getSectionBreadcrumb()}</span>
            <h1 className="section-header-title">{getSectionTitle()}</h1>
          </div>
        </div>

        <div className="section-header-status-group">
          {/* Strict Data Source Provenance Indicator */}
          <div
            className={`data-source-provenance-pill ${dataSourceClass}`}
            title="Strict Telemetry Source Provenance (SIMULATION vs LIVE HARDWARE)"
          >
            <span className="source-label-prefix">DATA SOURCE:</span>
            <span className="source-dot">●</span>
            <span className="source-name-bold">{dataSourceLabel}</span>
          </div>

          {/* Real-Time Live Status Pill */}
          <div
            className={`live-topbar-pill status-${status.toLowerCase()}`}
            onClick={onNavigateToLive}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateToLive?.();
              }
            }}
            title="Click to open Live Screening view"
            aria-label={`Connection status: ${status}. Data source: ${sourceName}`}
          >
            <div className="live-pill-status-row">
              <span className={`live-pulse-dot dot-${status.toLowerCase()}`}></span>
              <span className="live-status-label">{status}</span>
            </div>
            <span className="live-pill-source">{sourceName}</span>
            {status === "LIVE" || status === "CONNECTED" ? (
              <div className="live-pill-metrics">
                <span className="metric-tag">{latencyDisplay}</span>
                <span className="metric-dot">•</span>
                <span className="metric-tag">{msgsDisplay}</span>
              </div>
            ) : (
              <span className="live-pill-metrics text-muted">Standby</span>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: Utility Controls (Search, Benchmark Selector, Actions) */}
      <div className="section-header-row-secondary">
        {/* Quick Search Input */}
        <form onSubmit={onSearchSubmit} className="section-header-search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Search components (e.g. C-01008)..."
            value={globalSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search components"
          />
        </form>

        {/* Dataset Pill */}
        <div className="dataset-pill">
          <span className="pill-dot"></span>
          <span className="dataset-pill-name">
            {!activeDataset?.dataset_id || activeDataset.dataset_id.startsWith("demo")
              ? "Demo Benchmark"
              : activeDataset?.name || "User Dataset"}
          </span>
          <button type="button" className="pill-action-btn" onClick={onOpenDatasetModal}>
            Change
          </button>
        </div>

        {/* Action Buttons */}
        <div className="section-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => (window.location.href = `${API_BASE}/reports/export-csv`)}
          >
            Export CSV
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onReloadDemo}>
            Reload Demo
          </button>
        </div>
      </div>
    </header>
  );
}
