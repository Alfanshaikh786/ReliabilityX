// ==============================================================================
// ReliabilityX — Mobile Bottom Navigation Bar
// Touch-first, thumb-accessible primary navigation dock for mobile devices
// Only visible on mobile viewports (<= 768px). Respects safe-area-inset-bottom.
// ==============================================================================
import React from "react";
import { TabType } from "../types";
import {
  IconDashboard,
  IconLivePulse,
  IconPipeline,
  IconComponents
} from "./Icons";

interface MobileBottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onToggleMobileMenu: () => void;
  mobileMenuOpen: boolean;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onToggleMobileMenu,
  mobileMenuOpen
}: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Dock">
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === "dashboard" && !mobileMenuOpen ? "active" : ""}`}
        onClick={() => onSelectTab("dashboard")}
        aria-label="Dashboard"
      >
        <span className="mobile-nav-icon">
          <IconDashboard className="mobile-svg-icon" />
        </span>
        <span className="mobile-nav-label">Dashboard</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === "live_telemetry" && !mobileMenuOpen ? "active" : ""}`}
        onClick={() => onSelectTab("live_telemetry")}
        aria-label="Live Screening"
      >
        <span className="mobile-nav-icon live-icon-wrapper">
          <IconLivePulse className="mobile-svg-icon" />
          <span className="mobile-live-indicator" />
        </span>
        <span className="mobile-nav-label">Live</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === "screening" && !mobileMenuOpen ? "active" : ""}`}
        onClick={() => onSelectTab("screening")}
        aria-label="Screening Pipeline"
      >
        <span className="mobile-nav-icon">
          <IconPipeline className="mobile-svg-icon" />
        </span>
        <span className="mobile-nav-label">Pipeline</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === "components" && !mobileMenuOpen ? "active" : ""}`}
        onClick={() => onSelectTab("components")}
        aria-label="Components"
      >
        <span className="mobile-nav-icon">
          <IconComponents className="mobile-svg-icon" />
        </span>
        <span className="mobile-nav-label">Units</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${mobileMenuOpen ? "active" : ""}`}
        onClick={onToggleMobileMenu}
        aria-label="Open Full Navigation Drawer"
      >
        <span className="mobile-nav-icon">
          <svg className="mobile-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </span>
        <span className="mobile-nav-label">Menu</span>
      </button>
    </nav>
  );
}
