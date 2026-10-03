# ReliabilityX — Predictive Component Reliability Intelligence

> **SIH26170:** AI-Driven Anomaly Detection in Component Burn-In & Environmental Stress Screening (ESS)  
> **Domain:** High-Reliability Aerospace, Satellite Payloads, Defense Electronics, ISRO/MIL-STD Qualification

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Overview

**ReliabilityX** is an end-to-end, physics-informed, artificial-intelligence-driven reliability intelligence platform engineered to revolutionize semiconductor screening during **Burn-In** and **Environmental Stress Screening (ESS)**.

In mission-critical aerospace and satellite systems, electronic component failure during an active orbital mission is catastrophic. Historically, semiconductor flight lots undergo accelerated thermal-electrical screening (168 hours at 125°C under rated voltage). Traditional qualification relies entirely on static post-test limit checks: if parameters remain within datasheet boundaries at test gates (0h, 24h, 96h, 168h), the unit is certified as flight-ready.

Modern sub-micron failure mechanisms (TDDB, HCI, NBTI, electromigration) frequently exhibit **non-linear, super-linear, or runaway degradation dynamics** with positive second-derivative acceleration ($\frac{d^2x}{dt^2} > 0$). These latent wearout defects remain below official limits at 96 hours but accelerate exponentially to catastrophic failure during orbital deployment.

**ReliabilityX** replaces blunt post-hoc testing with **predictive, physics-informed degradation intelligence**, providing early warnings as early as **24h** and confirmed by **96h**, long before hard limits are breached.

---

## 2. Core Capabilities

### 🔬 Physics-Informed Machine Learning & Ensembles
- **Arrhenius Reaction Kinetics:** Extrapolates thermal acceleration across operational temperatures ($E_a = 0.7\text{ eV}$).
- **Ensemble Anomaly Engine:** Combines Isolation Forest, Local Outlier Factor (LOF), and dynamic statistical Z-Score / IQR filtering.
- **Parametric Extrapolation:** 168-hour forecast with $\pm 1.96\sigma$ estimated prediction intervals and $\text{P}_{90}$ upper risk bounds.
- **Dynamic Part Average Testing (DPAT):** Evaluates component deviation relative to lot distributions.

### ⚡ Real-Time Telemetry Stream Ingestion Engine
- High-throughput WebSocket stream (`ws://localhost:8000/ws/live`) with sub-50ms latency.
- Pluggable hardware connector abstraction for automated test equipment (ATE) and environmental chambers.
- Real-time backpressure handling, spike filtering ($5\times \text{IQR}$), frozen sensor detection, and malformed packet rejection.

### 🎛️ Counterfactual Sensitivity Simulator & Explainability
- In-browser What-If drift sensitivity simulator for real-time counterfactual analysis.
- Shapley-style factor attribution percentages and human-readable engineering verdicts explaining root causes.

### 🛡️ Aerospace Traceability & Audit Ledger
- Immutable SHA-256 tamper-evident engineering audit log.
- Formal sign-off and review protocol for quality assurance (QA) engineers.
- Automated generation of Aerospace QA Screening Certificates (HTML/PDF) and full telemetry CSV exports.

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
# 1. Run End-to-End Workflow & QA Decision Verification
python backend/tests/verify_end_to_end.py

# 2. Run Live Telemetry Stream & Hardening Pipeline Verification
python backend/tests/verify_live_stream_pipeline.py

# 3. Run Security & Upload Ingestion Tests
python backend/tests/verify_security_upload.py
```

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
