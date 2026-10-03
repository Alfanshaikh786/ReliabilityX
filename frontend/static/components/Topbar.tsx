import React from "react";
import { TabType, LiveStreamStatus, API_BASE } from "../types";
import { IconSearch } from "./Icons";

interface TopbarProps {
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

export function Topbar({
  activeTab,
  globalSearch,
  onSearchChange,
  onSearchSubmit,
  activeDataset,
  onOpenDatasetModal,
  onReloadDemo,
  liveStatus,
  onNavigateToLive,
  onToggleMobileMenu
}: TopbarProps) {
  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard Overview";
      case "live_telemetry":
        return "Live Screening Telemetry";
      case "screening":
        return "Screening Pipeline";
      case "components":
        return "Components Directory";
      case "lots":
        return "Lot Health & Anomaly Triage";
      case "predictions":
        return "168h Prognostic Forecasts";
      case "inspection":
        return "Inspection Priority Queue";
      case "reports":
        return "AI-Assisted Screening Reports & Analysis";
      case "engineering":
        return "Engineering Suite";
      case "audit":
        return "Audit & Traceability Ledger";
      default:
        return "ReliabilityX Suite";
    }
  };

  const status = liveStatus?.connection_status || "OFFLINE";

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {onToggleMobileMenu && (
          <button
            type="button"
            className="mobile-menu-toggle-btn"
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
        <div className="topbar-titles-group">
          <span className="topbar-breadcrumb">
            RELIABILITYX / {activeTab === "live_telemetry" ? "LIVE STREAM" : activeTab === "audit" ? "AUDIT" : activeTab.toUpperCase()}
          </span>
          <h1 className="topbar-title">{getTabTitle()}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Real-Time Live Status Pill */}
        <div
          className={`live-topbar-pill status-${status.toLowerCase()}`}
          onClick={onNavigateToLive}
          title="Click to open Live Screening view"
        >
          <span className={`live-pulse-dot dot-${status.toLowerCase()}`}></span>
          <span className="live-status-label">{status}</span>
          <span className="live-pill-source d-desktop-only">{liveStatus?.source_name || "SIMULATED ATE-01"}</span>
          {status === "LIVE" || status === "CONNECTED" ? (
            <div className="live-pill-metrics d-desktop-only">
              <span className="metric-tag">
                {liveStatus?.last_latency_ms ? `${Math.round(liveStatus.last_latency_ms)}ms` : "18ms"}
              </span>
              <span className="metric-dot">•</span>
              <span className="metric-tag">
                {(liveStatus?.messages_count ?? 1145).toLocaleString()} msgs
              </span>
            </div>
          ) : (
            <span className="live-pill-metrics text-muted d-desktop-only">Standby</span>
          )}
        </div>

        {/* Quick Search Input */}
        <form onSubmit={onSearchSubmit} className="topbar-search-box d-desktop-only">
          <IconSearch />
          <input
            type="text"
            placeholder="Search component (e.g. C-01008)..."
            value={globalSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </form>

        {/* Dataset Pill */}
        <div className="dataset-pill d-desktop-only">
          <span className="pill-dot"></span>
          <span>
            {!activeDataset?.dataset_id || activeDataset.dataset_id.startsWith("demo")
              ? "Demo Benchmark"
              : activeDataset?.name || "User Dataset"}
          </span>
          <button className="pill-action-btn" onClick={onOpenDatasetModal}>
            Change
          </button>
        </div>

        {/* Action Buttons */}
        <div className="topbar-actions d-desktop-only">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => (window.location.href = `${API_BASE}/reports/export-csv`)}
          >
            Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={onReloadDemo}>
            Reload Demo
          </button>
        </div>
      </div>
    </header>
  );
}
