// ==============================================================================
// ReliabilityX — Interactive Pipeline Architecture Flowchart
// Exact visual representation of the 10-layer AI-driven burn-in screening system
// ==============================================================================
import React, { useState } from "react";

interface NodeDetail {
  title: string;
  category: string;
  mlModels: string[];
  backendFile: string;
  description: string;
  codeSnippet: string;
}

const STAGE_DETAILS: Record<string, NodeDetail> = {
  sources: {
    title: "Burn-In / ESS Test Sources",
    category: "Data Ingestion Staging",
    mlModels: ["Hardware Sensor Telemetry Drivers", "ATE Measurement Protocol"],
    backendFile: "backend/data/validator.py",
    description: "Ingests multi-channel parametric telemetry across Automated Test Equipment (ATE), environmental stress screening chambers, and historical qualification records.",
    codeSnippet: `clean_df, quality_summary = validator.validate_and_clean(raw_df)`
  },
  test_data: {
    title: "Component Test Data",
    category: "Temporal Sampling Intervals",
    mlModels: ["Multi-Gate Time Stamping", "0h, 24h, 96h, 168h Telemetry Store"],
    backendFile: "backend/core/orchestrator.py",
    description: "Stores multi-channel readings across burn-in test gates: 0h (baseline), 24h (early burn-in), 96h (mid-screen), and 168h (qualification threshold).",
    codeSnippet: `cursor.execute("SELECT test_stage, timestamp_hours, parameter_name, raw_value, processed_value FROM measurements")`
  },
  data_quality: {
    title: "Data Quality Engine",
    category: "Sensor Validation & Cleansing",
    mlModels: ["IQR Spike Filter", "Sensor Stuck Detection", "Min-Max Normalization"],
    backendFile: "backend/data/validator.py",
    description: "Executes robust sensor validation: checks for frozen sensors, 5x IQR electrical spikes, missing records, scale normalization, and timestamp continuity.",
    codeSnippet: `class DataQualityEngine:
    def validate_and_clean(self, raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        # Outlier spikes > 5x IQR flagged as noise`
  },
  anomaly_engine: {
    title: "Lot-Relative Anomaly Engine",
    category: "Calibrated Anomaly Detection",
    mlModels: [
      "Isolation Forest (sklearn.ensemble.IsolationForest, 100 trees)",
      "Dynamic Part Average Testing (DPAT AEC-Q001 Standard)",
      "Robust Mahalanobis (sklearn.covariance.MinCovDet)",
      "Local Outlier Factor (sklearn.neighbors.LocalOutlierFactor)"
    ],
    backendFile: "backend/anomaly/ensemble.py",
    description: "Ensemble of 4 calibrated statistical and machine-learning anomaly detectors. Normalizes multi-channel parametric outliers into a unified [0, 1] probability scale.",
    codeSnippet: `from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.covariance import MinCovDet

iso = IsolationForest(contamination=0.08, n_estimators=100)
iso.fit(X)
raw_scores = iso.decision_function(X)`
  },
  behaviour_engine: {
    title: "Time-Series Behaviour Engine",
    category: "Temporal Dynamics & Wearout",
    mlModels: [
      "1st Derivative Velocity (v = Δx/Δt)",
      "2nd Derivative Drift Acceleration (a = d²x/dt²)",
      "Finite Difference Curvature Analysis"
    ],
    backendFile: "backend/timeseries/behaviour.py",
    description: "Computes temporal drift rates and 2nd derivative acceleration to isolate physical wearout mechanisms (Arrhenius diffusion, dielectric breakdown) from stable drift.",
    codeSnippet: `class BehaviourEngine:
    def analyze_component_behaviour(self, comp_features, anomaly_scores):
        accel = row["drift_acceleration"]
        if accel > warning_threshold and drift_rate_24 > 0:
            p_state = "ACCELERATING"`
  },
  fingerprint: {
    title: "Component Behaviour Fingerprint",
    category: "Dynamic State Profiling",
    mlModels: ["State Transition Machine", "Monotonicity Verifier"],
    backendFile: "backend/timeseries/behaviour.py",
    description: "Assigns each component into a physical state profile: NORMAL (homogeneous lot behavior), DRIFTING (linear mild slope), ACCELERATING (impending runaway), or UNSTABLE.",
    codeSnippet: `states = ["NORMAL", "DRIFTING", "ACCELERATING", "UNSTABLE"]
# Safety rule: runaway acceleration triggers immediate triage escalation`
  },
  future_drift: {
    title: "Future Drift AI",
    category: "Prognostic Forecasting & Uncertainty",
    mlModels: [
      "HistGradientBoostingRegressor (Gradient Boosting)",
      "RandomForestRegressor (100 Decision Trees)",
      "Ridge Regression (L2 Regularized)",
      "Physics Log-Time Arrhenius Extrapolation"
    ],
    backendFile: "backend/prediction/forecaster.py",
    description: "Trained on early telemetry (24h/96h) to predict the future 168h end-of-screen parameter value, estimated prediction interval (±1.96σ), and P90 estimated upper bound.",
    codeSnippet: `from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge

model = HistGradientBoostingRegressor(max_iter=150)
model.fit(X_train, y_168h)
predicted_168h = model.predict(X_test)`
  },
  trajectory: {
    title: "Reliability Trajectory",
    category: "Prognostic Degradation Curve",
    mlModels: ["Arrhenius Time-to-Failure Curve", "Datasheet Limit Proximity"],
    backendFile: "backend/prediction/forecaster.py",
    description: "Generates high-precision health trend and future trajectory models comparing actual telemetry curves against official engineering limit lines.",
    codeSnippet: `p90_worst_case = pred_val + (1.282 * comp_std)
distance_to_limit = limit - current_val`
  },
  explainable_ai: {
    title: "Explainable AI & Counterfactuals",
    category: "Interpretability & Sensitivity",
    mlModels: [
      "Shapley-Style Attribution Decomposition",
      "Interactive Counterfactual Sensitivity Simulation"
    ],
    backendFile: "backend/explainability/counterfactual.py",
    description: "Decomposes failure probability into exact contributing factors (drift velocity vs anomaly score vs limit proximity) and performs real-time What-If sensitivity simulation.",
    codeSnippet: `class CounterfactualEngine:
    def simulate_what_if(self, comp_id, param, simulated_drift_rate):
        counterfactual_pred = baseline + (simulated_drift_rate * hours)
        delta = counterfactual_pred - baseline`
  },
  risk_engine: {
    title: "Risk Engine & Safety Enforcement",
    category: "Authoritative Decision Support",
    mlModels: [
      "Calibrated Multi-Factor Probability Fusion",
      "Hard Datasheet Limit Boundary Guard"
    ],
    backendFile: "backend/risk/fusion.py",
    description: "Fuses anomaly severity, drift acceleration, and 168h P90 prognosis into 4 risk tiers: PASS, WATCH, REVIEW, HIGH RISK. If actual measurement exceeds limit, status is unconditionally locked to HIGH RISK.",
    codeSnippet: `class RiskFusionEngine:
    def classify_risk(self, comp, anomaly_score, pred):
        if comp["current_val"] >= limit:
            return "HIGH RISK" # Hard Safety Override`
  },
  outputs: {
    title: "Triple Diagnostic Outputs",
    category: "Engineering Decision Outputs",
    mlModels: ["Lot-Wide Batch Clustering", "Priority Queue Optimizer"],
    backendFile: "backend/core/orchestrator.py",
    description: "Generates three unified screening artifacts: Component Health (individual diagnostic telemetry), Lot Health (batch-wide wafer flaws), and Inspection Priority (triaged QA queue).",
    codeSnippet: `lot_summary = evaluate_lot_wide_patterns(components)
inspection_queue = rank_by_severity(components)`
  },
  dashboard: {
    title: "QA Engineering Dashboard",
    category: "Human-in-the-Loop Decision Console",
    mlModels: ["SHA-256 Tamper-Evident Ledger", "AEC-Q001 Sign-off Protocol"],
    backendFile: "backend/main.py",
    description: "Authoritative decision console enabling QA and reliability engineers to review statistical evidence, simulate What-If scenarios, and commit binding digital signoffs.",
    codeSnippet: `@app.post("/api/components/{id}/decision")
def commit_disposition(decision: str, signature: str):
    log_audit("QA_DISPOSITION_COMMITTED", target_id=id)`
  }
};

export function ArchitectureFlowchart() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const activeDetail = selectedNode ? STAGE_DETAILS[selectedNode] : null;

  return (
    <div style={{ marginTop: "10px" }}>
      {/* Visual Flowchart Canvas */}
      <div className="flowchart-container">

        {/* 1. BURN-IN / ESS TEST SOURCES */}
        <div
          className="flowchart-node theme-blue"
          onClick={() => setSelectedNode("sources")}
          title="Click to inspect ML telemetry ingestion"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">🏭 BURN-IN / ESS TEST SOURCES</span>
            <span className="card-badge" style={{ background: "#2563EB", color: "#FFFFFF" }}>INGESTION</span>
          </div>
          <div className="flowchart-node-body flowchart-stage1-body">
            <ul className="flowchart-bullets">
              <li>Automated Test Equipment (ATE)</li>
              <li>Burn-In Test Systems (Thermal Chambers)</li>
              <li>Environmental Stress Testing (ESS)</li>
              <li>Electrical Parametric Measurement Systems</li>
              <li>Historical QA / Test Records</li>
            </ul>
            <div className="flowchart-node-status">
              <span className="badge badge-pass" style={{ fontSize: "11px" }}>Active Stream</span>
              <div className="flowchart-hint-text">Click to view code</div>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 2. COMPONENT TEST DATA */}
        <div
          className="flowchart-node theme-cyan"
          onClick={() => setSelectedNode("test_data")}
          title="Click to view temporal test gates"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">💾 COMPONENT TEST DATA</span>
            <span className="card-badge" style={{ background: "#06B6D4", color: "#FFFFFF" }}>4 GATES</span>
          </div>
          <div className="flowchart-node-body flowchart-testdata-body">
            <span className="flowchart-subheading">
              Multi-channel parametric burn-in telemetry:
            </span>
            <div className="timeline-pills">
              <span className="timeline-pill active">0h (Baseline)</span>
              <span className="timeline-pill active">24h (Gate 1)</span>
              <span className="timeline-pill active">96h (Gate 2)</span>
              <span className="timeline-pill active">168h (Qualification)</span>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 3. DATA QUALITY ENGINE */}
        <div
          className="flowchart-node theme-purple"
          onClick={() => setSelectedNode("data_quality")}
          title="Click to view sensor validation"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">⚙️ DATA QUALITY ENGINE</span>
            <span className="card-badge" style={{ background: "#7C3AED", color: "#FFFFFF" }}>VALIDATED</span>
          </div>
          <div className="flowchart-node-body">
            <div className="flowchart-quality-grid">
              <div className="quality-item">• Missing Data Check (0 missing)</div>
              <div className="quality-item">• 5x IQR Noise Filter</div>
              <div className="quality-item">• Scale & Normalization</div>
              <div className="quality-item">• Continuity Validation</div>
              <div className="quality-item">• Sensor Stuck Detection</div>
              <div className="quality-item">• Outlier Pre-Screening</div>
            </div>
          </div>
        </div>

        {/* Connector with Split */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 4. DUAL ENGINES (Side by Side) */}
        <div className="flowchart-grid-2">
          {/* Left: LOT-RELATIVE ANOMALY ENGINE */}
          <div
            className="flowchart-node theme-green"
            onClick={() => setSelectedNode("anomaly_engine")}
            title="Click to inspect 4 Anomaly ML models"
          >
            <div className="flowchart-node-header">
              <span className="flowchart-node-title">📊 LOT-RELATIVE ANOMALY ENGINE</span>
              <span className="card-badge" style={{ background: "#059669", color: "#FFFFFF" }}>4 ML DETECTORS</span>
            </div>
            <div className="flowchart-node-body">
              <ul className="flowchart-bullets">
                <li><strong>Z-Score / DPAT</strong> (AEC-Q001 Standard)</li>
                <li><strong>Isolation Forest</strong> (Scikit-Learn, 100 Trees)</li>
                <li><strong>LOF / Mahalanobis</strong> (MinCovDet)</li>
                <li><strong>Multivariate Ensemble</strong> (Calibrated [0, 1])</li>
              </ul>
            </div>
          </div>

          {/* Mobile-only connector between stacked dual cards */}
          <div className="flowchart-connector-v flowchart-mobile-connector">
            <div className="flowchart-line-v"></div>
            <div className="flowchart-arrow-down"></div>
          </div>

          {/* Right: TIME-SERIES BEHAVIOUR ENGINE */}
          <div
            className="flowchart-node theme-rose"
            onClick={() => setSelectedNode("behaviour_engine")}
            title="Click to inspect temporal acceleration engine"
          >
            <div className="flowchart-node-header">
              <span className="flowchart-node-title">📈 TIME-SERIES BEHAVIOUR ENGINE</span>
              <span className="card-badge" style={{ background: "#E11D48", color: "#FFFFFF" }}>TEMPORAL</span>
            </div>
            <div className="flowchart-node-body">
              <ul className="flowchart-bullets">
                <li><strong>Drift Velocity</strong> (v = Δx/Δt)</li>
                <li><strong>Drift Rate</strong> (% change per 24h)</li>
                <li><strong>Drift Acceleration</strong> (a = d²x/dt²)</li>
                <li><strong>State Transition</strong> (Runaway Wearout)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 5. COMPONENT BEHAVIOUR FINGERPRINT */}
        <div
          className="flowchart-node theme-amber"
          onClick={() => setSelectedNode("fingerprint")}
          title="Click to inspect fingerprint classification"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">🧬 COMPONENT BEHAVIOUR FINGERPRINT</span>
            <span className="card-badge" style={{ background: "#D97706", color: "#FFFFFF" }}>PHYSICAL STATE</span>
          </div>
          <div className="flowchart-node-body">
            <div className="flowchart-fingerprint-flow">
              <span className="badge badge-state-normal" style={{ padding: "6px 14px", fontSize: "12px" }}>NORMAL (PASS)</span>
              <span className="flowchart-flow-arrow">→</span>
              <span className="badge badge-state-drifting" style={{ padding: "6px 14px", fontSize: "12px" }}>DRIFTING (WATCH)</span>
              <span className="flowchart-flow-arrow">→</span>
              <span className="badge badge-state-accel" style={{ padding: "6px 14px", fontSize: "12px" }}>ACCELERATING (REVIEW)</span>
              <span className="flowchart-flow-arrow">→</span>
              <span className="badge badge-state-unstable" style={{ padding: "6px 14px", fontSize: "12px" }}>UNSTABLE (HIGH RISK)</span>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 6. FUTURE DRIFT AI */}
        <div
          className="flowchart-node theme-blue"
          onClick={() => setSelectedNode("future_drift")}
          title="Click to inspect 4 Predictive ML models"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">🤖 FUTURE DRIFT AI (168h FORECAST)</span>
            <span className="card-badge" style={{ background: "#1D4ED8", color: "#FFFFFF" }}>MODEL LADDER</span>
          </div>
          <div className="flowchart-node-body flowchart-future-drift-body">
            <ul className="flowchart-bullets">
              <li><strong>Early Readings:</strong> Ingests 0h, 24h, 96h telemetry</li>
              <li><strong>168h Prediction:</strong> HistGradientBoosting + Random Forest + Ridge</li>
              <li><strong>Physics Baseline:</strong> Arrhenius Log-Time Wearout Model</li>
              <li><strong>Uncertainty Quantification:</strong> Estimated Prediction Interval (±1.96σ) & P90 Estimated Upper Bound</li>
            </ul>
            <div className="flowchart-horizon-box">
              <div className="flowchart-horizon-val">168h</div>
              <div className="flowchart-horizon-lbl">Prognostic Horizon</div>
            </div>
          </div>
        </div>

        {/* Connector with Split */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 7. DUAL INSIGHTS (Side by Side) */}
        <div className="flowchart-grid-2">
          {/* Left: RELIABILITY TRAJECTORY */}
          <div
            className="flowchart-node theme-purple"
            onClick={() => setSelectedNode("trajectory")}
            title="Click to inspect trajectory curves"
          >
            <div className="flowchart-node-header">
              <span className="flowchart-node-title">📈 RELIABILITY TRAJECTORY</span>
              <span className="card-badge" style={{ background: "#6D28D9", color: "#FFFFFF" }}>PROGNOSTICS</span>
            </div>
            <div className="flowchart-node-body">
              <ul className="flowchart-bullets">
                <li>Health Trend (0h–96h Actuals)</li>
                <li>Future Prognostic Trend (96h–168h)</li>
                <li>Non-Linear Degradation Curvature</li>
                <li>Datasheet Spec Limit Threshold</li>
              </ul>
            </div>
          </div>

          {/* Mobile-only connector between stacked dual cards */}
          <div className="flowchart-connector-v flowchart-mobile-connector">
            <div className="flowchart-line-v"></div>
            <div className="flowchart-arrow-down"></div>
          </div>

          {/* Right: EXPLAINABLE AI */}
          <div
            className="flowchart-node theme-green"
            onClick={() => setSelectedNode("explainable_ai")}
            title="Click to inspect counterfactual simulator"
          >
            <div className="flowchart-node-header">
              <span className="flowchart-node-title">💡 EXPLAINABLE AI (XAI)</span>
              <span className="card-badge" style={{ background: "#047857", color: "#FFFFFF" }}>ATTRIBUTION</span>
            </div>
            <div className="flowchart-node-body">
              <ul className="flowchart-bullets">
                <li><strong>Why risky?</strong> Natural Language Verdict</li>
                <li><strong>What changed?</strong> Parametric Deviation</li>
                <li><strong>Key contributors?</strong> Shapley-Style Ratios</li>
                <li><strong>What-If Simulator?</strong> Real-Time Counterfactuals</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 8. RISK ENGINE */}
        <div
          className="flowchart-node theme-orange"
          onClick={() => setSelectedNode("risk_engine")}
          title="Click to inspect risk fusion & safety boundary"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">🛡️ RISK ENGINE & SAFETY ENFORCEMENT</span>
            <span className="card-badge" style={{ background: "#C2410C", color: "#FFFFFF" }}>SAFETY BOUNDARY</span>
          </div>
          <div className="flowchart-node-body flowchart-risk-body">
            <ul className="flowchart-bullets">
              <li>Anomaly Score + Drift Acceleration + 168h Prediction + Confidence Bounds</li>
              <li>Multi-Detector Evidence Calibration & Component Behaviour State</li>
              <li><strong>Safety Boundary Rule:</strong> Limit breach unconditionally locks status to <strong>HIGH RISK</strong></li>
            </ul>
            <div className="flowchart-risk-badges">
              <span className="badge badge-pass">PASS</span>
              <span className="badge badge-watch">WATCH</span>
              <span className="badge badge-review">REVIEW</span>
              <span className="badge badge-risk">HIGH RISK</span>
            </div>
          </div>
        </div>

        {/* Connector with Triple Split */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 9. TRIPLE OUTPUTS */}
        <div className="flowchart-grid-3">
          <div
            className="flowchart-node theme-blue"
            onClick={() => setSelectedNode("outputs")}
            title="Click to inspect Component Health"
          >
            <div className="flowchart-node-header flowchart-output-header">
              <span className="flowchart-node-title">🔍 COMPONENT HEALTH</span>
            </div>
            <div className="flowchart-node-body flowchart-output-body">
              <div className="flowchart-output-desc">
                Individual flight-unit telemetry, multi-parameter degradation, and pass/fail diagnostics.
              </div>
            </div>
          </div>

          {/* Mobile-only connector between stacked triple cards */}
          <div className="flowchart-connector-v flowchart-mobile-connector">
            <div className="flowchart-line-v"></div>
            <div className="flowchart-arrow-down"></div>
          </div>

          <div
            className="flowchart-node theme-rose"
            onClick={() => setSelectedNode("outputs")}
            title="Click to inspect Lot Health"
          >
            <div className="flowchart-node-header flowchart-output-header">
              <span className="flowchart-node-title">📦 LOT HEALTH</span>
            </div>
            <div className="flowchart-node-body flowchart-output-body">
              <div className="flowchart-output-desc">
                Wafer-level clustering to isolate batch manufacturing flaws from individual unit wearout.
              </div>
            </div>
          </div>

          {/* Mobile-only connector between stacked triple cards */}
          <div className="flowchart-connector-v flowchart-mobile-connector">
            <div className="flowchart-line-v"></div>
            <div className="flowchart-arrow-down"></div>
          </div>

          <div
            className="flowchart-node theme-green"
            onClick={() => setSelectedNode("outputs")}
            title="Click to inspect Inspection Priority"
          >
            <div className="flowchart-node-header flowchart-output-header">
              <span className="flowchart-node-title">📋 INSPECTION PRIORITY</span>
            </div>
            <div className="flowchart-node-body flowchart-output-body">
              <div className="flowchart-output-desc">
                Triage queue ranked #1 to #N prioritizing high-risk components for physical engineer FA.
              </div>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flowchart-connector-v">
          <div className="flowchart-line-v"></div>
          <div className="flowchart-arrow-down"></div>
        </div>

        {/* 10. QA DASHBOARD */}
        <div
          className="flowchart-node theme-slate"
          onClick={() => setSelectedNode("dashboard")}
          title="Click to inspect QA Dashboard"
        >
          <div className="flowchart-node-header">
            <span className="flowchart-node-title">💻 QA ENGINEERING DECISION DASHBOARD</span>
            <span className="card-badge" style={{ background: "#0F172A", color: "#FFFFFF" }}>AUTHORITATIVE CONSOLE</span>
          </div>
          <div className="flowchart-node-body flowchart-dashboard-body">
            <div className="flowchart-dashboard-left">
              <strong className="flowchart-dashboard-heading">Comprehensive Flight Intelligence:</strong>
              <ul className="flowchart-bullets" style={{ marginTop: "6px" }}>
                <li>Reliability Profile & Historical Trajectory</li>
                <li>168h Trend & Physics Prognostic Forecast</li>
                <li>Explainable AI Evidence Attribution</li>
                <li>Lot Health & Batch Wafer Analysis</li>
                <li>Inspection Priority Queue & QA Signoff</li>
              </ul>
            </div>

            <div className="flowchart-dashboard-right">
              <div className="flowchart-dashboard-badges">
                <span className="badge badge-pass">NORMAL</span>
                <span className="badge badge-watch">WATCH</span>
                <span className="badge badge-review">REVIEW</span>
                <span className="badge badge-risk">HIGH RISK</span>
              </div>
              <div className="flowchart-ledger-tag">
                SHA-256 Tamper-Evident Ledger Verified
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Code / ML Inspection Modal */}
      {activeDetail && (
        <div className="code-drawer-modal" onClick={() => setSelectedNode(null)}>
          <div className="code-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">🤖 {activeDetail.title}</span>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {activeDetail.category} · Backend Engine: <code>{activeDetail.backendFile}</code>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedNode(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: "20px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-sub)", lineHeight: 1.5, marginBottom: "14px" }}>
                {activeDetail.description}
              </p>

              <div style={{ marginBottom: "14px" }}>
                <strong style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Active Machine Learning & Statistical Models:
                </strong>
                <ul style={{ margin: "6px 0 0 18px", fontSize: "12.5px", color: "var(--text-main)" }}>
                  {activeDetail.mlModels.map((m, idx) => (
                    <li key={idx} style={{ marginBottom: "3px" }}>{m}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Real Python Backend Execution Code:
                </strong>
                <pre style={{
                  background: "#0F172A",
                  color: "#38BDF8",
                  padding: "14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  overflowX: "auto",
                  marginTop: "6px",
                  fontFamily: "Consolas, Monaco, monospace"
                }}>
                  {activeDetail.codeSnippet}
                </pre>
              </div>

              <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedNode(null)}>
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
