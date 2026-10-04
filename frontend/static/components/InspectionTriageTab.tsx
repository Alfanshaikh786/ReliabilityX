// ==============================================================================
// ReliabilityX — Inspection Priority Triage Tab Component
// Prioritized Human-in-the-Loop QA Engineering Verification Queue
// ==============================================================================
import React, { useState, useEffect } from "react";
import { API_BASE } from "../types";
import { StateBadge, RiskBadge } from "./Badges";
import { SectionHero } from "./SectionHero";

interface InspectionTriageTabProps {
  onInspectComp: (id: string) => void;
}

export function InspectionTriageTab({ onInspectComp }: InspectionTriageTabProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch(`${API_BASE}/components?limit=250`)
      .then((r) => r.json())
      .then((d) => {
        const comps = d.components || [];
        const flagged = comps.filter((c: any) => c.risk_level !== "PASS");
        flagged.sort((a: any, b: any) => (a.inspection_priority || 999) - (b.inspection_priority || 999));
        setQueue(flagged);
        setLoading(false);
      })
      .catch(() => {
        fetch(`${API_BASE}/dashboard/overview`)
          .then((r) => r.json())
          .then((ov) => {
            setQueue(ov.top_priorities || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  const totalFlagged = queue.length;
  const highRiskUnits = queue.filter((i) => i.risk_level === "HIGH RISK").length;
  const reviewUnits = queue.filter((i) => i.risk_level === "REVIEW").length;
  const watchUnits = queue.filter((i) => i.risk_level === "WATCH").length;

  return (
    <div className="tab-pane active">
      {/* 1. Page Header (Standardized Reusable About Hero) */}
      <SectionHero
        badge="INSPECTION PRIORITY"
        title="Inspection Priority Triage Queue"
        subtitle="Prioritized triage of screening units requiring authoritative physical QA / reliability engineer verification prior to lot sign-off."
      />

      {/* 2. Top KPI Metrics Row (4 equal-width cards) */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">TOTAL FLAGGED</div>
          <div className="kpi-value">{loading ? "--" : totalFlagged}</div>
          <div className="kpi-sub">Requiring engineer triage</div>
        </div>
        <div className="kpi-card border-red">
          <div className="kpi-title text-red">QUARANTINE / FA</div>
          <div className="kpi-value text-red">{loading ? "--" : highRiskUnits}</div>
          <div className="kpi-sub">High risk failure analysis</div>
        </div>
        <div className="kpi-card border-orange">
          <div className="kpi-title text-orange">QA REVIEW</div>
          <div className="kpi-value text-orange">{loading ? "--" : reviewUnits}</div>
          <div className="kpi-sub">Statistical parametric outliers</div>
        </div>
        <div className="kpi-card border-yellow">
          <div className="kpi-title text-yellow">WATCH LIST</div>
          <div className="kpi-value text-yellow">{loading ? "--" : watchUnits}</div>
          <div className="kpi-sub">Gate 2 re-test units</div>
        </div>
      </div>

      {/* 3. Triage Queue Table Card */}
      <div className="card" style={{ padding: "18px" }}>
        <div className="card-header">
          <span className="card-title">🚨 ACTIVE TRIAGE PIPELINE</span>
          <span className="card-badge">{queue.length} Units in Queue</span>
        </div>

        {/* Desktop Table View */}
        <div className="table-responsive d-desktop-only" style={{ marginTop: "12px" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Component ID</th>
                <th>Lot ID</th>
                <th>Behaviour State</th>
                <th>Risk Tier</th>
                <th>Primary Evidence / Fired Rules</th>
                <th>Recommended Action</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                    Loading triage queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                    No components requiring inspection. All active lots nominal.
                  </td>
                </tr>
              ) : (
                queue.map((item, idx) => (
                  <tr key={item.component_id}>
                    <td>
                      <strong style={{ fontSize: "14px", color: "var(--accent-blue)" }}>
                        #{idx + 1}
                      </strong>
                    </td>
                    <td>
                      <strong>{item.component_id}</strong>
                    </td>
                    <td>{item.lot_id}</td>
                    <td>
                      <StateBadge state={item.current_state} />
                    </td>
                    <td>
                      <RiskBadge risk={item.risk_level} />
                    </td>
                    <td style={{ fontSize: "11.5px", color: "var(--text-sub)", maxWidth: "260px" }}>
                      {item.priority_reason || "Multiple rule violations"}
                    </td>
                    <td>
                      <span className="badge badge-review" style={{ fontSize: "10.5px" }}>
                        {item.risk_level === "HIGH RISK" ? "Quarantine & Physical FA" : "QA Review Sign-off"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onInspectComp(item.component_id)}
                      >
                        Inspect Unit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Triage Cards */}
        <div className="mobile-card-list d-mobile-only" style={{ marginTop: "12px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              Loading triage queue...
            </div>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              No components requiring inspection. All active lots nominal.
            </div>
          ) : (
            queue.map((item, idx) => (
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
                    <span className="mobile-field-label">PRIMARY EVIDENCE</span>
                    <span className="mobile-field-val">{item.priority_reason || "Multiple rule violations"}</span>
                  </div>
                  <div className="mobile-unit-field">
                    <span className="mobile-field-label">ACTION</span>
                    <span className="badge badge-review" style={{ fontSize: "11px", alignSelf: "flex-start" }}>
                      {item.risk_level === "HIGH RISK" ? "Quarantine & Physical FA" : "QA Review Sign-off"}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block mobile-inspect-btn"
                  onClick={() => onInspectComp(item.component_id)}
                >
                  Inspect Unit →
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
