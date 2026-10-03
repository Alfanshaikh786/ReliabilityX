// ==============================================================================
// ReliabilityX — Lots Health & Batch Anomalies Tab Component
// Lot-Level Anomaly Detection & Systemic Wafer-Wide Flaw Identification
// ==============================================================================
import React, { useState, useEffect } from "react";
import { LotItem } from "../types";

interface LotsTabProps {
  onSelectLot: (lotId: string) => void;
}

export function LotsTab({ onSelectLot }: LotsTabProps) {
  const [lots, setLots] = useState<LotItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/lots")
      .then((r) => r.json())
      .then((data) => {
        setLots(data.lots || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalLots = lots.length;
  const systemicAlerts = lots.filter((l) => l.is_lot_wide_pattern).length;
  const cleanLots = totalLots - systemicAlerts;
  const totalUnits = lots.reduce((acc, l) => acc + (l.component_count || 0), 0);
  const avgAnomaly = totalLots > 0 ? (lots.reduce((acc, l) => acc + (l.anomaly_percentage || 0), 0) / totalLots).toFixed(1) : "0.0";

  return (
    <div className="tab-pane active">
      {/* 1. Page Header */}
      <div className="page-header mb-4">
        <h1 className="page-main-title">Lot Health & Batch Anomaly Detection</h1>
        <p className="page-main-subtitle">
          Evaluates lot-wide degradation distributions to distinguish isolated component wearout from wafer-level or batch-wide manufacturing flaws.
        </p>
      </div>

      {/* 2. Top KPI Metrics Row (4 equal-width cards) */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">FLIGHT LOTS</div>
          <div className="kpi-value">{loading ? "--" : totalLots}</div>
          <div className="kpi-sub">Total active production batches</div>
        </div>
        <div className="kpi-card border-green">
          <div className="kpi-title text-green">NOMINAL BATCHES</div>
          <div className="kpi-value text-green">{loading ? "--" : cleanLots}</div>
          <div className="kpi-sub">Uniform distribution across parameters</div>
        </div>
        <div className="kpi-card border-red">
          <div className="kpi-title text-red">SYSTEMIC ALERTS</div>
          <div className="kpi-value text-red">{loading ? "--" : systemicAlerts}</div>
          <div className="kpi-sub">Wafer-level or lot-wide correlation</div>
        </div>
        <div className="kpi-card border-yellow">
          <div className="kpi-title text-yellow">TOTAL UNITS MONITORED</div>
          <div className="kpi-value text-yellow">{loading ? "--" : totalUnits}</div>
          <div className="kpi-sub">Average anomaly rate: {avgAnomaly}%</div>
        </div>
      </div>

      {/* 3. Lot Cards Grid */}
      <div className="card" style={{ padding: "18px" }}>
        <div className="card-header">
          <span className="card-title">📦 PRODUCTION LOT PROFILES</span>
          <span className="card-badge">Flight Batch Quality</span>
        </div>

        <div className="grid-2col" style={{ marginTop: "14px" }}>
          {loading ? (
            <div style={{ gridColumn: "span 2", textAlign: "center", padding: "40px" }}>
              Loading production lot health telemetry...
            </div>
          ) : (
            lots.map((lot) => (
              <div
                key={lot.lot_id}
                className="card"
                style={{
                  padding: "16px",
                  borderTop: lot.is_lot_wide_pattern
                    ? "3px solid var(--status-risk)"
                    : "3px solid var(--status-pass)"
                }}
              >
                <div className="card-header" style={{ marginBottom: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "16px", color: "var(--text-main)" }}>{lot.lot_id}</strong>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {lot.component_count} Total Flight Units · {lot.anomaly_percentage}% Anomaly Rate
                    </div>
                  </div>

                  {lot.is_lot_wide_pattern ? (
                    <span className="badge badge-risk">LOT-WIDE PATTERN</span>
                  ) : (
                    <span className="badge badge-pass">NOMINAL BATCH</span>
                  )}
                </div>

                {/* Status Breakdown Row */}
                <div style={{ display: "flex", gap: "8px", margin: "10px 0", flexWrap: "wrap" }}>
                  <span className="badge badge-pass">{lot.pass_count} PASS</span>
                  <span className="badge badge-watch">{lot.watch_count} WATCH</span>
                  <span className="badge badge-review">{lot.review_count} REVIEW</span>
                  <span className="badge badge-risk">{lot.high_risk_count} HIGH RISK</span>
                </div>

                {lot.is_lot_wide_pattern ? (
                  <div
                    className="narrative-box-clean"
                    style={{ borderLeftColor: "var(--status-risk)", fontSize: "12px", marginTop: "10px" }}
                  >
                    <strong>Lot-Wide Alert: </strong>
                    {lot.pattern_description ||
                      "Systemic leakage current acceleration detected across multiple flight units in this wafer batch."}
                  </div>
                ) : (
                  <div
                    className="narrative-box-clean"
                    style={{ borderLeftColor: "var(--status-pass)", fontSize: "12px", marginTop: "10px" }}
                  >
                    <strong>Batch Health: </strong>
                    All components exhibit homogeneous Arrhenius burn-in trajectories within nominal tolerance.
                  </div>
                )}

                <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectLot(lot.lot_id)}
                  >
                    View Batch Components →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
