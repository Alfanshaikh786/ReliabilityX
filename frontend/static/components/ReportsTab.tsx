// ==============================================================================
// ReliabilityX — Reports & Aerospace Certificate Tab Component
// Official Screening Certificate & Parametric Data Export
// ==============================================================================
import React, { useState } from "react";
import { API_BASE } from "../types";

interface ReportsTabProps {
  onInspectComp: (id: string) => void;
}

export function ReportsTab({ onInspectComp }: ReportsTabProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="tab-pane active">
      {/* 1. Page Header */}
      <div className="hero-header mb-4">
        <h1 className="page-main-title">AI-ASSISTED SCREENING ANALYSIS REPORT</h1>
        <p className="page-main-subtitle">
          Parametric screening degradation analysis, estimated prediction intervals, and tamper-evident SHA-256 digital verification.
        </p>
      </div>

      {/* 2. Top KPI Metrics Row (4 Spacious Cards) */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">DOCUMENT PROTOCOL</div>
          <div className="kpi-value" style={{ fontSize: "20px" }}>AEC-Q001</div>
          <div className="kpi-sub">Statistical test baseline</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">ANALYSIS STATUS</div>
          <div className="kpi-value text-green" style={{ fontSize: "20px" }}>GENERATED</div>
          <div className="kpi-sub">Ready for engineer review</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">TELEMETRY TRACE</div>
          <div className="kpi-value text-green" style={{ fontSize: "20px" }}>100%</div>
          <div className="kpi-sub">All test hours captured</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">SECURITY CHECKSUM</div>
          <div className="kpi-value" style={{ fontSize: "20px" }}>SHA-256</div>
          <div className="kpi-sub">Tamper-evident verification</div>
        </div>
      </div>

      {/* 3. Report Preview & Action Card */}
      <div className="card mb-4">
        <div className="card-header reports-card-header">
          <span className="card-title">AI-ASSISTED SCREENING ANALYSIS REPORT PREVIEW</span>
          <div className="btn-group reports-btn-group">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? "Collapse preview height" : "Expand to full report height"}
            >
              {isExpanded ? "Collapse View" : "Expand Height"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => window.open(`${API_BASE}/reports/certificate-html`, "_blank")}
            >
              View Standalone Report
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => (window.location.href = `${API_BASE}/reports/export-csv`)}
            >
              Export Telemetry CSV
            </button>
          </div>
        </div>

        {/* Report Frame Preview */}
        <div
          className={`report-iframe-container ${isExpanded ? "is-expanded" : ""}`}
        >
          <iframe
            src={`${API_BASE}/reports/certificate-html`}
            title="Screening Analysis Report"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
