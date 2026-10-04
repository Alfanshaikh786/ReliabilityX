// ==============================================================================
// ReliabilityX — Components Directory Tab Component
// Telemetry & Diagnostics Table with KPI Summary & Advanced Multi-Filter
// ==============================================================================
import React, { useState, useEffect } from "react";
import { ComponentItem, API_BASE } from "../types";
import { StateBadge, RiskBadge } from "./Badges";
import { SectionHero } from "./SectionHero";

interface ComponentsTabProps {
  onInspectComp: (id: string) => void;
  selectedLot?: string;
}

export function ComponentsTab({ onInspectComp, selectedLot }: ComponentsTabProps) {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lotFilter, setLotFilter] = useState<string>(selectedLot || "ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  useEffect(() => {
    if (selectedLot) {
      setLotFilter(selectedLot);
    }
  }, [selectedLot]);

  useEffect(() => {
    setLoading(true);
    let url = `${API_BASE}/components?limit=250`;
    if (lotFilter !== "ALL") url += `&lot_id=${lotFilter}`;
    if (riskFilter !== "ALL") url += `&risk_level=${encodeURIComponent(riskFilter)}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setComponents(data.components || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lotFilter, riskFilter]);

  // Reset pagination on filter or search change (Section 12)
  useEffect(() => {
    setCurrentPage(1);
  }, [lotFilter, riskFilter, searchQuery]);

  const filtered = components.filter(
    (c) =>
      searchQuery === "" ||
      c.component_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lot_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Dynamic KPI counts based on loaded data
  const passCount = components.filter((c) => c.risk_level === "PASS").length;
  const watchCount = components.filter((c) => c.risk_level === "WATCH").length;
  const reviewCount = components.filter((c) => c.risk_level === "REVIEW").length;
  const riskCount = components.filter((c) => c.risk_level === "HIGH RISK").length;

  return (
    <div className="tab-pane active">
      {/* 1. Page Header (Standardized Reusable About Hero) */}
      <SectionHero
        badge="DOSSIER"
        title="Components Directory"
        subtitle="Component-level reliability profiles, screening history, telemetry evidence, and engineering diagnostics."
      />

      {/* 2. Top KPI Metrics Row (4 equal-width cards) */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card">
          <div className="kpi-title">TOTAL MONITORED</div>
          <div className="kpi-value">{loading ? "--" : components.length}</div>
          <div className="kpi-sub">Across all active screening lots</div>
        </div>
        <div className="kpi-card border-green">
          <div className="kpi-title text-green">NOMINAL (PASS)</div>
          <div className="kpi-value text-green">{loading ? "--" : passCount}</div>
          <div className="kpi-sub">Within nominal burn-in trajectory</div>
        </div>
        <div className="kpi-card border-yellow">
          <div className="kpi-title text-yellow">WATCH / DRIFTING</div>
          <div className="kpi-value text-yellow">{loading ? "--" : watchCount}</div>
          <div className="kpi-sub">Drift within ±2σ bounds</div>
        </div>
        <div className="kpi-card border-red">
          <div className="kpi-title text-red">ELEVATED RISK</div>
          <div className="kpi-value text-red">{loading ? "--" : reviewCount + riskCount}</div>
          <div className="kpi-sub">{reviewCount} Review · {riskCount} High Risk</div>
        </div>
      </div>

      {/* 3. Main Directory Card with Filters & Table */}
      <div className="card" style={{ padding: "18px" }}>
        <div className="card-header">
          <span className="card-title">⚡ COMPONENT TELEMETRY DATABASE</span>
          <span className="card-badge">{filtered.length} Units Displayed</span>
        </div>

        {/* Filter Controls Bar */}
        <div className="filter-bar mb-3" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search Component ID or Lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "260px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 600 }}>Lot:</span>
            <select value={lotFilter} onChange={(e) => setLotFilter(e.target.value)}>
              <option value="ALL">All Lots</option>
              <option value="LOT-2411A">LOT-2411A</option>
              <option value="LOT-2411B">LOT-2411B</option>
              <option value="LOT-2411C">LOT-2411C</option>
              <option value="LOT-2411D">LOT-2411D</option>
              <option value="LOT-2411E">LOT-2411E</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 600 }}>Risk Status:</span>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
              <option value="ALL">All Risk Tiers</option>
              <option value="PASS">PASS</option>
              <option value="WATCH">WATCH</option>
              <option value="REVIEW">REVIEW</option>
              <option value="HIGH RISK">HIGH RISK</option>
            </select>
          </div>
        </div>

        {/* Telemetry Data Table - Desktop */}
        <div className="table-responsive d-desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component ID</th>
                <th>Lot ID</th>
                <th>Behaviour State</th>
                <th>Risk Status</th>
                <th>Priority Rank</th>
                <th>Primary Degradation Factor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px" }}>
                    Loading component database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px" }}>
                    No components matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((comp) => (
                  <tr key={comp.component_id}>
                    <td>
                      <strong>{comp.component_id}</strong>
                    </td>
                    <td>{comp.lot_id}</td>
                    <td>
                      <StateBadge state={comp.current_state} />
                    </td>
                    <td>
                      <RiskBadge risk={comp.risk_level} />
                    </td>
                    <td>
                      <strong style={{ color: comp.inspection_priority <= 5 ? "var(--status-risk)" : "var(--text-main)" }}>
                        #{comp.inspection_priority}
                      </strong>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-sub)" }}>
                      {comp.priority_reason || "Nominal parameters"}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onInspectComp(comp.component_id)}
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

        {/* Telemetry Data Cards - Mobile */}
        <div className="mobile-card-list d-mobile-only">
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              Loading component database...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              No components matching the selected criteria.
            </div>
          ) : (
            paginated.map((comp) => (
              <div key={comp.component_id} className="mobile-unit-card rx-float-card">
                <div className="mobile-unit-card-header">
                  <div className="mobile-unit-card-id-group">
                    <span className="mobile-priority-badge">#{comp.inspection_priority}</span>
                    <strong className="mobile-unit-id">{comp.component_id}</strong>
                    <span className="mobile-lot-pill">{comp.lot_id}</span>
                  </div>
                  <RiskBadge risk={comp.risk_level} />
                </div>

                <div className="mobile-unit-card-body">
                  <div className="mobile-unit-field">
                    <span className="mobile-field-label">BEHAVIOUR STATE</span>
                    <StateBadge state={comp.current_state} />
                  </div>
                  <div className="mobile-unit-field">
                    <span className="mobile-field-label">DEGRADATION FACTOR</span>
                    <span className="mobile-field-val">{comp.priority_reason || "Nominal parameters"}</span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-block mobile-inspect-btn"
                  onClick={() => onInspectComp(comp.component_id)}
                >
                  Inspect Unit →
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls Bar (Section 12 Table Performance) */}
        {!loading && filtered.length > pageSize && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} units
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: "4px 12px", fontSize: "11.5px" }}
              >
                Previous
              </button>
              <span style={{ padding: "0 8px", fontWeight: 600, color: "var(--text-main)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding: "4px 12px", fontSize: "11.5px" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
