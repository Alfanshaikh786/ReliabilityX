# ReliabilityX — Predictive Component Reliability Intelligence

> **SIH26170:** AI-Driven Anomaly Detection in Component Burn-In & Environmental Stress Screening (ESS)  
> **Domain:** High-Reliability Electronic Component Burn-In & ESS Screening

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### ⚠️ System Positioning & Engineering Disclaimer
**ReliabilityX** is positioned as an **AI-assisted early anomaly detection, degradation analysis, and predictive reliability decision support prototype for high-reliability electronic component Burn-In and ESS screening**.
- **Prototype Status:** Decision-support prototype; not an ISRO-certified system, not aerospace certified, and not flight qualified.
- **Standards:** Not a replacement for mandatory qualification or screening standards (MIL-STD-883, AEC-Q001, JEDEC).
- **Failure Predictions:** Statistical projections under model assumptions; not a guaranteed physical failure predictor or zero-defect guarantee.
- **Prediction Uncertainty:** 95% nominal split-conformal prediction intervals with finite-sample marginal coverage under the exchangeability assumption. On the synthetic LOLO benchmark, empirical coverage was 95.96% ± 1.05% across five seeds (per-lot: LOT-A 98.6%, LOT-B 94.2%, LOT-C 96.0%, LOT-D 94.8%, LOT-E 96.2%). Standard exchangeability cannot be established for the current temporally dependent synthetic benchmark; therefore these results are reported as empirical benchmark coverage rather than a universal physical guarantee.
- **Safety Margin Disclosure:** The 0.80 safety-margin factor is a configurable ReliabilityX engineering heuristic used to provide an internal safety buffer. It is not an official SIH26170 or ISRO threshold.
- **Hardware & Production Status:** Production-pipeline and cold-start parity validated: YES. Production deployment validation: NO. Real physical hardware validation status is UNVALIDATED (`REAL_HARDWARE_VALIDATED = False`). Connectors provide an explicit hardware abstraction layer; not physically connected to live chamber ATE hardware.
- **Final Authority:** Human QA / Reliability Engineering remains the final authority for all lot disposition decisions.

---

## 1. Overview

**ReliabilityX** is an end-to-end, physics-informed, artificial-intelligence-driven reliability intelligence platform designed to complement semiconductor screening during **Burn-In** and **Environmental Stress Screening (ESS)**.

In mission-critical aerospace and satellite systems, electronic component failure during an active orbital mission is catastrophic. Historically, semiconductor lots undergo accelerated thermal-electrical screening (168 hours at 125°C under rated voltage). Traditional qualification relies entirely on static post-test limit checks: if parameters remain within datasheet boundaries at test gates (0h, 24h, 96h, 168h), the unit passes static screening.

Modern sub-micron failure mechanisms (TDDB, HCI, NBTI, electromigration) frequently exhibit **non-linear, super-linear, or runaway degradation dynamics** with positive second-derivative acceleration ($\frac{d^2x}{dt^2} > 0$). These latent wearout defects remain below official limits at 96 hours but accelerate exponentially toward boundary breach.

**ReliabilityX** complements blunt post-hoc testing with **predictive, physics-informed degradation intelligence**. In this synthetic benchmark, degradation cases were flagged at the 24h observation stage, corresponding to a simulated maximum early-warning horizon of 144h before the 168h endpoint.

```
             BURN-IN / ESS TELEMETRY
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       MODULE A             MODULE B
 Dynamic Outlier          168h Predictor
 Detection                    │
              │               │
              │          Value 0h
              │          Value 24h
              │               │
              │               ▼
              │        ┌─────────────┐
              │        │ ML Forecast │
              │        └──────┬──────┘
              │               │
              │               ▼
              │        PREDICTED VALUE
              │             @ 168h
              │               │
              │               ▼
              │        Drift Rate @168h
              │               │
              └───────┬───────┘
                      ▼
              RISK / EVIDENCE FUSION
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
      LOT ANOMALY   DRIFT       SENSOR/
                               SYSTEM ISSUE
                      │
                      ▼
             ENGINEERING REVIEW
```

---

## 2. Core Capabilities

### 🔬 Physics-Informed Machine Learning & Ensembles
- **Arrhenius Reaction Kinetics:** Extrapolates thermal acceleration across operational temperatures ($E_a = 0.7\text{ eV}$).
- **Ensemble Anomaly Engine:** Combines Isolation Forest, Local Outlier Factor (LOF), and dynamic statistical Z-Score / IQR filtering.
- **Parametric Extrapolation:** 168-hour forecast with 95% nominal split-conformal prediction intervals and $\text{P}_{90}$ upper risk bounds.
- **Dynamic Part Average Testing (DPAT):** AEC-Q001-referenced robust statistical screening evaluating component deviation relative to lot distributions.

### ⚡ Real-Time Telemetry Stream Ingestion Engine
- High-throughput WebSocket stream (`ws://localhost:8000/ws/live`) with sub-50ms latency.
- Pluggable hardware connector abstraction for automated test equipment (ATE) and environmental chambers.
- Real-time backpressure handling, spike filtering ($5\times \text{IQR}$), frozen sensor detection, and malformed packet rejection.

### 🎛️ Counterfactual Sensitivity Simulator & Explainability
- In-browser What-If drift sensitivity simulator for real-time counterfactual analysis.
- Shapley-style factor attribution percentages and human-readable engineering verdicts explaining root causes.

### 🛡️ Aerospace Traceability & Audit Ledger
- Append-oriented SHA-256 tamper-evident engineering audit log with cryptographic provenance.
- Formal sign-off and review protocol for quality assurance (QA) engineers.
- Automated generation of AEC-Q001-Referenced Statistical Screening Analysis Reports (HTML/PDF) and full telemetry CSV exports.

### 📱 Responsive & Touch-First Experience
- **Responsive Architecture:** Desktop (1440×900, 1920×1080), Tablet (768×1024), Mobile Web, and Android App viewports.
- **Scroll-Reveal Motion:** Fluid section-sliding animations ($26\text{px}$ desktop, $12\text{px}$ mobile) powered by `IntersectionObserver` at 60 FPS.
- **Dedicated Dual Intros:** Desktop Website intro video alongside a dedicated Mobile App launch splash animation with synchronized audio.

---

## 3. Technology Stack

- **Backend:** Python 3.10+, FastAPI, Uvicorn, WebSockets, Pydantic v2
- **Data & Physics ML:** NumPy, SciPy, Pandas, Scikit-learn
- **Database:** SQLite (WAL mode, auto-migrating and auto-seeding)
- **Frontend:** React 18, TypeScript, Vanilla CSS (Aerospace Dark Glassmorphism, Zero External Heavy CSS Frameworks)
- **Build System:** Offline Babel/CJS bundler (`frontend/build.cjs`)

---

## 4. Quickstart & Installation

### Prerequisites
- Python 3.10+
- Node.js (for compiling the frontend React bundle)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Alfanshaikh786/ReliabilityX.git
cd ReliabilityX
```

### 2. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 3. Build Frontend Bundle
```bash
node frontend/build.cjs
```

### 4. Run Development / Production Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser at:
- **Desktop Web:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Mobile Mode:** [http://127.0.0.1:8000/?platform=mobile](http://127.0.0.1:8000/?platform=mobile)

---

## 5. Verification & Test Suite

ReliabilityX includes an extensive automated verification suite validating all pipelines, security controls, and end-to-end workflows:

```bash
# 1. Run Complete Final Scientific Hardening Suite (26/26 tests)
python -m backend.tests.test_final_hardening

# 2. Run Upgrade Validation Suite (13/13 tests)
python -m backend.tests.test_upgrade_validation

# 3. Run Leave-One-Lot-Out (LOLO) Audit & Confusion Matrix Verification
python backend/tests/run_lolo_audit.py

# 4. Run Security & Upload Ingestion Tests (6/6 tests)
python backend/tests/verify_security_upload.py

# 5. Run Production Parity Cold-Start Verification
python backend/tests/verify_production_pipeline.py
```

Detailed metrics, per-lot confusion matrices, and scientific disclosures are documented in [`REPORT X.md`](REPORT%20X.md).


---

## 6. Project Architecture

```
ReliabilityX/
├── backend/
│   ├── anomaly/              # LOF, Isolation Forest, Ensemble models
│   ├── core/                 # Config, SQLite DB, Pipeline Orchestrator
│   ├── data/                 # Benchmark generator & parametric validators
│   ├── explainability/       # Attribution & counterfactual What-If engine
│   ├── features/             # Non-linear drift & second-derivative extractors
│   ├── ingestion/            # Live telemetry stream manager & connectors
│   ├── prediction/           # Physics Arrhenius + Polynomial regression
│   ├── risk/                 # DPAT & multi-tier risk classification engine
│   ├── tests/                # Automated verification suites
│   ├── timeseries/           # Temporal alignment & windowed models
│   └── main.py               # FastAPI application, WebSockets & REST routes
├── frontend/
│   ├── src/                  # TypeScript types & API client
│   ├── static/               # Assets, icons, videos, compiled bundle & CSS
│   │   ├── components/       # Modular React 18 UI components
│   │   ├── app.tsx           # Application root & scroll-reveal engine
│   │   ├── style.css         # Responsive styling & hardware-accelerated motion
│   │   └── app.bundle.js     # Bundled application
│   ├── build.cjs             # Multi-module offline compiler
│   └── index.html            # Production HTML entry point
├── requirements.txt          # Python package requirements
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation
```

---

## 7. License

Distributed under the MIT License. See `LICENSE` for more information.
