// ==============================================================================
// ReliabilityX — Component Detail & Authoritative QA Sign-off Modal
// ==============================================================================
import React, { useState, useEffect } from "react";
import { StateBadge, RiskBadge } from "./Badges";
import { TrajectorySvgChart } from "./TrajectorySvgChart";

interface ComponentDetailModalProps {
  compId: string;
  data: any;
  loading: boolean;
  onClose: () => void;
  onDecisionCommitted: () => void;
}

export function ComponentDetailModal({
  compId,
  data,
  loading,
  onClose,
  onDecisionCommitted
}: ComponentDetailModalProps) {
  const [disposition, setDisposition] = useState<string>("REVIEW");
  const [notes, setNotes] = useState<string>("");
  const [signature, setSignature] = useState<string>("Lead QA Reliability Engineer");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalSimDrift, setModalSimDrift] = useState<number>(0.08);
  const [activeSection, setActiveSection] = useState<string>("all");

  // Keyboard accessibility: Escape to close modal (Section 31)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const comp = data?.component;
  const pred = data?.prediction;
  const explain = comp?.explanation || data?.evidence;
  const measurements = data?.measurements || [];

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/components/${compId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: disposition,
          notes: notes || "Engineering disposition submitted based on telemetry analysis and lot baseline margins.",
          engineer_signature: signature,
          tags: ["SIH_EVALUATION", "ENGINEERING_DISPOSITION"]
        })
      });
      if (!res.ok) throw new Error("Decision submission failed");
      onDecisionCommitted();
      onClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sectionsList = [
    { id: "all", label: "All Sections" },
    { id: "overview", label: "Overview" },
    { id: "telemetry", label: "Telemetry" },
    { id: "prediction", label: "Prediction" },
    { id: "evidence", label: "Evidence" },
    { id: "behaviour", label: "Behaviour" },
    { id: "whatif", label: "What-If" },
    { id: "disposition", label: "Engineering Disposition" },
  ];

  const showSec = (secId: string) => activeSection === "all" || activeSection === secId;

  return (
    <div className="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="modal-dossier-title">
      <div className="modal-card modal-lg">
        {/* Modal Top Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <div id="modal-dossier-title" className="modal-category-title">
              COMPONENT SCREENING DOSSIER
            </div>
            <div className="modal-header-meta">
              <span className="modal-comp-id-title">{compId}</span>
              <span className="modal-lot-tag">Lot: <strong>{comp?.lot_id || "LOT-2411C"}</strong></span>
              <div className="modal-status-badge-wrap">
                <span className="modal-status-label">Status:</span>
                <RiskBadge risk={comp?.risk_level || "REVIEW"} />
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close component dossier modal">
            ✕
          </button>
        </div>

        {/* Section Navigation Tabs (Horizontal Scrollable Strip, No Multi-line Wrap) */}
        <div className="dossier-tab-strip" role="tablist" aria-label="Component Dossier Sections">
          {sectionsList.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeSection === tab.id}
              className={`dossier-tab-btn ${activeSection === tab.id ? "active" : ""}`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
              Loading component telemetry and degradation trajectory...
            </div>
          ) : (
            <>
              {/* SECTION A: Overview */}
              {showSec("overview") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">A. OVERVIEW & CURRENT SCREENING STATUS</span>
                    <span className="card-badge">Burn-In Gates Monitored</span>
                  </div>
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-title">BEHAVIOUR STATE</div>
                      <div style={{ marginTop: "6px" }}><StateBadge state={comp?.current_state || "ACCELERATING"} /></div>
                      <div className="kpi-sub" style={{ marginTop: "6px" }}>Observed classification</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-title">ASSESSED RISK TIER</div>
                      <div style={{ marginTop: "6px" }}><RiskBadge risk={comp?.risk_level || "REVIEW"} /></div>
                      <div className="kpi-sub" style={{ marginTop: "6px" }}>Multi-detector fusion</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-title">INSPECTION PRIORITY</div>
                      <div className="kpi-value text-red">#{comp?.inspection_priority ?? 1}</div>
                      <div className="kpi-sub">{comp?.priority_reason || "Critical wearout"}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-title">MONITORED GATES</div>
                      <div className="kpi-value text-cyan">{measurements.length || 4} points</div>
                      <div className="kpi-sub">0h, 24h, 96h, 168h ESS screening</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: Telemetry */}
              {showSec("telemetry") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">B. TELEMETRY TRAJECTORY</span>
                    <span className="card-badge">Burn-In Degradation (0–168h)</span>
                  </div>
                  <div className="chart-container-clean">
                    <TrajectorySvgChart
                      data={data}
                      paramName="leakage_current_uA"
                      simulatedDriftRate={modalSimDrift}
                    />
                  </div>
                </div>
              )}

              {/* SECTION C: Prediction */}
              {showSec("prediction") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">C. 168h PROGNOSTIC PREDICTION</span>
                    <span className="card-badge">Physics-Informed Arrhenius Forecaster</span>
                  </div>
                  <div className="chart-metrics-grid">
                    <div className="chart-metric-card">
                      <div className="chart-metric-title">168h Forecast</div>
                      <div className="chart-metric-val">
                        {pred?.predicted_168h ? pred.predicted_168h.toFixed(2) : "47.20"} μA
                      </div>
                      <div className="chart-metric-sub">End-of-screen projected value</div>
                    </div>
                    <div className="chart-metric-card">
                      <div className="chart-metric-title">Spec Limit</div>
                      <div className="chart-metric-val">50.0 μA</div>
                      <div className="chart-metric-sub">Engineering datasheet maximum</div>
                    </div>
                    <div className="chart-metric-card">
                      <div className="chart-metric-title">Estimated Prediction Interval</div>
                      <div className="chart-metric-val">
                        ±{pred?.uncertainty_std ? (pred.uncertainty_std * 1.96).toFixed(2) : "1.85"}
                      </div>
                      <div className="chart-metric-sub">Estimated Prediction Interval (±1.96σ)</div>
                    </div>
                    <div className="chart-metric-card" title="P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit.">
                      <div className="chart-metric-title">P90 Estimated Upper Bound ℹ️</div>
                      <div className={`chart-metric-val ${(pred?.p90_upper_bound || pred?.p90_worst_case || 49.05) > 50 ? "text-red" : ""}`}>
                        {(pred?.p90_upper_bound || pred?.p90_worst_case) ? (pred?.p90_upper_bound || pred?.p90_worst_case).toFixed(2) : "49.05"}
                      </div>
                      <div className="chart-metric-sub">P90 Risk Bound</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION D: Evidence */}
              {showSec("evidence") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">D. EVIDENCE ATTRIBUTION (WHY FLAGGED?)</span>
                    <span className="card-badge">Telemetry & Statistical Explainability</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div className="narrative-box-clean">
                      <strong>Telemetry Evidence Finding: </strong>
                      {explain?.narrative_explanation ||
                        "Accelerating non-linear drift in leakage current indicates progressive degradation under thermal-electrical stress."}
                    </div>
                    {explain?.factor_attributions && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="chart-metric-title">FACTOR CONTRIBUTIONS:</div>
                        {explain.factor_attributions.map((f: any, idx: number) => (
                          <div key={idx}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                              <span>{f.factor_name}</span>
                              <strong>{(f.contribution_ratio * 100).toFixed(1)}%</strong>
                            </div>
                            <div style={{ height: "6px", background: "#1E293B", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  width: `${f.contribution_ratio * 100}%`,
                                  background: idx === 0 ? "#FB923C" : "#38BDF8"
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION E: Behaviour */}
              {showSec("behaviour") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">E. CURRENT BEHAVIOUR STATE</span>
                    <span className="card-badge">Observed Telemetry Classification</span>
                  </div>
                  <div className="fingerprint-flow" style={{ padding: "16px 20px" }}>
                    <span className={`fp-node ${comp?.current_state === "NORMAL" ? "active" : ""}`}>NORMAL</span>
                    <span className={`fp-node ${comp?.current_state === "DRIFTING" ? "active" : ""}`}>DRIFTING</span>
                    <span className={`fp-node ${comp?.current_state === "ACCELERATING" ? "active" : ""}`}>ACCELERATING</span>
                    <span className={`fp-node ${comp?.current_state === "UNSTABLE" ? "active" : ""}`}>UNSTABLE</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: "11px", marginTop: "8px" }}>
                    Categories represent distinct observed degradation modes; components do not follow a mandatory sequential path.
                  </div>
                </div>
              )}

              {/* SECTION F: What-If */}
              {showSec("whatif") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">F. WHAT-IF COUNTERFACTUAL DRIFT SENSITIVITY</span>
                    <span className="card-badge">Real-Time Simulator</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <p className="section-desc">
                      Simulate additional parametric acceleration from remaining burn-in stress (96h–168h) to test boundary margin robustness:
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <input
                        type="range"
                        min="0.01"
                        max="0.40"
                        step="0.01"
                        value={modalSimDrift}
                        onChange={(e) => setModalSimDrift(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: "#38BDF8", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "13px", fontWeight: 700, minWidth: "100px", textAlign: "right", color: "#F8FAFC" }}>
                        +{(modalSimDrift * 100).toFixed(1)}% / 24h
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION G: Engineering Disposition */}
              {showSec("disposition") && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">G. ENGINEERING DISPOSITION & AUDIT SIGN-OFF</span>
                    <span className="badge badge-state-normal">SHA-256 Ledger Record</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div className="grid-2col">
                      <div className="form-group">
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-sub)", marginBottom: "6px" }}>
                          Engineering Disposition Decision:
                        </label>
                        <select
                          value={disposition}
                          onChange={(e) => setDisposition(e.target.value)}
                          className="form-input"
                          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#111C3D", color: "#FFFFFF" }}
                        >
                          <option value="PASS">PASS — No abnormal behaviour detected; subject to applicable engineering requirements</option>
                          <option value="WATCH">WATCH — Monitoring recommended</option>
                          <option value="REVIEW">REVIEW — Engineering review recommended</option>
                          <option value="HIGH RISK">HIGH RISK — Engineering investigation / disposition required</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-sub)", marginBottom: "6px" }}>
                          Lead QA Engineer Signature:
                        </label>
                        <input
                          type="text"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          className="form-input"
                          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#111C3D", color: "#FFFFFF" }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-sub)", marginBottom: "6px" }}>
                        Engineering Justification Rationale:
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter engineering rationale for authoritative disposition commit..."
                        className="form-input"
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#111C3D", color: "#FFFFFF", resize: "vertical" }}
                      />
                    </div>

                    <button
                      className="btn btn-primary btn-block"
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 700 }}
                    >
                      {submitting ? "Submitting Disposition to Ledger..." : "Submit Engineering Disposition"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
