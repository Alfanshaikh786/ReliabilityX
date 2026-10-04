// ==============================================================================
// ReliabilityX — Left Navigation Sidebar
// Aerospace Enterprise Dark Sidebar with Thin Crisp SVG Icons
// ==============================================================================
import React from "react";
import { TabType, API_BASE } from "../types";
import {
  IconDashboard,
  IconLivePulse,
  IconPipeline,
  IconComponents,
  IconLots,
  IconPredictions,
  IconInspection,
  IconReports,
  IconEngineering,
  IconAudit,
  IconAbout,
  IconCollapse,
  IconExpand
} from "./Icons";

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onReloadDemo?: () => void;
}

export function Sidebar({ activeTab, onSelectTab, collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onReloadDemo }: SidebarProps) {
  const handleItemClick = (tab: TabType) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      <div
        className={`mobile-sidebar-backdrop ${mobileOpen ? "is-active" : ""}`}
        onClick={onCloseMobile}
        aria-label="Close navigation"
        aria-hidden={!mobileOpen}
      />
      <aside className={`app-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* 1. Sidebar Header & Brand Logo */}
        <div className={`sidebar-header ${collapsed ? "sidebar-header-collapsed" : "sidebar-header-expanded"}`}>
          {collapsed ? (
            /* Collapsed: proper square shield-X icon, centred */
            <img
              src="/static/emblem.png"
              alt="ReliabilityX"
              className="sidebar-icon-collapsed"
            />
          ) : (
            /* Expanded: full-bleed banner logo */
            <img
              src="/static/logo.png"
              alt="ReliabilityX"
              className="sidebar-logo-img"
            />
          )}

          {/* Mobile Drawer Quick Close Button */}
          <button
            type="button"
            className="sidebar-mobile-close-btn d-mobile-only"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            title="Close navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* 2. Simplified Nav Groups (4 Groups) */}
        <div className="sidebar-nav">
          {/* GROUP 1: OVERVIEW */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-title">
              {!collapsed ? "OVERVIEW" : "•••"}
            </div>
            <button
              className={`sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => handleItemClick("dashboard")}
              title="Dashboard"
            >
              <IconDashboard />
              <span className="sidebar-item-label">Dashboard</span>
            </button>
            <button
              className={`sidebar-item live-sidebar-item ${activeTab === "live_telemetry" ? "active" : ""}`}
              onClick={() => handleItemClick("live_telemetry")}
              title="Live Screening & Simulator"
            >
            <IconLivePulse />
            <span className="sidebar-item-label">Live Screening</span>
            {!collapsed && <span className="live-sidebar-pill">LIVE</span>}
          </button>
        </div>

        {/* GROUP 2: SCREENING */}
        <div className="sidebar-nav-group">
          <div className="sidebar-group-title">
            {!collapsed ? "SCREENING" : "•••"}
          </div>
          <button
            className={`sidebar-item ${activeTab === "screening" ? "active" : ""}`}
            onClick={() => handleItemClick("screening")}
            title="Screening Pipeline"
          >
            <IconPipeline />
            <span className="sidebar-item-label">Screening Pipeline</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === "components" ? "active" : ""}`}
            onClick={() => handleItemClick("components")}
            title="Components"
          >
            <IconComponents />
            <span className="sidebar-item-label">Components</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === "lots" ? "active" : ""}`}
            onClick={() => handleItemClick("lots")}
            title="Lots"
          >
            <IconLots />
            <span className="sidebar-item-label">Lots</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === "predictions" ? "active" : ""}`}
            onClick={() => handleItemClick("predictions")}
            title="Predictions"
          >
            <IconPredictions />
            <span className="sidebar-item-label">Predictions</span>
          </button>
        </div>

        {/* GROUP 3: ACTION */}
        <div className="sidebar-nav-group">
          <div className="sidebar-group-title">
            {!collapsed ? "ACTION" : "•••"}
          </div>
          <button
            className={`sidebar-item ${activeTab === "inspection" ? "active" : ""}`}
            onClick={() => handleItemClick("inspection")}
            title="Inspection Priority"
          >
            <IconInspection />
            <span className="sidebar-item-label">Inspection Priority</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => handleItemClick("reports")}
            title="Reports"
          >
            <IconReports />
            <span className="sidebar-item-label">Reports</span>
          </button>
        </div>

        {/* GROUP 4: ENGINEERING */}
        <div className="sidebar-nav-group">
          <div className="sidebar-group-title">
            {!collapsed ? "ENGINEERING" : "•••"}
          </div>
          <button
            className={`sidebar-item ${activeTab === "engineering" ? "active" : ""}`}
            onClick={() => handleItemClick("engineering")}
            title="Engineering"
          >
            <IconEngineering />
            <span className="sidebar-item-label">Engineering</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => handleItemClick("audit")}
            title="Audit & Traceability"
          >
            <IconAudit />
            <span className="sidebar-item-label">Audit / Traceability</span>
          </button>
        </div>

        {/* GROUP 5: SYSTEM */}
        <div className="sidebar-nav-group">
          <div className="sidebar-group-title">
            {!collapsed ? "SYSTEM" : "•••"}
          </div>
          <button
            className={`sidebar-item ${activeTab === "about" ? "active" : ""}`}
            onClick={() => handleItemClick("about")}
            title="About ReliabilityX & Team Brigebytes"
          >
            <IconAbout />
            <span className="sidebar-item-label">About</span>
          </button>
        </div>
      </div>

      {/* 3. Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-status-pill">
          <span className="status-pulse"></span>
          {!collapsed && <span>Screening Engine Ready</span>}
        </div>

        {/* Mobile quick action in drawer */}
        <div className="mobile-drawer-footer-actions d-mobile-only">
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-block"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              window.location.href = `${API_BASE}/reports/export-csv`;
            }}
          >
            Export Telemetry CSV
          </button>
          {onReloadDemo && (
            <button
              type="button"
              className="btn btn-primary btn-sm btn-block"
              style={{ marginTop: "8px" }}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onReloadDemo();
              }}
            >
              Reload Demo Benchmark
            </button>
          )}
        </div>

        <button className="sidebar-collapse-btn d-desktop-only" onClick={onToggleCollapse}>
          {collapsed ? <IconExpand /> : <><IconCollapse /> <span>Collapse Sidebar</span></>}
        </button>
      </div>
    </aside>
  </>
  );
}
