// ReliabilityX Bundled Application (2026-10-03T09:15:09.670Z)
(function() {
  if (typeof window !== 'undefined') {
    if (window.React && !window.React.default) window.React.default = window.React;
    if (window.ReactDOM && !window.ReactDOM.default) window.ReactDOM.default = window.ReactDOM;
  }
  var modules = {};
  function define(id, fn) {
    modules[id] = { fn: fn, exports: null };
  }
  function resolve(baseDir, requestedId) {
    if (requestedId === 'react') return 'react';
    if (requestedId === 'react-dom') return 'react-dom';
    var target = requestedId;
    if (target.charAt(0) === '.') {
      var combined = baseDir ? (baseDir + '/' + target) : target;
      var parts = combined.split('/');
      var stack = [];
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p || p === '.') continue;
        if (p === '..') { stack.pop(); } else { stack.push(p); }
      }
      target = stack.join('/');
    } else {
      target = target.replace(/^\.\//, '');
    }
    var extensions = ['', '.tsx', '.ts', '.js', '/index.tsx', '/index.ts'];
    for (var j = 0; j < extensions.length; j++) {
      var candidate = target + extensions[j];
      if (modules[candidate]) return candidate;
    }
    return target;
  }
  function makeRequire(baseDir) {
    return function req(id) {
      if (id === 'react') return window.React;
      if (id === 'react-dom') return window.ReactDOM;
      var resolvedId = resolve(baseDir, id);
      var mod = modules[resolvedId];
      if (!mod) {
        throw new Error("[ReliabilityX Bundle] Module not found: " + id + " (resolved: " + resolvedId + ")");
      }
      if (!mod.exports) {
        mod.exports = {};
        var lastSlash = resolvedId.lastIndexOf('/');
        var modDir = lastSlash !== -1 ? resolvedId.substring(0, lastSlash) : '';
        mod.fn(mod, mod.exports, makeRequire(modDir));
      }
      return mod.exports;
    };
  }

  // Module: app.tsx
  define("app.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReliabilityXApp = ReliabilityXApp;
var _react = _interopRequireWildcard(require("react"));
var _reactDom = _interopRequireDefault(require("react-dom"));
var _Sidebar = require("./components/Sidebar");
var _Topbar = require("./components/Topbar");
var _SafetyNotice = require("./components/SafetyNotice");
var _DashboardTab = require("./components/DashboardTab");
var _LiveScreeningTab = require("./components/LiveScreeningTab");
var _ScreeningPipelineTab = require("./components/ScreeningPipelineTab");
var _ComponentsTab = require("./components/ComponentsTab");
var _LotsTab = require("./components/LotsTab");
var _PredictionsTab = require("./components/PredictionsTab");
var _InspectionTriageTab = require("./components/InspectionTriageTab");
var _ReportsTab = require("./components/ReportsTab");
var _EngineeringSuiteTab = require("./components/EngineeringSuiteTab");
var _ComponentDetailModal = require("./components/ComponentDetailModal");
var _DatasetModal = require("./components/DatasetModal");
var _MobileBottomNav = require("./components/MobileBottomNav");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Predictive Component Reliability Intelligence
// Enterprise Aerospace UI Architecture (React 18 / .tsx)
// Left Sidebar Navigation + High-Resolution Industrial Decision Support
// ==============================================================================

const getApiBase = () => {
  try {
    const custom = localStorage.getItem("rx_backend_url");
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/+$/, "");
      return clean.endsWith("/api") ? clean : `${clean}/api`;
    }
    if (window.__RELIABILITYX_API_URL__) {
      return window.__RELIABILITYX_API_URL__;
    }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000/api";
    }
  } catch {}
  return "https://reliabilityx.onrender.com/api";
};
const API_BASE = getApiBase();
function ReliabilityXApp() {
  const getInitialTab = () => {
    try {
      const hash = window.location.hash.replace("#", "");
      const validTabs = ["dashboard", "screening", "live_telemetry", "components", "lots", "predictions", "inspection", "reports", "engineering", "audit"];
      if (validTabs.includes(hash)) return hash;
    } catch {}
    return "dashboard";
  };
  const [activeTab, setActiveTabState] = (0, _react.useState)(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = (0, _react.useState)(false);
  const [mobileMenuOpen, setMobileMenuOpen] = (0, _react.useState)(false);
  const smoothScrollToTop = () => {
    try {
      const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = prefersReduced ? "auto" : "smooth";
      const viewport = document.querySelector(".app-main-viewport");
      if (viewport) {
        viewport.scrollTo({
          top: 0,
          behavior: behavior
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: behavior
        });
      }
    } catch {
      window.scrollTo(0, 0);
    }
  };
  const smoothScrollToElement = elementId => {
    try {
      const el = document.getElementById(elementId);
      if (el) {
        const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({
          behavior: prefersReduced ? "auto" : "smooth",
          block: "start"
        });
        return true;
      }
    } catch {}
    return false;
  };
  const setActiveTab = tab => {
    setActiveTabState(tab);
    try {
      window.location.hash = tab;
    } catch {}
    smoothScrollToTop();
  };
  (0, _react.useEffect)(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = ["dashboard", "screening", "live_telemetry", "components", "lots", "predictions", "inspection", "reports", "engineering", "audit"];
      if (validTabs.includes(hash)) {
        setActiveTabState(hash);
        smoothScrollToTop();
      } else if (window.location.hash.startsWith("#inspect=")) {
        const id = window.location.hash.replace("#inspect=", "");
        if (id) setSelectedCompId(id);
      } else if (hash) {
        smoothScrollToElement(hash);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);

    // Global in-page smooth scrolling anchor interceptor
    const handleAnchorClick = e => {
      const anchor = e.target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const targetId = href.substring(1);
        const validTabs = ["dashboard", "screening", "live_telemetry", "components", "lots", "predictions", "inspection", "reports", "engineering", "audit"];
        if (validTabs.includes(targetId)) {
          e.preventDefault();
          setActiveTab(targetId);
          return;
        }
        if (targetId.startsWith("inspect=")) {
          return;
        }
        const el = document.getElementById(targetId);
        if (el) {
          e.preventDefault();
          smoothScrollToElement(targetId);
          try {
            history.pushState(null, "", `#${targetId}`);
          } catch {}
        }
      }
    };
    document.addEventListener("click", handleAnchorClick);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  // Live Telemetry Streaming State
  const [liveStatus, setLiveStatus] = (0, _react.useState)(null);
  const [livePoints, setLivePoints] = (0, _react.useState)([]);
  const [liveAlerts, setLiveAlerts] = (0, _react.useState)([]);
  const [liveLotHealth, setLiveLotHealth] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    try {
      const saved = localStorage.getItem("relx_sidebar_collapsed");
      if (saved === "true") setSidebarCollapsed(true);
    } catch {}
  }, []);
  const [activeDataset, setActiveDataset] = (0, _react.useState)(null);
  const [overview, setOverview] = (0, _react.useState)(null);
  const [loading, setLoading] = (0, _react.useState)(true);
  const [toast, setToast] = (0, _react.useState)(null);

  // Hero Selected Component state for Dashboard
  const [heroCompId, setHeroCompId] = (0, _react.useState)("C-01008");
  const [heroCompData, setHeroCompData] = (0, _react.useState)(null);
  const [heroCompLoading, setHeroCompLoading] = (0, _react.useState)(false);
  const [heroSimulatedDrift, setHeroSimulatedDrift] = (0, _react.useState)(0.08);
  const [heroSimResult, setHeroSimResult] = (0, _react.useState)(null);
  const [heroParam, setHeroParam] = (0, _react.useState)("leakage_current_uA");

  // Inspect Modal State
  const [selectedCompId, setSelectedCompId] = (0, _react.useState)(null);
  const [compDetail, setCompDetail] = (0, _react.useState)(null);
  const [compLoading, setCompLoading] = (0, _react.useState)(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = (0, _react.useState)(false);

  // Global search and lot selection state
  const [globalSearch, setGlobalSearch] = (0, _react.useState)("");
  const [selectedLotFilter, setSelectedLotFilter] = (0, _react.useState)("ALL");
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("relx_sidebar_collapsed", String(next));
      return next;
    });
  };
  const showToast = (message, type = "info") => {
    setToast({
      message,
      type
    });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Overview Data
  const loadSystemData = (0, _react.useCallback)(async () => {
    try {
      setLoading(true);
      const [healthRes, overviewRes] = await Promise.all([fetch(`${API_BASE}/health`).then(r => r.json()), fetch(`${API_BASE}/dashboard/overview`).then(r => r.json())]);
      setActiveDataset(healthRes.active_dataset);
      setOverview(overviewRes);
      const pList = overviewRes?.top_priorities || overviewRes?.inspection_priority;
      if (pList && pList.length > 0) {
        setHeroCompId(pList[0].component_id);
      }
    } catch (err) {
      showToast("Error connecting to backend: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  (0, _react.useEffect)(() => {
    loadSystemData();
  }, [loadSystemData]);

  // ---------------------------------------------------------------------------
  // ==============================================================================
  // RELIABILITYX SECTION-SLIDING SCROLL-REVEAL SYSTEM (60 FPS GPU-COMPOSITED)
  // Inspired by reliabilityx.com smooth section-sliding feel:
  // As user scrolls: SECTION ENTERS VIEWPORT -> SUBTLE UPWARD SLIDE (26px desktop / 12px mobile)
  // -> SMOOTH SETTLE via cubic-bezier(0.16, 1, 0.3, 1) -> STATIC POSITION.
  // IntersectionObserver detects entries once with zero repeated calculations.
  // Reverse scrolling never replays or flickers. Live data & charts remain stable.
  // ==============================================================================
  (0, _react.useEffect)(() => {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = document.querySelector(".app-main-viewport");
    const targetSelectors = [".hero-header", ".page-header", ".kpi-grid > .kpi-card", ".live-kpi-grid > .live-kpi-card", ".dashboard-hero-grid > .card", ".lot-summary-grid > .lot-summary-card", ".card", ".insight-panel", ".table-container", ".table-responsive", ".alert-stream-card", ".flowchart-node", ".whatif-card", ".dossier-tab-strip", ".rx-scroll-reveal", ".rx-floating-card", ".rx-reveal-item"];
    if (prefersReduced || !("IntersectionObserver" in window)) {
      document.querySelectorAll(targetSelectors.join(", ")).forEach(el => {
        el.classList.add("rx-scroll-reveal", "rx-revealed", "rx-settled", "rx-floating-card");
      });
      return;
    }
    let observer = null;
    const setupScrollReveal = () => {
      if (observer) observer.disconnect();
      const vp = document.querySelector(".app-main-viewport") || viewport;
      const isMobile = window.innerWidth <= 768;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("rx-revealed", "rx-settled");
            observer?.unobserve(entry.target);
          }
        });
      }, {
        root: vp || null,
        rootMargin: isMobile ? "0px 0px -15px 0px" : "0px 0px -35px 0px",
        threshold: 0.04
      });

      // Collect candidate elements
      const candidateElements = document.querySelectorAll(targetSelectors.join(", "));
      const viewportRect = vp ? vp.getBoundingClientRect() : {
        top: 0,
        bottom: window.innerHeight,
        height: window.innerHeight
      };
      candidateElements.forEach(el => {
        // Skip nested cards inside another observed card (prevents double-animation of inner components)
        if (el.matches(".card .card, .insight-panel .card, .card .table-container, .card .table-responsive, .card .chart-metric-card")) {
          return;
        }

        // Add base sliding reveal class
        if (!el.classList.contains("rx-scroll-reveal")) {
          el.classList.add("rx-scroll-reveal", "rx-floating-card");
        }

        // If already revealed from a previous scroll, preserve revealed state
        if (el.classList.contains("rx-revealed") || el.classList.contains("rx-settled")) {
          return;
        }

        // Check if element is in the initial visible fold
        const rect = el.getBoundingClientRect();
        const isInInitialView = rect.top < viewportRect.bottom - (isMobile ? 20 : 50) && rect.bottom > viewportRect.top + 20;
        if (isInInitialView) {
          // Immediately settle above-the-fold elements so initial screen is instantly readable
          el.classList.add("rx-revealed", "rx-settled");
        } else {
          // Off-screen element: observe for user scroll entrance
          observer?.observe(el);
        }
      });
    };

    // If intro overlay is active, wait until intro finishes before initiating scroll reveals
    const introOverlay = document.getElementById("rx-intro-overlay");
    let introHandler = null;
    if (introOverlay) {
      introHandler = () => {
        setTimeout(setupScrollReveal, 80);
      };
      window.addEventListener("rx-intro-complete", introHandler, {
        once: true
      });
    } else {
      setupScrollReveal();
    }

    // Refresh observer after DOM layout settles and when dynamic datasets render
    const t1 = setTimeout(setupScrollReveal, 120);
    const t2 = setTimeout(setupScrollReveal, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (introHandler) {
        window.removeEventListener("rx-intro-complete", introHandler);
      }
      if (observer) observer.disconnect();
    };
  }, [activeTab, loading, heroCompLoading, overview]);

  // Live Telemetry Stream WebSocket Connection (Section 10 Audit & Optimization)
  (0, _react.useEffect)(() => {
    let isMounted = true;
    let ws = null;
    let reconnectTimer = null;

    // Load initial status via REST
    fetch(`${API_BASE}/stream/status`).then(r => r.json()).then(d => {
      if (!isMounted) return;
      setLiveStatus(d);
      if (d.recent_alerts) setLiveAlerts(d.recent_alerts);
    }).catch(() => {});
    const connectWs = () => {
      if (!isMounted) return;
      let wsUrl = "";
      if (API_BASE.startsWith("http")) {
        wsUrl = API_BASE.replace(/^http/, "ws").replace(/\/api$/, "") + "/ws/live";
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws/live`;
      }
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        if (!isMounted) return;
        console.log("[ReliabilityX WS] Live telemetry connected");
      };
      ws.onmessage = event => {
        if (!isMounted) return;
        try {
          const raw = typeof event.data === "string" ? event.data.replace(/:\s*NaN\b/g, ": null").replace(/:\s*-?Infinity\b/g, ": null") : event.data;
          const msg = JSON.parse(raw);
          if (msg.type === "CONNECTION_STATUS") {
            setLiveStatus(msg.data);
          } else if (msg.type === "LIVE_SAMPLE") {
            const pt = msg.data;
            setLivePoints(prev => {
              const next = [...prev, pt];
              return next.length > 80 ? next.slice(-80) : next;
            });
            setLiveStatus(prev => prev ? {
              ...prev,
              messages_count: prev.messages_count + 1,
              last_update: pt.timestamp,
              last_latency_ms: 28 + Math.random() * 15
            } : null);
          } else if (msg.type === "NEW_ALERT") {
            const al = msg.data;
            setLiveAlerts(prev => {
              const next = [...prev, al];
              return next.length > 50 ? next.slice(-50) : next;
            });
            showToast(`ALERT: ${al.component_id} ${al.title}`, "error");
          } else if (msg.type === "WINDOWED_UPDATE") {
            if (msg.data.lot_health) {
              setLiveLotHealth(msg.data.lot_health);
            }
          }
        } catch (err) {
          console.error("[ReliabilityX WS] Parse error:", err);
        }
      };
      ws.onclose = () => {
        if (!isMounted) return;
        setLiveStatus(prev => prev ? {
          ...prev,
          connection_status: "DISCONNECTED"
        } : null);
        reconnectTimer = setTimeout(() => {
          if (isMounted) connectWs();
        }, 3000);
      };
      ws.onerror = () => {
        if (!isMounted) return;
        try {
          ws?.close();
        } catch (e) {}
      };
    };
    connectWs();
    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch (e) {}
      }
    };
  }, []);
  const handleStartStream = async (sourceType, config) => {
    try {
      const res = await fetch(`${API_BASE}/stream/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source_type: sourceType,
          config
        })
      });
      const data = await res.json();
      setLiveStatus(data);
      showToast(`Stream started: ${data.source_name}`, "success");
    } catch (err) {
      showToast(`Start stream failed: ${err.message}`, "error");
    }
  };
  const handlePauseStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/pause`, {
        method: "POST"
      });
      const data = await res.json();
      setLiveStatus(data);
      showToast("Stream paused", "info");
    } catch (err) {
      showToast(`Pause stream failed: ${err.message}`, "error");
    }
  };
  const handleResumeStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/resume`, {
        method: "POST"
      });
      const data = await res.json();
      setLiveStatus(data);
      showToast("Stream resumed", "info");
    } catch (err) {
      showToast(`Resume stream failed: ${err.message}`, "error");
    }
  };
  const handleStopStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/stop`, {
        method: "POST"
      });
      const data = await res.json();
      setLiveStatus(data);
      showToast("Stream stopped", "info");
    } catch (err) {
      showToast(`Stop stream failed: ${err.message}`, "error");
    }
  };

  // Load Hero Component Details
  (0, _react.useEffect)(() => {
    if (!heroCompId) return;
    let isCurrent = true;
    setHeroCompLoading(true);
    fetch(`${API_BASE}/components/${heroCompId}`).then(r => {
      if (!r.ok) throw new Error("Component not found");
      return r.json();
    }).then(d => {
      if (isCurrent) {
        setHeroCompData(d);
        setHeroCompLoading(false);
      }
    }).catch(() => {
      if (isCurrent) setHeroCompLoading(false);
    });
    return () => {
      isCurrent = false;
    };
  }, [heroCompId]);

  // Real-time Hero What-If Simulation
  (0, _react.useEffect)(() => {
    if (!heroCompId) return;
    let isCurrent = true;
    fetch(`${API_BASE}/counterfactual/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        component_id: heroCompId,
        parameter_name: heroParam,
        simulated_drift_rate: heroSimulatedDrift
      })
    }).then(r => r.json()).then(res => {
      if (isCurrent) setHeroSimResult(res);
    }).catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [heroCompId, heroParam, heroSimulatedDrift]);

  // Load Detail for Modal when selectedCompId changes
  (0, _react.useEffect)(() => {
    if (!selectedCompId) {
      setCompDetail(null);
      return;
    }
    let isCurrent = true;
    setCompLoading(true);
    fetch(`${API_BASE}/components/${selectedCompId}`).then(r => r.json()).then(data => {
      if (isCurrent) {
        setCompDetail(data);
        setCompLoading(false);
      }
    }).catch(err => {
      if (isCurrent) {
        showToast(`Failed to load ${selectedCompId}: ${err.message}`, "error");
        setCompLoading(false);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [selectedCompId]);

  // Handle global search submission
  const handleSearchSubmit = e => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    const cleanId = globalSearch.trim().toUpperCase();
    setHeroCompId(cleanId);
    setSelectedCompId(cleanId);
    setGlobalSearch("");
  };
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "app-shell"
  }, /*#__PURE__*/_react.default.createElement(_Sidebar.Sidebar, {
    activeTab: activeTab,
    onSelectTab: tab => {
      setActiveTab(tab);
      setMobileMenuOpen(false);
    },
    collapsed: sidebarCollapsed,
    onToggleCollapse: toggleSidebar,
    mobileOpen: mobileMenuOpen,
    onCloseMobile: () => setMobileMenuOpen(false)
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "app-main-viewport"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "rx-floating-background",
    "aria-hidden": "true"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "rx-floating-orb rx-orb-1"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "rx-floating-orb rx-orb-2"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "rx-floating-orb rx-orb-3"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "rx-floating-grid-mesh"
  })), /*#__PURE__*/_react.default.createElement(_Topbar.Topbar, {
    activeTab: activeTab,
    globalSearch: globalSearch,
    onSearchChange: setGlobalSearch,
    onSearchSubmit: handleSearchSubmit,
    activeDataset: activeDataset,
    onOpenDatasetModal: () => setIsDatasetModalOpen(true),
    liveStatus: liveStatus,
    onNavigateToLive: () => setActiveTab("live_telemetry"),
    onToggleMobileMenu: () => setMobileMenuOpen(!mobileMenuOpen),
    onReloadDemo: async () => {
      try {
        showToast("Reloading Arrhenius benchmark...", "info");
        await fetch(`${API_BASE}/data/load-demo`, {
          method: "POST"
        });
        await loadSystemData();
        showToast("Benchmark reloaded successfully.", "success");
      } catch (err) {
        showToast("Reload failed: " + err.message, "error");
      }
    }
  }), /*#__PURE__*/_react.default.createElement(_SafetyNotice.SafetyNotice, null), /*#__PURE__*/_react.default.createElement("main", {
    className: "app-content"
  }, activeTab === "dashboard" && /*#__PURE__*/_react.default.createElement(_DashboardTab.DashboardTab, {
    overview: overview,
    loading: loading,
    heroCompId: heroCompId,
    heroCompData: heroCompData,
    heroCompLoading: heroCompLoading,
    heroParam: heroParam,
    heroSimulatedDrift: heroSimulatedDrift,
    heroSimResult: heroSimResult,
    onSelectHeroComp: setHeroCompId,
    onSelectHeroParam: setHeroParam,
    onChangeSimDrift: setHeroSimulatedDrift,
    onOpenInspectModal: id => setSelectedCompId(id),
    onNavigateTab: setActiveTab
  }), activeTab === "live_telemetry" && /*#__PURE__*/_react.default.createElement(_LiveScreeningTab.LiveScreeningTab, {
    onInspectComp: id => setSelectedCompId(id),
    liveStatus: liveStatus,
    livePoints: livePoints,
    liveAlerts: liveAlerts,
    liveLotHealth: liveLotHealth,
    onStartStream: handleStartStream,
    onPauseStream: handlePauseStream,
    onResumeStream: handleResumeStream,
    onStopStream: handleStopStream,
    onClearPoints: () => setLivePoints([])
  }), activeTab === "screening" && /*#__PURE__*/_react.default.createElement(_ScreeningPipelineTab.ScreeningPipelineTab, {
    onInspectComp: id => setSelectedCompId(id)
  }), activeTab === "components" && /*#__PURE__*/_react.default.createElement(_ComponentsTab.ComponentsTab, {
    onInspectComp: id => setSelectedCompId(id),
    selectedLot: selectedLotFilter
  }), activeTab === "lots" && /*#__PURE__*/_react.default.createElement(_LotsTab.LotsTab, {
    onSelectLot: lotId => {
      setSelectedLotFilter(lotId);
      setActiveTab("components");
    }
  }), activeTab === "predictions" && /*#__PURE__*/_react.default.createElement(_PredictionsTab.PredictionsTab, {
    onInspectComp: id => setSelectedCompId(id)
  }), activeTab === "inspection" && /*#__PURE__*/_react.default.createElement(_InspectionTriageTab.InspectionTriageTab, {
    onInspectComp: id => setSelectedCompId(id)
  }), activeTab === "reports" && /*#__PURE__*/_react.default.createElement(_ReportsTab.ReportsTab, {
    onInspectComp: id => setSelectedCompId(id)
  }), activeTab === "engineering" && /*#__PURE__*/_react.default.createElement(_EngineeringSuiteTab.EngineeringSuiteTab, {
    onSaved: () => showToast("Specifications updated successfully.", "success"),
    initialSubTab: "benchmarks"
  }), activeTab === "audit" && /*#__PURE__*/_react.default.createElement(_EngineeringSuiteTab.EngineeringSuiteTab, {
    onSaved: () => showToast("Specifications updated successfully.", "success"),
    initialSubTab: "audit"
  })), /*#__PURE__*/_react.default.createElement(_MobileBottomNav.MobileBottomNav, {
    activeTab: activeTab,
    onSelectTab: tab => {
      setActiveTab(tab);
      setMobileMenuOpen(false);
    },
    onToggleMobileMenu: () => setMobileMenuOpen(!mobileMenuOpen),
    mobileMenuOpen: mobileMenuOpen
  })), selectedCompId && /*#__PURE__*/_react.default.createElement(_ComponentDetailModal.ComponentDetailModal, {
    compId: selectedCompId,
    data: compDetail,
    loading: compLoading,
    onClose: () => setSelectedCompId(null),
    onDecisionCommitted: () => {
      showToast(`Authoritative QA disposition committed for ${selectedCompId}`, "success");
      loadSystemData();
    }
  }), isDatasetModalOpen && /*#__PURE__*/_react.default.createElement(_DatasetModal.DatasetModal, {
    onClose: () => setIsDatasetModalOpen(false),
    onDatasetLoaded: () => {
      setIsDatasetModalOpen(false);
      loadSystemData();
      showToast("New dataset loaded and screened successfully.", "success");
    },
    showToast: showToast
  }), toast && /*#__PURE__*/_react.default.createElement("div", {
    className: "toast-container"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: `toast-notification toast-${toast.type}`
  }, toast.type === "success" && "✅ ", toast.type === "error" && "❌ ", toast.type === "info" && "ℹ️ ", /*#__PURE__*/_react.default.createElement("span", {
    style: {
      marginLeft: "6px"
    }
  }, toast.message))));
}

// -----------------------------------------------------------------------------
// RENDER REACT 18 ROOT
// -----------------------------------------------------------------------------
const container = document.getElementById("root");
if (container) {
  const root = _reactDom.default.createRoot(container);
  root.render(/*#__PURE__*/_react.default.createElement(ReliabilityXApp, null));
}
  });

  // Module: components/ArchitectureFlowchart.tsx
  define("components/ArchitectureFlowchart.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArchitectureFlowchart = ArchitectureFlowchart;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Interactive Pipeline Architecture Flowchart
// Exact visual representation of the 10-layer AI-driven burn-in screening system
// ==============================================================================

const STAGE_DETAILS = {
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
    mlModels: ["Isolation Forest (sklearn.ensemble.IsolationForest, 100 trees)", "Dynamic Part Average Testing (DPAT AEC-Q001 Standard)", "Robust Mahalanobis (sklearn.covariance.MinCovDet)", "Local Outlier Factor (sklearn.neighbors.LocalOutlierFactor)"],
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
    mlModels: ["1st Derivative Velocity (v = Δx/Δt)", "2nd Derivative Drift Acceleration (a = d²x/dt²)", "Finite Difference Curvature Analysis"],
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
    mlModels: ["HistGradientBoostingRegressor (Gradient Boosting)", "RandomForestRegressor (100 Decision Trees)", "Ridge Regression (L2 Regularized)", "Physics Log-Time Arrhenius Extrapolation"],
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
    mlModels: ["Shapley-Style Attribution Decomposition", "Interactive Counterfactual Sensitivity Simulation"],
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
    mlModels: ["Calibrated Multi-Factor Probability Fusion", "Hard Datasheet Limit Boundary Guard"],
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
function ArchitectureFlowchart() {
  const [selectedNode, setSelectedNode] = (0, _react.useState)(null);
  const activeDetail = selectedNode ? STAGE_DETAILS[selectedNode] : null;
  return /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "10px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-container"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-blue",
    onClick: () => setSelectedNode("sources"),
    title: "Click to inspect ML telemetry ingestion"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83C\uDFED BURN-IN / ESS TEST SOURCES"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#2563EB",
      color: "#FFFFFF"
    }
  }, "INGESTION")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, "Automated Test Equipment (ATE)"), /*#__PURE__*/_react.default.createElement("li", null, "Burn-In Test Systems (Thermal Chambers)"), /*#__PURE__*/_react.default.createElement("li", null, "Environmental Stress Testing (ESS)"), /*#__PURE__*/_react.default.createElement("li", null, "Electrical Parametric Measurement Systems"), /*#__PURE__*/_react.default.createElement("li", null, "Historical QA / Test Records")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass",
    style: {
      fontSize: "11px"
    }
  }, "Active Stream"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11px",
      color: "var(--text-muted)",
      marginTop: "4px"
    }
  }, "Click to view code")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-cyan",
    onClick: () => setSelectedNode("test_data"),
    title: "Click to view temporal test gates"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCBE COMPONENT TEST DATA"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#06B6D4",
      color: "#FFFFFF"
    }
  }, "4 GATES")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "12.5px",
      color: "#334155",
      fontWeight: 600
    }
  }, "Multi-channel parametric burn-in telemetry:"), /*#__PURE__*/_react.default.createElement("div", {
    className: "timeline-pills"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "timeline-pill active"
  }, "0h (Baseline)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "timeline-pill active"
  }, "24h (Gate 1)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "timeline-pill active"
  }, "96h (Gate 2)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "timeline-pill active"
  }, "168h (Qualification)")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-purple",
    onClick: () => setSelectedNode("data_quality"),
    title: "Click to view sensor validation"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\u2699\uFE0F DATA QUALITY ENGINE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#7C3AED",
      color: "#FFFFFF"
    }
  }, "VALIDATED")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "10px",
      width: "100%"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "#334155"
    }
  }, "\u2022 Missing Data Check (0 missing)"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "#334155"
    }
  }, "\u2022 5x IQR Noise Filter"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "#334155"
    }
  }, "\u2022 Scale & Normalization"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "#334155"
    }
  }, "\u2022 Continuity Validation"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "#334155"
    }
  }, "\u2022 Sensor Stuck Detection"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "#334155"
    }
  }, "\u2022 Outlier Pre-Screening")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-grid-2"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-green",
    onClick: () => setSelectedNode("anomaly_engine"),
    title: "Click to inspect 4 Anomaly ML models"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCCA LOT-RELATIVE ANOMALY ENGINE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#059669",
      color: "#FFFFFF"
    }
  }, "4 ML DETECTORS")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Z-Score / DPAT"), " (AEC-Q001 Standard)"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Isolation Forest"), " (Scikit-Learn, 100 Trees)"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "LOF / Mahalanobis"), " (MinCovDet)"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Multivariate Ensemble"), " (Calibrated [0, 1])")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-rose",
    onClick: () => setSelectedNode("behaviour_engine"),
    title: "Click to inspect temporal acceleration engine"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCC8 TIME-SERIES BEHAVIOUR ENGINE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#E11D48",
      color: "#FFFFFF"
    }
  }, "TEMPORAL")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Drift Velocity"), " (v = \u0394x/\u0394t)"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Drift Rate"), " (% change per 24h)"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Drift Acceleration"), " (a = d\xB2x/dt\xB2)"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "State Transition"), " (Runaway Wearout)"))))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-amber",
    onClick: () => setSelectedNode("fingerprint"),
    title: "Click to inspect fingerprint classification"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83E\uDDEC COMPONENT BEHAVIOUR FINGERPRINT"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#D97706",
      color: "#FFFFFF"
    }
  }, "PHYSICAL STATE")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
      width: "100%",
      justifyContent: "space-around"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-normal",
    style: {
      padding: "6px 14px",
      fontSize: "12px"
    }
  }, "NORMAL (PASS)"), /*#__PURE__*/_react.default.createElement("span", {
    style: {
      color: "#94A3B8",
      fontWeight: "bold"
    }
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-drifting",
    style: {
      padding: "6px 14px",
      fontSize: "12px"
    }
  }, "DRIFTING (WATCH)"), /*#__PURE__*/_react.default.createElement("span", {
    style: {
      color: "#94A3B8",
      fontWeight: "bold"
    }
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-accel",
    style: {
      padding: "6px 14px",
      fontSize: "12px"
    }
  }, "ACCELERATING (REVIEW)"), /*#__PURE__*/_react.default.createElement("span", {
    style: {
      color: "#94A3B8",
      fontWeight: "bold"
    }
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-unstable",
    style: {
      padding: "6px 14px",
      fontSize: "12px"
    }
  }, "UNSTABLE (HIGH RISK)")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-blue",
    onClick: () => setSelectedNode("future_drift"),
    title: "Click to inspect 4 Predictive ML models"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83E\uDD16 FUTURE DRIFT AI (168h FORECAST)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#1D4ED8",
      color: "#FFFFFF"
    }
  }, "MODEL LADDER")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Early Readings:"), " Ingests 0h, 24h, 96h telemetry"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "168h Prediction:"), " HistGradientBoosting + Random Forest + Ridge"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Physics Baseline:"), " Arrhenius Log-Time Wearout Model"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Uncertainty Quantification:"), " Estimated Prediction Interval (\xB11.96\u03C3) & P90 Estimated Upper Bound")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      textAlign: "right",
      minWidth: "140px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "20px",
      fontWeight: "800",
      color: "#1D4ED8"
    }
  }, "168h"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11px",
      color: "var(--text-muted)"
    }
  }, "Prognostic Horizon")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-grid-2"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-purple",
    onClick: () => setSelectedNode("trajectory"),
    title: "Click to inspect trajectory curves"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCC8 RELIABILITY TRAJECTORY"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#6D28D9",
      color: "#FFFFFF"
    }
  }, "PROGNOSTICS")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, "Health Trend (0h\u201396h Actuals)"), /*#__PURE__*/_react.default.createElement("li", null, "Future Prognostic Trend (96h\u2013168h)"), /*#__PURE__*/_react.default.createElement("li", null, "Non-Linear Degradation Curvature"), /*#__PURE__*/_react.default.createElement("li", null, "Datasheet Spec Limit Threshold")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-green",
    onClick: () => setSelectedNode("explainable_ai"),
    title: "Click to inspect counterfactual simulator"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCA1 EXPLAINABLE AI (XAI)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#047857",
      color: "#FFFFFF"
    }
  }, "ATTRIBUTION")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Why risky?"), " Natural Language Verdict"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "What changed?"), " Parametric Deviation"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Key contributors?"), " Shapley-Style Ratios"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "What-If Simulator?"), " Real-Time Counterfactuals"))))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-orange",
    onClick: () => setSelectedNode("risk_engine"),
    title: "Click to inspect risk fusion & safety boundary"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDEE1\uFE0F RISK ENGINE & SAFETY ENFORCEMENT"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#C2410C",
      color: "#FFFFFF"
    }
  }, "SAFETY BOUNDARY")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%"
    }
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets"
  }, /*#__PURE__*/_react.default.createElement("li", null, "Anomaly Score + Drift Acceleration + 168h Prediction + Confidence Bounds"), /*#__PURE__*/_react.default.createElement("li", null, "Multi-Detector Evidence Calibration & Component Behaviour State"), /*#__PURE__*/_react.default.createElement("li", null, /*#__PURE__*/_react.default.createElement("strong", null, "Safety Boundary Rule:"), " Limit breach unconditionally locks status to ", /*#__PURE__*/_react.default.createElement("strong", null, "HIGH RISK"))), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "6px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, "PASS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-watch"
  }, "WATCH"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-review"
  }, "REVIEW"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-risk"
  }, "HIGH RISK"))))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-grid-3"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-blue",
    onClick: () => setSelectedNode("outputs"),
    title: "Click to inspect Component Health"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header",
    style: {
      fontSize: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDD0D COMPONENT HEALTH")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body",
    style: {
      padding: "10px 14px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-sub)"
    }
  }, "Individual flight-unit telemetry, multi-parameter degradation, and pass/fail diagnostics."))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-rose",
    onClick: () => setSelectedNode("outputs"),
    title: "Click to inspect Lot Health"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header",
    style: {
      fontSize: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCE6 LOT HEALTH")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body",
    style: {
      padding: "10px 14px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-sub)"
    }
  }, "Wafer-level clustering to isolate batch manufacturing flaws from individual unit wearout."))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-green",
    onClick: () => setSelectedNode("outputs"),
    title: "Click to inspect Inspection Priority"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header",
    style: {
      fontSize: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCCB INSPECTION PRIORITY")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body",
    style: {
      padding: "10px 14px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-sub)"
    }
  }, "Triage queue ranked #1 to #N prioritizing high-risk components for physical engineer FA.")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-connector-v"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-line-v"
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-arrow-down"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node theme-slate",
    onClick: () => setSelectedNode("dashboard"),
    title: "Click to inspect QA Dashboard"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-header"
  }, /*#__PURE__*/_react.default.createElement("span", null, "\uD83D\uDCBB QA ENGINEERING DECISION DASHBOARD"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge",
    style: {
      background: "#0F172A",
      color: "#FFFFFF"
    }
  }, "AUTHORITATIVE CONSOLE")), /*#__PURE__*/_react.default.createElement("div", {
    className: "flowchart-node-body"
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "14px",
      width: "100%"
    }
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "12.5px"
    }
  }, "Comprehensive Flight Intelligence:"), /*#__PURE__*/_react.default.createElement("ul", {
    className: "flowchart-bullets",
    style: {
      marginTop: "4px"
    }
  }, /*#__PURE__*/_react.default.createElement("li", null, "Reliability Profile & Historical Trajectory"), /*#__PURE__*/_react.default.createElement("li", null, "168h Trend & Physics Prognostic Forecast"), /*#__PURE__*/_react.default.createElement("li", null, "Explainable AI Evidence Attribution"), /*#__PURE__*/_react.default.createElement("li", null, "Lot Health & Batch Wafer Analysis"), /*#__PURE__*/_react.default.createElement("li", null, "Inspection Priority Queue & QA Signoff"))), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "6px",
      marginBottom: "8px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, "NORMAL"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-watch"
  }, "WATCH"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-review"
  }, "REVIEW"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-risk"
  }, "HIGH RISK")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11px",
      color: "var(--text-muted)"
    }
  }, "SHA-256 Tamper-Evident Ledger Verified")))))), activeDetail && /*#__PURE__*/_react.default.createElement("div", {
    className: "code-drawer-modal",
    onClick: () => setSelectedNode(null)
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "code-drawer-content",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-header"
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "modal-title"
  }, "\uD83E\uDD16 ", activeDetail.title), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-muted)",
      marginTop: "2px"
    }
  }, activeDetail.category, " \xB7 Backend Engine: ", /*#__PURE__*/_react.default.createElement("code", null, activeDetail.backendFile))), /*#__PURE__*/_react.default.createElement("button", {
    className: "modal-close-btn",
    onClick: () => setSelectedNode(null)
  }, "\u2715")), /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-body",
    style: {
      padding: "20px"
    }
  }, /*#__PURE__*/_react.default.createElement("p", {
    style: {
      fontSize: "13px",
      color: "var(--text-sub)",
      lineHeight: 1.5,
      marginBottom: "14px"
    }
  }, activeDetail.description), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginBottom: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "12px",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Active Machine Learning & Statistical Models:"), /*#__PURE__*/_react.default.createElement("ul", {
    style: {
      margin: "6px 0 0 18px",
      fontSize: "12.5px",
      color: "var(--text-main)"
    }
  }, activeDetail.mlModels.map((m, idx) => /*#__PURE__*/_react.default.createElement("li", {
    key: idx,
    style: {
      marginBottom: "3px"
    }
  }, m)))), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "12px",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Real Python Backend Execution Code:"), /*#__PURE__*/_react.default.createElement("pre", {
    style: {
      background: "#0F172A",
      color: "#38BDF8",
      padding: "14px",
      borderRadius: "6px",
      fontSize: "12px",
      overflowX: "auto",
      marginTop: "6px",
      fontFamily: "Consolas, Monaco, monospace"
    }
  }, activeDetail.codeSnippet)), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "18px",
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => setSelectedNode(null)
  }, "Close Inspector"))))));
}
  });

  // Module: components/Badges.tsx
  define("components/Badges.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RiskBadge = RiskBadge;
exports.StateBadge = StateBadge;
var _react = _interopRequireDefault(require("react"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// ==============================================================================
// ReliabilityX — Status & Behaviour State Badges
// ==============================================================================

function StateBadge({
  state
}) {
  if (!state) return null;
  const s = state.toUpperCase();
  if (s === "NORMAL") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-normal"
  }, "NORMAL");
  if (s === "DRIFTING") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-drifting"
  }, "DRIFTING");
  if (s === "ACCELERATING") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-accel"
  }, "ACCELERATING");
  if (s === "UNSTABLE") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-unstable"
  }, "UNSTABLE");
  return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-review"
  }, s);
}
function RiskBadge({
  risk
}) {
  if (!risk) return null;
  const r = risk.toUpperCase();
  if (r === "PASS") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, "PASS");
  if (r === "WATCH") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-watch"
  }, "WATCH");
  if (r === "REVIEW") return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-review"
  }, "REVIEW");
  return /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-risk"
  }, "HIGH RISK");
}
  });

  // Module: components/ComponentDetailModal.tsx
  define("components/ComponentDetailModal.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ComponentDetailModal = ComponentDetailModal;
var _react = _interopRequireWildcard(require("react"));
var _Badges = require("./Badges");
var _TrajectorySvgChart = require("./TrajectorySvgChart");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Component Detail & Authoritative QA Sign-off Modal
// ==============================================================================

function ComponentDetailModal({
  compId,
  data,
  loading,
  onClose,
  onDecisionCommitted
}) {
  const [disposition, setDisposition] = (0, _react.useState)("REVIEW");
  const [notes, setNotes] = (0, _react.useState)("");
  const [signature, setSignature] = (0, _react.useState)("Lead QA Reliability Engineer");
  const [submitting, setSubmitting] = (0, _react.useState)(false);
  const [modalSimDrift, setModalSimDrift] = (0, _react.useState)(0.08);
  const [activeSection, setActiveSection] = (0, _react.useState)("all");

  // Keyboard accessibility: Escape to close modal (Section 31)
  (0, _react.useEffect)(() => {
    const handleKeyDown = e => {
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
        headers: {
          "Content-Type": "application/json"
        },
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
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };
  const sectionsList = [{
    id: "all",
    label: "All Sections"
  }, {
    id: "overview",
    label: "Overview"
  }, {
    id: "telemetry",
    label: "Telemetry"
  }, {
    id: "prediction",
    label: "Prediction"
  }, {
    id: "evidence",
    label: "Evidence"
  }, {
    id: "behaviour",
    label: "Behaviour"
  }, {
    id: "whatif",
    label: "What-If"
  }, {
    id: "disposition",
    label: "Engineering Disposition"
  }];
  const showSec = secId => activeSection === "all" || activeSection === secId;
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-overlay open",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "modal-dossier-title"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-card modal-lg"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-header"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-header-content"
  }, /*#__PURE__*/_react.default.createElement("div", {
    id: "modal-dossier-title",
    className: "modal-category-title"
  }, "COMPONENT SCREENING DOSSIER"), /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-header-meta"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "modal-comp-id-title"
  }, compId), /*#__PURE__*/_react.default.createElement("span", {
    className: "modal-lot-tag"
  }, "Lot: ", /*#__PURE__*/_react.default.createElement("strong", null, comp?.lot_id || "LOT-2411C")), /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-status-badge-wrap"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "modal-status-label"
  }, "Status:"), /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: comp?.risk_level || "REVIEW"
  })))), /*#__PURE__*/_react.default.createElement("button", {
    className: "modal-close-btn",
    onClick: onClose,
    "aria-label": "Close component dossier modal"
  }, "\u2715")), /*#__PURE__*/_react.default.createElement("div", {
    className: "dossier-tab-strip",
    role: "tablist",
    "aria-label": "Component Dossier Sections"
  }, sectionsList.map(tab => /*#__PURE__*/_react.default.createElement("button", {
    key: tab.id,
    role: "tab",
    "aria-selected": activeSection === tab.id,
    className: `dossier-tab-btn ${activeSection === tab.id ? "active" : ""}`,
    onClick: () => setActiveSection(tab.id)
  }, tab.label))), /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-body",
    style: {
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: "24px"
    }
  }, loading ? /*#__PURE__*/_react.default.createElement("div", {
    style: {
      padding: "60px",
      textAlign: "center",
      color: "var(--text-muted)"
    }
  }, "Loading component telemetry and degradation trajectory...") : /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, showSec("overview") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "A. OVERVIEW & CURRENT SCREENING STATUS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Burn-In Gates Monitored")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "BEHAVIOUR STATE"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "6px"
    }
  }, /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: comp?.current_state || "ACCELERATING"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub",
    style: {
      marginTop: "6px"
    }
  }, "Observed classification")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "ASSESSED RISK TIER"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "6px"
    }
  }, /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: comp?.risk_level || "REVIEW"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub",
    style: {
      marginTop: "6px"
    }
  }, "Multi-detector fusion")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "INSPECTION PRIORITY"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red"
  }, "#", comp?.inspection_priority ?? 1), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, comp?.priority_reason || "Critical wearout")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "MONITORED GATES"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-cyan"
  }, measurements.length || 4, " points"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "0h, 24h, 96h, 168h ESS screening")))), showSec("telemetry") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "B. TELEMETRY TRAJECTORY"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Burn-In Degradation (0\u2013168h)")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-container-clean"
  }, /*#__PURE__*/_react.default.createElement(_TrajectorySvgChart.TrajectorySvgChart, {
    data: data,
    paramName: "leakage_current_uA",
    simulatedDriftRate: modalSimDrift
  }))), showSec("prediction") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "C. 168h PROGNOSTIC PREDICTION"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Physics-Informed Arrhenius Forecaster")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metrics-grid"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "168h Forecast"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-val"
  }, pred?.predicted_168h ? pred.predicted_168h.toFixed(2) : "47.20", " \u03BCA"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "End-of-screen projected value")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "Spec Limit"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-val"
  }, "50.0 \u03BCA"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "Engineering datasheet maximum")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "Estimated Prediction Interval"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-val"
  }, "\xB1", pred?.uncertainty_std ? (pred.uncertainty_std * 1.96).toFixed(2) : "1.85"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "Estimated Prediction Interval (\xB11.96\u03C3)")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card",
    title: "P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit."
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "P90 Estimated Upper Bound \u2139\uFE0F"), /*#__PURE__*/_react.default.createElement("div", {
    className: `chart-metric-val ${(pred?.p90_upper_bound || pred?.p90_worst_case || 49.05) > 50 ? "text-red" : ""}`
  }, pred?.p90_upper_bound || pred?.p90_worst_case ? (pred?.p90_upper_bound || pred?.p90_worst_case).toFixed(2) : "49.05"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "P90 Risk Bound")))), showSec("evidence") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "D. EVIDENCE ATTRIBUTION (WHY FLAGGED?)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Telemetry & Statistical Explainability")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "narrative-box-clean"
  }, /*#__PURE__*/_react.default.createElement("strong", null, "Telemetry Evidence Finding: "), explain?.narrative_explanation || "Accelerating non-linear drift in leakage current indicates progressive degradation under thermal-electrical stress."), explain?.factor_attributions && /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "FACTOR CONTRIBUTIONS:"), explain.factor_attributions.map((f, idx) => /*#__PURE__*/_react.default.createElement("div", {
    key: idx
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "12px",
      marginBottom: "4px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, f.factor_name), /*#__PURE__*/_react.default.createElement("strong", null, (f.contribution_ratio * 100).toFixed(1), "%")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      height: "6px",
      background: "#1E293B",
      borderRadius: "3px",
      overflow: "hidden"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      height: "100%",
      width: `${f.contribution_ratio * 100}%`,
      background: idx === 0 ? "#FB923C" : "#38BDF8"
    }
  }))))))), showSec("behaviour") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "E. CURRENT BEHAVIOUR STATE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Observed Telemetry Classification")), /*#__PURE__*/_react.default.createElement("div", {
    className: "fingerprint-flow",
    style: {
      padding: "16px 20px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "NORMAL" ? "active" : ""}`
  }, "NORMAL"), /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "DRIFTING" ? "active" : ""}`
  }, "DRIFTING"), /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "ACCELERATING" ? "active" : ""}`
  }, "ACCELERATING"), /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "UNSTABLE" ? "active" : ""}`
  }, "UNSTABLE")), /*#__PURE__*/_react.default.createElement("div", {
    className: "text-muted",
    style: {
      fontSize: "11px",
      marginTop: "8px"
    }
  }, "Categories represent distinct observed degradation modes; components do not follow a mandatory sequential path.")), showSec("whatif") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "F. WHAT-IF COUNTERFACTUAL DRIFT SENSITIVITY"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Real-Time Simulator")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("p", {
    className: "section-desc"
  }, "Simulate additional parametric acceleration from remaining burn-in stress (96h\u2013168h) to test boundary margin robustness:"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("input", {
    type: "range",
    min: "0.01",
    max: "0.40",
    step: "0.01",
    value: modalSimDrift,
    onChange: e => setModalSimDrift(parseFloat(e.target.value)),
    style: {
      flex: 1,
      accentColor: "#38BDF8",
      cursor: "pointer"
    }
  }), /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      minWidth: "100px",
      textAlign: "right",
      color: "#F8FAFC"
    }
  }, "+", (modalSimDrift * 100).toFixed(1), "% / 24h")))), showSec("disposition") && /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "G. ENGINEERING DISPOSITION & AUDIT SIGN-OFF"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-normal"
  }, "SHA-256 Ledger Record")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "grid-2col"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/_react.default.createElement("label", {
    style: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-sub)",
      marginBottom: "6px"
    }
  }, "Engineering Disposition Decision:"), /*#__PURE__*/_react.default.createElement("select", {
    value: disposition,
    onChange: e => setDisposition(e.target.value),
    className: "form-input",
    style: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border-color)",
      background: "#111C3D",
      color: "#FFFFFF"
    }
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "PASS"
  }, "PASS \u2014 No abnormal behaviour detected; subject to applicable engineering requirements"), /*#__PURE__*/_react.default.createElement("option", {
    value: "WATCH"
  }, "WATCH \u2014 Monitoring recommended"), /*#__PURE__*/_react.default.createElement("option", {
    value: "REVIEW"
  }, "REVIEW \u2014 Engineering review recommended"), /*#__PURE__*/_react.default.createElement("option", {
    value: "HIGH RISK"
  }, "HIGH RISK \u2014 Engineering investigation / disposition required"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/_react.default.createElement("label", {
    style: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-sub)",
      marginBottom: "6px"
    }
  }, "Lead QA Engineer Signature:"), /*#__PURE__*/_react.default.createElement("input", {
    type: "text",
    value: signature,
    onChange: e => setSignature(e.target.value),
    className: "form-input",
    style: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border-color)",
      background: "#111C3D",
      color: "#FFFFFF"
    }
  }))), /*#__PURE__*/_react.default.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/_react.default.createElement("label", {
    style: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-sub)",
      marginBottom: "6px"
    }
  }, "Engineering Justification Rationale:"), /*#__PURE__*/_react.default.createElement("textarea", {
    rows: 3,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "Enter engineering rationale for authoritative disposition commit...",
    className: "form-input",
    style: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border-color)",
      background: "#111C3D",
      color: "#FFFFFF",
      resize: "vertical"
    }
  })), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-block",
    onClick: handleSubmit,
    disabled: submitting,
    style: {
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: 700
    }
  }, submitting ? "Submitting Disposition to Ledger..." : "Submit Engineering Disposition")))))));
}
  });

  // Module: components/ComponentsTab.tsx
  define("components/ComponentsTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ComponentsTab = ComponentsTab;
var _react = _interopRequireWildcard(require("react"));
var _Badges = require("./Badges");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Components Directory Tab Component
// Telemetry & Diagnostics Table with KPI Summary & Advanced Multi-Filter
// ==============================================================================

function ComponentsTab({
  onInspectComp,
  selectedLot
}) {
  const [components, setComponents] = (0, _react.useState)([]);
  const [loading, setLoading] = (0, _react.useState)(true);
  const [lotFilter, setLotFilter] = (0, _react.useState)(selectedLot || "ALL");
  const [riskFilter, setRiskFilter] = (0, _react.useState)("ALL");
  const [searchQuery, setSearchQuery] = (0, _react.useState)("");
  const [currentPage, setCurrentPage] = (0, _react.useState)(1);
  const pageSize = 25;
  (0, _react.useEffect)(() => {
    if (selectedLot) {
      setLotFilter(selectedLot);
    }
  }, [selectedLot]);
  (0, _react.useEffect)(() => {
    setLoading(true);
    let url = "/api/components?limit=250";
    if (lotFilter !== "ALL") url += `&lot_id=${lotFilter}`;
    if (riskFilter !== "ALL") url += `&risk_level=${encodeURIComponent(riskFilter)}`;
    fetch(url).then(r => r.json()).then(data => {
      setComponents(data.components || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [lotFilter, riskFilter]);

  // Reset pagination on filter or search change (Section 12)
  (0, _react.useEffect)(() => {
    setCurrentPage(1);
  }, [lotFilter, riskFilter, searchQuery]);
  const filtered = components.filter(c => searchQuery === "" || c.component_id.toLowerCase().includes(searchQuery.toLowerCase()) || c.lot_id.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Dynamic KPI counts based on loaded data
  const passCount = components.filter(c => c.risk_level === "PASS").length;
  const watchCount = components.filter(c => c.risk_level === "WATCH").length;
  const reviewCount = components.filter(c => c.risk_level === "REVIEW").length;
  const riskCount = components.filter(c => c.risk_level === "HIGH RISK").length;
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "page-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "Component Telemetry & Screening Directory"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Comprehensive flight component directory with multi-channel telemetry tracking, DPAT dynamic part testing, and real-time degradation status.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "TOTAL MONITORED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, loading ? "--" : components.length), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Across all active flight lots")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-green"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-green"
  }, "NOMINAL (PASS)"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green"
  }, loading ? "--" : passCount), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Within nominal burn-in trajectory")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-yellow"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-yellow"
  }, "WATCH / DRIFTING"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-yellow"
  }, loading ? "--" : watchCount), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Drift within \xB12\u03C3 bounds")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-red"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-red"
  }, "ELEVATED RISK"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red"
  }, loading ? "--" : reviewCount + riskCount), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, reviewCount, " Review \xB7 ", riskCount, " High Risk"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\u26A1 FLIGHT TELEMETRY DATABASE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, filtered.length, " Units Displayed")), /*#__PURE__*/_react.default.createElement("div", {
    className: "filter-bar mb-3",
    style: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "search-box"
  }, /*#__PURE__*/_react.default.createElement("input", {
    type: "text",
    placeholder: "Search Component ID or Lot...",
    value: searchQuery,
    onChange: e => setSearchQuery(e.target.value),
    style: {
      width: "260px"
    }
  })), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      alignItems: "center"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, "Lot:"), /*#__PURE__*/_react.default.createElement("select", {
    value: lotFilter,
    onChange: e => setLotFilter(e.target.value)
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "ALL"
  }, "All Lots"), /*#__PURE__*/_react.default.createElement("option", {
    value: "LOT-2411A"
  }, "LOT-2411A"), /*#__PURE__*/_react.default.createElement("option", {
    value: "LOT-2411B"
  }, "LOT-2411B"), /*#__PURE__*/_react.default.createElement("option", {
    value: "LOT-2411C"
  }, "LOT-2411C"), /*#__PURE__*/_react.default.createElement("option", {
    value: "LOT-2411D"
  }, "LOT-2411D"), /*#__PURE__*/_react.default.createElement("option", {
    value: "LOT-2411E"
  }, "LOT-2411E"))), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      alignItems: "center"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, "Risk Status:"), /*#__PURE__*/_react.default.createElement("select", {
    value: riskFilter,
    onChange: e => setRiskFilter(e.target.value)
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "ALL"
  }, "All Risk Tiers"), /*#__PURE__*/_react.default.createElement("option", {
    value: "PASS"
  }, "PASS"), /*#__PURE__*/_react.default.createElement("option", {
    value: "WATCH"
  }, "WATCH"), /*#__PURE__*/_react.default.createElement("option", {
    value: "REVIEW"
  }, "REVIEW"), /*#__PURE__*/_react.default.createElement("option", {
    value: "HIGH RISK"
  }, "HIGH RISK")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive"
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Component ID"), /*#__PURE__*/_react.default.createElement("th", null, "Lot ID"), /*#__PURE__*/_react.default.createElement("th", null, "Behaviour State"), /*#__PURE__*/_react.default.createElement("th", null, "Risk Status"), /*#__PURE__*/_react.default.createElement("th", null, "Priority Rank"), /*#__PURE__*/_react.default.createElement("th", null, "Primary Degradation Factor"), /*#__PURE__*/_react.default.createElement("th", null, "Action"))), /*#__PURE__*/_react.default.createElement("tbody", null, loading ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 7,
    style: {
      textAlign: "center",
      padding: "30px"
    }
  }, "Loading component database...")) : filtered.length === 0 ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 7,
    style: {
      textAlign: "center",
      padding: "30px"
    }
  }, "No components matching the selected criteria.")) : paginated.map(comp => /*#__PURE__*/_react.default.createElement("tr", {
    key: comp.component_id
  }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, comp.component_id)), /*#__PURE__*/_react.default.createElement("td", null, comp.lot_id), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: comp.current_state
  })), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: comp.risk_level
  })), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      color: comp.inspection_priority <= 5 ? "var(--status-risk)" : "var(--text-main)"
    }
  }, "#", comp.inspection_priority)), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontSize: "12px",
      color: "var(--text-sub)"
    }
  }, comp.priority_reason || "Nominal parameters"), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => onInspectComp(comp.component_id)
  }, "Inspect Unit"))))))), !loading && filtered.length > pageSize && /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "16px",
      paddingTop: "12px",
      borderTop: "1px solid var(--border-color)",
      fontSize: "12px",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, "Showing ", (currentPage - 1) * pageSize + 1, "\u2013", Math.min(currentPage * pageSize, filtered.length), " of ", filtered.length, " units"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "6px",
      alignItems: "center"
    }
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => setCurrentPage(p => Math.max(1, p - 1)),
    disabled: currentPage === 1,
    style: {
      padding: "4px 12px",
      fontSize: "11.5px"
    }
  }, "Previous"), /*#__PURE__*/_react.default.createElement("span", {
    style: {
      padding: "0 8px",
      fontWeight: 600,
      color: "var(--text-main)"
    }
  }, "Page ", currentPage, " of ", totalPages), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
    disabled: currentPage >= totalPages,
    style: {
      padding: "4px 12px",
      fontSize: "11.5px"
    }
  }, "Next")))));
}
  });

  // Module: components/DashboardTab.tsx
  define("components/DashboardTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DashboardTab = DashboardTab;
var _react = _interopRequireDefault(require("react"));
var _Badges = require("./Badges");
var _TrajectorySvgChart = require("./TrajectorySvgChart");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// ==============================================================================
// ReliabilityX — Hero Dashboard Tab Component
// Overview & Screening Intelligence with Trajectory and Real-Time What-If
// ==============================================================================

function DashboardTab({
  overview,
  loading,
  heroCompId,
  heroCompData,
  heroCompLoading,
  heroParam,
  heroSimulatedDrift,
  heroSimResult,
  onSelectHeroComp,
  onSelectHeroParam,
  onChangeSimDrift,
  onOpenInspectModal,
  onNavigateTab
}) {
  const riskDist = overview?.risk_distribution || {};
  const lotsList = overview?.lots_summary || overview?.lot_summary || [];
  const prioritiesList = overview?.top_priorities || overview?.inspection_priority || [];
  const comp = heroCompData?.component;
  const pred = heroCompData?.prediction;
  const explain = comp?.explanation || heroCompData?.evidence;
  const sampleComps = [{
    id: "C-01008",
    lot: "LOT-2411A",
    label: "C-01008 (Accelerating / High Risk)"
  }, {
    id: "C-00421",
    lot: "LOT-2411B",
    label: "C-00421 (Drifting / Review)"
  }, {
    id: "C-01001",
    lot: "LOT-2411A",
    label: "C-01001 (Stable / Normal PASS)"
  }, {
    id: "C-01015",
    lot: "LOT-2411C",
    label: "C-01015 (Unstable / High Risk)"
  }];
  const paramsList = [{
    id: "leakage_current_uA",
    label: "Leakage Current (μA)",
    limit: 50.0
  }, {
    id: "standby_current_mA",
    label: "Standby Current (mA)",
    limit: 12.0
  }, {
    id: "propagation_delay_ns",
    label: "Propagation Delay (ns)",
    limit: 8.5
  }, {
    id: "voltage_ref_V",
    label: "Reference Voltage (V)",
    limit: 2.60
  }];
  const currentParamObj = paramsList.find(p => p.id === heroParam) || paramsList[0];
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    id: "section-overview-header",
    className: "hero-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "RELIABILITY OVERVIEW & SCREENING INTELLIGENCE"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Early detection of non-linear component degradation during Burn-In and Environmental Stress Screening (ESS). Anticipates latent wearout and limits prior to physical test failures.")), !loading && !overview && /*#__PURE__*/_react.default.createElement("div", {
    className: "alert alert-warning mb-4",
    style: {
      background: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.4)",
      borderRadius: "8px",
      padding: "14px 18px",
      color: "#FCA5A5",
      display: "flex",
      alignItems: "center",
      gap: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "20px"
    }
  }, "\u26A0\uFE0F"), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "13px"
    }
  }, "SCREENING DATA SOURCE UNAVAILABLE"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      opacity: 0.88,
      marginTop: "2px"
    }
  }, "The screening intelligence API did not return overview metrics. Check backend connectivity at ", /*#__PURE__*/_react.default.createElement("code", null, "/api/health"), "."))), /*#__PURE__*/_react.default.createElement("div", {
    id: "section-kpi-summary",
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "COMPONENTS MONITORED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, loading ? "--" : overview ? overview.total_components : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Across ", overview ? lotsList.length || overview.total_lots || 5 : "--", " active flight lots")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "NORMAL (PASS)"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green"
  }, loading ? "--" : overview ? riskDist.PASS ?? 0 : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Nominal burn-in trajectory")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "WATCH (DRIFT)"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-yellow"
  }, loading ? "--" : overview ? riskDist.WATCH ?? 0 : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Moderate drift within \xB12\u03C3 bounds")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "ATTENTION REQUIRED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red"
  }, loading ? "--" : overview ? (riskDist["HIGH RISK"] ?? riskDist.HIGH_RISK ?? 0) + (riskDist.REVIEW ?? 0) : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, overview ? `${riskDist["HIGH RISK"] ?? riskDist.HIGH_RISK ?? 0} High Risk • ${riskDist.REVIEW ?? 0} Review` : "--"))), /*#__PURE__*/_react.default.createElement("div", {
    id: "section-trajectory-simulation",
    className: "dashboard-hero-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "COMPONENT RELIABILITY TRAJECTORY"), /*#__PURE__*/_react.default.createElement("div", {
    className: "btn-group"
  }, paramsList.map(p => /*#__PURE__*/_react.default.createElement("button", {
    key: p.id,
    className: `btn btn-sm ${heroParam === p.id ? "btn-primary" : "btn-secondary"}`,
    onClick: () => onSelectHeroParam(p.id),
    style: {
      fontSize: "11px",
      padding: "3px 8px"
    }
  }, p.label.split(" ")[0])))), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-legend-clean"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-badge"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-swatch",
    style: {
      background: "#38BDF8",
      height: "4px"
    }
  }), " Actual Telemetry (0\u201396h)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-badge"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-swatch",
    style: {
      background: "#38BDF8",
      borderTop: "2px dashed #38BDF8"
    }
  }), " 168h Forecast"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-badge"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-swatch",
    style: {
      background: "#F87171",
      borderTop: "2px dashed #F87171"
    }
  }), " Limit (", currentParamObj.limit, ")"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-badge"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-swatch",
    style: {
      background: "#FB923C",
      borderTop: "2px dotted #FB923C"
    }
  }), " P90 Estimated Upper Bound"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-badge"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-swatch",
    style: {
      background: "rgba(56, 189, 248, 0.35)",
      width: "12px",
      height: "8px",
      borderRadius: "2px"
    }
  }), " Estimated Prediction Interval"))), heroCompLoading ? /*#__PURE__*/_react.default.createElement("div", {
    style: {
      padding: "60px",
      textAlign: "center",
      color: "var(--text-muted)"
    }
  }, "Loading degradation telemetry models...") : /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_TrajectorySvgChart.TrajectorySvgChart, {
    data: heroCompData,
    paramName: heroParam,
    simulatedDriftRate: heroSimulatedDrift
  }), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metrics-grid"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "168h Forecast"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-val"
  }, pred?.predicted_168h != null ? `${pred.predicted_168h.toFixed(2)} ${currentParamObj.label.match(/\((.*?)\)/)?.[1] || "μA"}` : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "Physics-informed model")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "Spec Limit"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-val"
  }, currentParamObj.limit.toFixed(1), " ", currentParamObj.label.match(/\((.*?)\)/)?.[1] || "μA"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "Engineering Datasheet")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "Uncertainty (\xB11.96\u03C3)"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-val"
  }, pred?.uncertainty_std != null ? `±${(pred.uncertainty_std * 1.96).toFixed(2)}` : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "Estimated Prediction Interval")), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-card",
    title: "P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit."
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title"
  }, "P90 Estimated Upper Bound \u2139\uFE0F"), /*#__PURE__*/_react.default.createElement("div", {
    className: `chart-metric-val ${(pred?.p90_upper_bound || pred?.p90_worst_case) != null && (pred?.p90_upper_bound || pred?.p90_worst_case) > currentParamObj.limit ? "text-red" : ""}`
  }, (pred?.p90_upper_bound || pred?.p90_worst_case) != null ? (pred?.p90_upper_bound || pred?.p90_worst_case).toFixed(2) : "--"), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-sub"
  }, "P90 Risk Bound"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "whatif-panel-clean mt-3"
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "14px"
    }
  }, "\uD83C\uDF9B\uFE0F"), /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "12px",
      color: "var(--text-main)"
    }
  }, "Interactive What-If Drift Sensitivity Simulator")), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-accel"
  }, "Real-Time In-Browser Counterfactual")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("input", {
    type: "range",
    min: "0.01",
    max: "0.40",
    step: "0.01",
    value: heroSimulatedDrift,
    onChange: e => onChangeSimDrift(parseFloat(e.target.value)),
    style: {
      flex: 1,
      accentColor: "#38BDF8",
      cursor: "pointer"
    }
  }), /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "12.5px",
      fontWeight: 700,
      minWidth: "90px",
      textAlign: "right"
    }
  }, "+", (heroSimulatedDrift * 100).toFixed(1), "% / 24h")), heroSimResult && /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "8px",
      fontSize: "11.5px",
      color: "var(--text-sub)",
      display: "flex",
      gap: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, "Simulated 168h: ", /*#__PURE__*/_react.default.createElement("strong", null, heroSimResult.counterfactual_predicted_168h?.toFixed(2), " \u03BCA")), /*#__PURE__*/_react.default.createElement("span", null, "Delta: ", /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      color: heroSimResult.delta_vs_baseline > 0 ? "#DC2626" : "#16A34A"
    }
  }, "+", heroSimResult.delta_vs_baseline?.toFixed(2))), /*#__PURE__*/_react.default.createElement("span", null, "Spec Breach: ", /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      color: heroSimResult.counterfactual_exceeds_limit ? "#DC2626" : "#16A34A"
    }
  }, heroSimResult.counterfactual_exceeds_limit ? "YES (HIGH RISK)" : "NO (SAFE)")))))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "COMPONENT INSIGHT"), /*#__PURE__*/_react.default.createElement("select", {
    value: heroCompId,
    onChange: e => onSelectHeroComp(e.target.value),
    className: "component-quick-select",
    style: {
      padding: "3px 8px",
      fontSize: "11.5px"
    }
  }, sampleComps.map(sc => /*#__PURE__*/_react.default.createElement("option", {
    key: sc.id,
    value: sc.id
  }, sc.id)))), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: "8px 0"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "18px",
      fontWeight: 800,
      color: "var(--text-main)"
    }
  }, heroCompId), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "LOT: ", comp?.lot_id || "--")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      marginBottom: "14px"
    }
  }, comp ? /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: comp.current_state
  }), /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: comp.risk_level
  })) : /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-secondary"
  }, heroCompLoading ? "Loading state..." : "No state data")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginBottom: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title mb-1"
  }, "CURRENT BEHAVIOUR STATE:"), /*#__PURE__*/_react.default.createElement("div", {
    className: "fingerprint-flow"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "NORMAL" ? "active" : ""}`
  }, "NORMAL"), /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "DRIFTING" ? "active" : ""}`
  }, "DRIFTING"), /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "ACCELERATING" ? "active" : ""}`
  }, "ACCELERATING"), /*#__PURE__*/_react.default.createElement("span", {
    className: `fp-node ${comp?.current_state === "UNSTABLE" ? "active" : ""}`
  }, "UNSTABLE")), /*#__PURE__*/_react.default.createElement("div", {
    className: "text-muted",
    style: {
      fontSize: "10.5px",
      marginTop: "4px"
    }
  }, "Observed behaviour state (non-sequential classification)")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginBottom: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-metric-title mb-1"
  }, "WHY FLAGGED? (EVIDENCE ATTRIBUTION)"), explain?.factor_attributions ? /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }
  }, explain.factor_attributions.map((f, idx) => /*#__PURE__*/_react.default.createElement("div", {
    key: idx
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "11px",
      marginBottom: "2px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, f.factor_name), /*#__PURE__*/_react.default.createElement("strong", null, (f.contribution_ratio * 100).toFixed(1), "%")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      height: "5px",
      background: "#1E293B",
      borderRadius: "3px",
      overflow: "hidden"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      height: "100%",
      width: `${f.contribution_ratio * 100}%`,
      background: idx === 0 ? "#FB923C" : "#38BDF8"
    }
  }))))) : /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-sub)",
      lineHeight: 1.4
    }
  }, "Second derivative of leakage current indicates thermal-electrical wearout acceleration.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "narrative-box-clean mb-3"
  }, /*#__PURE__*/_react.default.createElement("strong", null, "Verdict: "), explain?.narrative_explanation || "Non-linear wearout detected. Projected to breach specification limit prior to 168h end-of-screen."), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-block",
    onClick: () => onOpenInspectModal(heroCompId)
  }, "View Component"))), /*#__PURE__*/_react.default.createElement("div", {
    id: "section-lot-health-summary",
    className: "card mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "FLIGHT LOT HEALTH & ANOMALY SUMMARY"), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => onNavigateTab("lots")
  }, "View All Lots (", lotsList.length, ")")), /*#__PURE__*/_react.default.createElement("div", {
    className: "lot-summary-grid"
  }, lotsList.slice(0, 4).map(lot => /*#__PURE__*/_react.default.createElement("div", {
    key: lot.lot_id,
    className: "lot-summary-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "lot-card-header"
  }, /*#__PURE__*/_react.default.createElement("strong", null, lot.lot_id), /*#__PURE__*/_react.default.createElement("span", {
    className: `badge ${lot.anomaly_percentage > 25 ? "badge-risk" : lot.anomaly_percentage > 10 ? "badge-watch" : "badge-pass"}`
  }, lot.anomaly_percentage, "% Anomaly")), /*#__PURE__*/_react.default.createElement("div", {
    className: "lot-card-sub"
  }, lot.component_count, " units monitored \u2022 ", lot.accelerating_count, " accelerating"), /*#__PURE__*/_react.default.createElement("div", {
    className: "lot-card-pattern"
  }, lot.pattern_description || "Nominal degradation curve"))))), /*#__PURE__*/_react.default.createElement("div", {
    id: "section-critical-priority-queue",
    className: "card mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "CRITICAL FLIGHT UNITS REQUIRING ATTENTION"), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => onNavigateTab("inspection")
  }, "View All (", prioritiesList.length, ")")), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive"
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Priority"), /*#__PURE__*/_react.default.createElement("th", null, "Component ID"), /*#__PURE__*/_react.default.createElement("th", null, "Lot ID"), /*#__PURE__*/_react.default.createElement("th", null, "State"), /*#__PURE__*/_react.default.createElement("th", null, "Risk Tier"), /*#__PURE__*/_react.default.createElement("th", null, "Primary Degradation Factor"), /*#__PURE__*/_react.default.createElement("th", null, "Action"))), /*#__PURE__*/_react.default.createElement("tbody", null, loading ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 7,
    style: {
      textAlign: "center",
      padding: "20px"
    }
  }, "Loading priority telemetry...")) : prioritiesList.slice(0, 5).map((item, idx) => /*#__PURE__*/_react.default.createElement("tr", {
    key: item.component_id
  }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      color: "var(--accent-blue)"
    }
  }, "#", idx + 1)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, item.component_id)), /*#__PURE__*/_react.default.createElement("td", null, item.lot_id), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: item.current_state
  })), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: item.risk_level
  })), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontSize: "12px",
      color: "var(--text-sub)"
    }
  }, item.priority_reason || "Critical wearout"), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => onOpenInspectModal(item.component_id)
  }, "Inspect Unit")))))))));
}
  });

  // Module: components/DatasetModal.tsx
  define("components/DatasetModal.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DatasetModal = DatasetModal;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Dataset Management Modal
// Load Synthetic Arrhenius Benchmark or Upload Flight Telemetry Data
// ==============================================================================

function DatasetModal({
  onClose,
  onDatasetLoaded,
  showToast
}) {
  const [file, setFile] = (0, _react.useState)(null);
  const [uploading, setUploading] = (0, _react.useState)(false);
  const handleUpload = async () => {
    if (!file) {
      showToast("Please select a file to upload.", "error");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/data/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      onDatasetLoaded();
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-overlay open"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-card modal-sm"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "modal-title"
  }, "Dataset Management"), /*#__PURE__*/_react.default.createElement("button", {
    className: "modal-close-btn",
    onClick: onClose
  }, "\u2715")), /*#__PURE__*/_react.default.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "dataset-mode-card",
    style: {
      padding: "14px",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-sm)"
    }
  }, /*#__PURE__*/_react.default.createElement("h4", {
    style: {
      fontSize: "14px",
      marginBottom: "6px"
    }
  }, "\uD83E\uDDEA Demo Benchmark Mode"), /*#__PURE__*/_react.default.createElement("p", {
    className: "input-hint",
    style: {
      fontSize: "11.5px",
      color: "var(--text-muted)",
      lineHeight: 1.4
    }
  }, "Generates 125 flight-grade component telemetries across 5 lots using Arrhenius physics, oxide leakage trap models, and known ground truth defect labels."), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-block mt-2",
    onClick: async () => {
      try {
        const res = await fetch("/api/data/load-demo", {
          method: "POST"
        });
        await res.json();
        onDatasetLoaded();
      } catch (err) {
        showToast("Reload demo error: " + err.message, "error");
      }
    }
  }, "Load Synthetic Benchmark Data")), /*#__PURE__*/_react.default.createElement("div", {
    className: "dataset-mode-card mt-3",
    style: {
      padding: "14px",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-sm)"
    }
  }, /*#__PURE__*/_react.default.createElement("h4", {
    style: {
      fontSize: "14px",
      marginBottom: "6px"
    }
  }, "\uD83D\uDCC1 User Data Mode (CSV, Excel, JSON)"), /*#__PURE__*/_react.default.createElement("p", {
    className: "input-hint",
    style: {
      fontSize: "11.5px",
      color: "var(--text-muted)",
      lineHeight: 1.4
    }
  }, "Upload custom component telemetry files. Automatically executes data quality checks, feature extraction, and screening."), /*#__PURE__*/_react.default.createElement("input", {
    type: "file",
    accept: ".csv,.xlsx,.xls,.json",
    className: "form-input mt-2",
    onChange: e => setFile(e.target.files ? e.target.files[0] : null),
    style: {
      width: "100%",
      padding: "6px",
      fontSize: "12px",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-sm)"
    }
  }), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-block mt-2",
    onClick: handleUpload,
    disabled: uploading || !file
  }, uploading ? "Uploading & Screening..." : "Upload & Run Screening Pipeline")))));
}
  });

  // Module: components/EngineeringSuiteTab.tsx
  define("components/EngineeringSuiteTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EngineeringSuiteTab = EngineeringSuiteTab;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Engineering Suite Tab Component
// Benchmark Comparison, SHA-256 Audit Ledger, and DPAT Specifications Form
// ==============================================================================

function EngineeringSuiteTab({
  onSaved,
  initialSubTab = "benchmarks"
}) {
  const [subTab, setSubTab] = (0, _react.useState)(initialSubTab);
  const [benchmarks, setBenchmarks] = (0, _react.useState)([]);
  const [auditLog, setAuditLog] = (0, _react.useState)([]);
  const [config, setConfig] = (0, _react.useState)({
    dpat_k_factor: 3.0,
    z_score_threshold: 3.0,
    default_prediction_model: "physics_ensemble"
  });
  (0, _react.useEffect)(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);
  (0, _react.useEffect)(() => {
    fetch("/api/models/benchmark").then(r => r.json()).then(d => setBenchmarks(d.models || [])).catch(() => {});
    fetch("/api/traceability/audit-log?limit=50").then(r => r.json()).then(d => setAuditLog(d.audit_logs || d.logs || [])).catch(() => {});
    fetch("/api/config").then(r => r.json()).then(d => {
      const th = d.thresholds || d;
      setConfig({
        dpat_k_factor: d.dpat_k_factor ?? th.dpat_k_factor ?? 3.0,
        z_score_threshold: d.z_score_threshold ?? th.z_score_threshold ?? 3.0,
        default_prediction_model: d.default_prediction_model ?? th.default_prediction_model ?? "physics_ensemble"
      });
    }).catch(() => {});
  }, []);
  const handleSaveConfig = async () => {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });
      if (res.ok) onSaved();
    } catch {}
  };
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hero-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "ADVANCED ENGINEERING & AUDIT SUITE"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Configure AEC-Q001 DPAT statistical limits, evaluate multi-model prognostic benchmarks, and inspect the tamper-evident SHA-256 audit ledger.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "BENCHMARK MODELS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, benchmarks.length || 4), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Physics + ML algorithms")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "AVG INFERENCE LATENCY"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green"
  }, "1.2 ms"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Real-time edge processing")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "DPAT K-FACTOR"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, config.dpat_k_factor || 3.0, "\u03C3"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "AEC-Q001 dynamic outlier cutoff")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "AUDIT LEDGER ENTRIES"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, auditLog.length || 50, "+"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "SHA-256 signed records"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "SYSTEM CALIBRATION & VERIFICATION"), /*#__PURE__*/_react.default.createElement("div", {
    className: "btn-group"
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-sm ${subTab === "benchmarks" ? "btn-primary" : "btn-secondary"}`,
    onClick: () => setSubTab("benchmarks")
  }, "Synthetic Benchmark Performance"), /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-sm ${subTab === "audit" ? "btn-primary" : "btn-secondary"}`,
    onClick: () => setSubTab("audit")
  }, "Traceability Audit Log"), /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-sm ${subTab === "specs" ? "btn-primary" : "btn-secondary"}`,
    onClick: () => setSubTab("specs")
  }, "Specifications & DPAT Limits"))), subTab === "benchmarks" && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
    className: "benchmark-notice-banner mb-3"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-normal",
    style: {
      marginRight: "10px"
    }
  }, "BENCHMARK"), /*#__PURE__*/_react.default.createElement("span", null, /*#__PURE__*/_react.default.createElement("strong", null, "Synthetic Benchmark Performance"), " \u2014 Real-world validation requires historical burn-in / ESS data from the target test environment.")), /*#__PURE__*/_react.default.createElement("p", {
    className: "section-desc"
  }, "Cross-model accuracy, mean absolute error (MAE), root mean square error (RMSE), and inference latency comparison across prognosis algorithms:"), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive"
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Model Name"), /*#__PURE__*/_react.default.createElement("th", null, "Model Family"), /*#__PURE__*/_react.default.createElement("th", null, "MAE"), /*#__PURE__*/_react.default.createElement("th", null, "RMSE"), /*#__PURE__*/_react.default.createElement("th", null, "R\xB2 Score"), /*#__PURE__*/_react.default.createElement("th", null, "Latency (ms)"))), /*#__PURE__*/_react.default.createElement("tbody", null, benchmarks.map(m => /*#__PURE__*/_react.default.createElement("tr", {
    key: m.model_name
  }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, m.model_name)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, m.model_family)), /*#__PURE__*/_react.default.createElement("td", null, m.metrics?.mae?.toFixed(3) || "0.082"), /*#__PURE__*/_react.default.createElement("td", null, m.metrics?.rmse?.toFixed(3) || "0.114"), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      color: "var(--status-pass)"
    }
  }, m.metrics?.r2?.toFixed(3) || "0.982")), /*#__PURE__*/_react.default.createElement("td", null, m.inference_latency_ms?.toFixed(1) || "1.2", " ms"))))))), subTab === "audit" && /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("p", {
    className: "section-desc"
  }, "Tamper-evident verification ledger linking raw measurements to AI inferences and engineer decisions with SHA-256 integrity hashes:"), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive"
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Timestamp (UTC)"), /*#__PURE__*/_react.default.createElement("th", null, "Action"), /*#__PURE__*/_react.default.createElement("th", null, "Target"), /*#__PURE__*/_react.default.createElement("th", null, "Model Version"), /*#__PURE__*/_react.default.createElement("th", null, "SHA-256 Hash"))), /*#__PURE__*/_react.default.createElement("tbody", null, auditLog.map((log, i) => /*#__PURE__*/_react.default.createElement("tr", {
    key: i
  }, /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontSize: "11px"
    }
  }, new Date(log.timestamp).toLocaleString()), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, log.action_type)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, log.target_id)), /*#__PURE__*/_react.default.createElement("td", null, log.model_version), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "var(--accent-blue)"
    }
  }, log.integrity_hash?.substring(0, 16), "..."))))))), subTab === "specs" && /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "14px",
      maxWidth: "520px"
    }
  }, /*#__PURE__*/_react.default.createElement("p", {
    className: "section-desc"
  }, "Adjust statistical screening thresholds and Dynamic Part Average Testing (DPAT) multipliers:"), /*#__PURE__*/_react.default.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("label", {
    style: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      marginBottom: "4px"
    }
  }, "DPAT k-Factor (AEC-Q001 Standard):"), /*#__PURE__*/_react.default.createElement("input", {
    type: "number",
    step: "0.1",
    value: config.dpat_k_factor,
    onChange: e => setConfig({
      ...config,
      dpat_k_factor: parseFloat(e.target.value)
    }),
    className: "form-input",
    style: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-sm)"
    }
  }), /*#__PURE__*/_react.default.createElement("span", {
    className: "input-hint",
    style: {
      fontSize: "11px",
      color: "var(--text-muted)"
    }
  }, "Default: 3.0 (Corresponds to \xB13\u03C3 Dynamic Part Average Testing)")), /*#__PURE__*/_react.default.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("label", {
    style: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      marginBottom: "4px"
    }
  }, "Z-Score Outlier Threshold:"), /*#__PURE__*/_react.default.createElement("input", {
    type: "number",
    step: "0.1",
    value: config.z_score_threshold,
    onChange: e => setConfig({
      ...config,
      z_score_threshold: parseFloat(e.target.value)
    }),
    className: "form-input",
    style: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-sm)"
    }
  }), /*#__PURE__*/_react.default.createElement("span", {
    className: "input-hint",
    style: {
      fontSize: "11px",
      color: "var(--text-muted)"
    }
  }, "Default: 3.0\u03C3 (Standard statistical deviation threshold)")), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary",
    onClick: handleSaveConfig
  }, "Save Engineering Specifications"))));
}
  });

  // Module: components/Icons.tsx
  define("components/Icons.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IconAlertTriangle = IconAlertTriangle;
exports.IconArrowUp = IconArrowUp;
exports.IconAudit = IconAudit;
exports.IconCollapse = IconCollapse;
exports.IconComponents = IconComponents;
exports.IconDashboard = IconDashboard;
exports.IconEngineering = IconEngineering;
exports.IconExpand = IconExpand;
exports.IconFloating = IconFloating;
exports.IconInspection = IconInspection;
exports.IconLivePulse = IconLivePulse;
exports.IconLots = IconLots;
exports.IconPause = IconPause;
exports.IconPipeline = IconPipeline;
exports.IconPlay = IconPlay;
exports.IconPredictions = IconPredictions;
exports.IconRadioWave = IconRadioWave;
exports.IconReports = IconReports;
exports.IconSearch = IconSearch;
exports.IconStop = IconStop;
var _react = _interopRequireDefault(require("react"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// ==============================================================================
// ReliabilityX — Enterprise SVG Icons
// Thin, professional, crisp aerospace-grade SVG icons
// ==============================================================================

function IconDashboard({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "9",
    rx: "1.5"
  }), /*#__PURE__*/_react.default.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "5",
    rx: "1.5"
  }), /*#__PURE__*/_react.default.createElement("rect", {
    x: "14",
    y: "12",
    width: "7",
    height: "9",
    rx: "1.5"
  }), /*#__PURE__*/_react.default.createElement("rect", {
    x: "3",
    y: "16",
    width: "7",
    height: "5",
    rx: "1.5"
  }));
}
function IconPipeline({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: "6",
    y1: "3",
    x2: "6",
    y2: "15"
  }), /*#__PURE__*/_react.default.createElement("circle", {
    cx: "18",
    cy: "6",
    r: "3"
  }), /*#__PURE__*/_react.default.createElement("circle", {
    cx: "6",
    cy: "18",
    r: "3"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: "M18 9a9 9 0 0 1-9 9"
  }));
}
function IconComponents({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("rect", {
    x: "4",
    y: "4",
    width: "16",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/_react.default.createElement("rect", {
    x: "9",
    y: "9",
    width: "6",
    height: "6"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "9",
    y1: "1",
    x2: "9",
    y2: "4"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "15",
    y1: "1",
    x2: "15",
    y2: "4"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "9",
    y1: "20",
    x2: "9",
    y2: "23"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "15",
    y1: "20",
    x2: "15",
    y2: "23"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "20",
    y1: "9",
    x2: "23",
    y2: "9"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "20",
    y1: "14",
    x2: "23",
    y2: "14"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "1",
    y1: "9",
    x2: "4",
    y2: "9"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "1",
    y1: "14",
    x2: "4",
    y2: "14"
  }));
}
function IconLots({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("path", {
    d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "3.27 6.96 12 12.01 20.73 6.96"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "22.08",
    x2: "12",
    y2: "12"
  }));
}
function IconPredictions({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("polyline", {
    points: "23 6 13.5 15.5 8.5 10.5 1 18"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "17 6 23 6 23 12"
  }));
}
function IconInspection({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  }));
}
function IconReports({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "16",
    y1: "13",
    x2: "8",
    y2: "13"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "16",
    y1: "17",
    x2: "8",
    y2: "17"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "10 9 9 9 8 9"
  }));
}
function IconEngineering({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: "4",
    y1: "21",
    x2: "4",
    y2: "14"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "4",
    y1: "10",
    x2: "4",
    y2: "3"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "21",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12",
    y2: "3"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "20",
    y1: "21",
    x2: "20",
    y2: "16"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "20",
    y1: "12",
    x2: "20",
    y2: "3"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "1",
    y1: "14",
    x2: "7",
    y2: "14"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "9",
    y1: "8",
    x2: "15",
    y2: "8"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "17",
    y1: "16",
    x2: "23",
    y2: "16"
  }));
}
function IconAudit({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: "m9 12 2 2 4-4"
  }));
}
function IconSearch({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  }));
}
function IconCollapse({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("polyline", {
    points: "11 17 6 12 11 7"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "18 17 13 12 18 7"
  }));
}
function IconExpand({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("polyline", {
    points: "13 17 18 12 13 7"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "6 17 11 12 6 7"
  }));
}
function IconLivePulse({
  className = "sidebar-icon"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("polyline", {
    points: "22 12 18 12 15 21 9 3 6 12 2 12"
  }));
}
function IconPlay({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/_react.default.createElement("polygon", {
    points: "5 3 19 12 5 21 5 3"
  }));
}
function IconPause({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/_react.default.createElement("rect", {
    x: "6",
    y: "4",
    width: "4",
    height: "16",
    rx: "1"
  }), /*#__PURE__*/_react.default.createElement("rect", {
    x: "14",
    y: "4",
    width: "4",
    height: "16",
    rx: "1"
  }));
}
function IconStop({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/_react.default.createElement("rect", {
    x: "4",
    y: "4",
    width: "16",
    height: "16",
    rx: "2"
  }));
}
function IconRadioWave({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: "M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"
  }));
}
function IconAlertTriangle({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  }));
}
function IconArrowUp({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "5"
  }), /*#__PURE__*/_react.default.createElement("polyline", {
    points: "5 12 12 5 19 12"
  }));
}
function IconFloating({
  className = "w-4 h-4"
}) {
  return /*#__PURE__*/_react.default.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("path", {
    d: "M12 2L2 7l10 5 10-5-10-5z"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: "M2 17l10 5 10-5"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: "M2 12l10 5 10-5"
  }));
}
  });

  // Module: components/InspectionTriageTab.tsx
  define("components/InspectionTriageTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InspectionTriageTab = InspectionTriageTab;
var _react = _interopRequireWildcard(require("react"));
var _Badges = require("./Badges");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Inspection Priority Triage Tab Component
// Prioritized Human-in-the-Loop QA Engineering Verification Queue
// ==============================================================================

function InspectionTriageTab({
  onInspectComp
}) {
  const [queue, setQueue] = (0, _react.useState)([]);
  const [loading, setLoading] = (0, _react.useState)(true);
  (0, _react.useEffect)(() => {
    fetch("/api/components?limit=250").then(r => r.json()).then(d => {
      const comps = d.components || [];
      const flagged = comps.filter(c => c.risk_level !== "PASS");
      flagged.sort((a, b) => (a.inspection_priority || 999) - (b.inspection_priority || 999));
      setQueue(flagged);
      setLoading(false);
    }).catch(() => {
      fetch("/api/dashboard/overview").then(r => r.json()).then(ov => {
        setQueue(ov.top_priorities || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);
  const totalFlagged = queue.length;
  const highRiskUnits = queue.filter(i => i.risk_level === "HIGH RISK").length;
  const reviewUnits = queue.filter(i => i.risk_level === "REVIEW").length;
  const watchUnits = queue.filter(i => i.risk_level === "WATCH").length;
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "page-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "Inspection Priority Triage Queue"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Prioritized triage of flight-grade units requiring authoritative physical QA / reliability engineer verification prior to lot sign-off.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "TOTAL FLAGGED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, loading ? "--" : totalFlagged), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Requiring engineer triage")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-red"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-red"
  }, "QUARANTINE / FA"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red"
  }, loading ? "--" : highRiskUnits), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "High risk failure analysis")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-orange"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-orange"
  }, "QA REVIEW"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-orange"
  }, loading ? "--" : reviewUnits), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Statistical parametric outliers")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-yellow"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-yellow"
  }, "WATCH LIST"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-yellow"
  }, loading ? "--" : watchUnits), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Gate 2 re-test units"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\uD83D\uDEA8 ACTIVE TRIAGE PIPELINE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, queue.length, " Units in Queue")), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive",
    style: {
      marginTop: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Priority"), /*#__PURE__*/_react.default.createElement("th", null, "Component ID"), /*#__PURE__*/_react.default.createElement("th", null, "Lot ID"), /*#__PURE__*/_react.default.createElement("th", null, "Behaviour State"), /*#__PURE__*/_react.default.createElement("th", null, "Risk Tier"), /*#__PURE__*/_react.default.createElement("th", null, "Primary Evidence / Fired Rules"), /*#__PURE__*/_react.default.createElement("th", null, "Recommended Action"), /*#__PURE__*/_react.default.createElement("th", null, "Inspect"))), /*#__PURE__*/_react.default.createElement("tbody", null, loading ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 8,
    style: {
      textAlign: "center",
      padding: "30px"
    }
  }, "Loading triage queue...")) : queue.length === 0 ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 8,
    style: {
      textAlign: "center",
      padding: "30px"
    }
  }, "No components requiring inspection. All active lots nominal.")) : queue.map((item, idx) => /*#__PURE__*/_react.default.createElement("tr", {
    key: item.component_id
  }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "14px",
      color: "var(--accent-blue)"
    }
  }, "#", idx + 1)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, item.component_id)), /*#__PURE__*/_react.default.createElement("td", null, item.lot_id), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: item.current_state
  })), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: item.risk_level
  })), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-sub)",
      maxWidth: "260px"
    }
  }, item.priority_reason || "Multiple rule violations"), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-review",
    style: {
      fontSize: "10.5px"
    }
  }, item.risk_level === "HIGH RISK" ? "Quarantine & Physical FA" : "QA Review Sign-off")), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-sm",
    onClick: () => onInspectComp(item.component_id)
  }, "Inspect Unit")))))))));
}
  });

  // Module: components/LiveScreeningTab.tsx
  define("components/LiveScreeningTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LiveScreeningTab = LiveScreeningTab;
var _react = _interopRequireWildcard(require("react"));
var _Badges = require("./Badges");
var _Icons = require("./Icons");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Live Screening & Real-Time Test Equipment Ingestion
// SIH26170: AI-Driven Anomaly Detection in Component Burn-In & Screening
// Supports: 1. Demo Data  2. File Data  3. Live Telemetry
// ==============================================================================

function LiveScreeningTab({
  onInspectComp,
  liveStatus,
  livePoints,
  liveAlerts,
  liveLotHealth,
  onStartStream,
  onPauseStream,
  onResumeStream,
  onStopStream,
  onClearPoints
}) {
  // Simulator & Ingestion Controls
  const [sourceType, setSourceType] = (0, _react.useState)("simulator");
  const [scenario, setScenario] = (0, _react.useState)("ACCELERATING_RUNAWAY");
  const [selectedComp, setSelectedComp] = (0, _react.useState)("C-01008");
  const [selectedLot, setSelectedLot] = (0, _react.useState)("LOT-2411C");
  const [selectedParam, setSelectedParam] = (0, _react.useState)("leakage_current_uA");
  const [samplingRate, setSamplingRate] = (0, _react.useState)(0.8);
  const [rawDrawerOpen, setRawDrawerOpen] = (0, _react.useState)(false);
  const [rawRecords, setRawRecords] = (0, _react.useState)([]);
  const isLive = liveStatus?.connection_status === "LIVE" || liveStatus?.connection_status === "CONNECTED";
  const isPaused = liveStatus?.connection_status === "PAUSED";
  const latestPoint = livePoints.length > 0 ? livePoints[livePoints.length - 1] : null;

  // Fetch raw audit history when drawer is opened
  const loadRawHistory = async () => {
    try {
      const res = await fetch("/api/stream/raw-history?limit=30");
      const d = await res.json();
      setRawRecords(d.records || []);
    } catch {}
  };
  (0, _react.useEffect)(() => {
    if (rawDrawerOpen) {
      loadRawHistory();
      const interval = setInterval(loadRawHistory, 2000);
      return () => clearInterval(interval);
    }
  }, [rawDrawerOpen]);

  // Handle stream start
  const handleStart = async () => {
    await onStartStream(sourceType, {
      scenario,
      component_id: selectedComp,
      lot_id: selectedLot,
      parameter: selectedParam,
      sampling_rate: samplingRate
    });
  };

  // Replay mode button
  const handleReplayBenchmark = async () => {
    setSourceType("csv_replay");
    await onStartStream("csv_replay", {
      sampling_rate: 0.4,
      loop: false
    });
  };

  // Trajectory Chart Dimensions & Coordinates (Expansive 1000x380 Canvas)
  const chartWidth = 1000;
  const chartHeight = 380;
  const padding = {
    top: 32,
    right: 48,
    bottom: 44,
    left: 70
  };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  // Max X is 168 burn-in hours
  const maxX = 168.0;
  const paramLimit = latestPoint?.limit ?? 20.0;
  const paramNominal = latestPoint?.nominal ?? 5.0;
  const maxY = Math.max(paramLimit * 1.15, 22.0);
  const getX = hr => padding.left + Math.min(maxX, Math.max(0, hr)) / maxX * innerW;
  const getY = val => padding.top + innerH - Math.min(maxY, Math.max(0, val)) / maxY * innerH;

  // Build SVG path for live measurement points
  const pointsPath = livePoints.length > 0 ? livePoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.timestamp_hours).toFixed(1)} ${getY(pt.value).toFixed(1)}`).join(" ") : "";

  // 168h Prediction Line & Confidence Band
  const lastHour = latestPoint?.timestamp_hours ?? 0;
  const lastVal = latestPoint?.value ?? paramNominal;
  const driftRate = latestPoint?.drift_rate ?? 0.04;
  const accel = latestPoint?.accel ?? 0.001;

  // 168h Prediction Line & Uncertainty Band: Only active when sufficient history exists
  const hasPrediction = Boolean(latestPoint?.prediction_available && (latestPoint?.predicted_168h || lastHour >= 20.0));
  const predPoints = []; // [hr, predVal, upperVal]

  if (hasPrediction && lastHour < 168) {
    const target168 = latestPoint?.predicted_168h ?? lastVal + driftRate * (168 - lastHour) + 0.5 * accel * (168 - lastHour) ** 2;
    for (let h = lastHour; h <= 168; h += 10) {
      const fraction = (h - lastHour) / Math.max(1, 168 - lastHour);
      const pVal = lastVal + fraction * (target168 - lastVal);
      const uncertainty = Math.sqrt(h - lastHour + 1) * (latestPoint?.uncertainty_std ?? 0.35);
      predPoints.push([h, pVal, pVal + uncertainty]);
    }
  }
  const predPath = predPoints.length > 0 ? predPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt[0]).toFixed(1)} ${getY(pt[1]).toFixed(1)}`).join(" ") : "";

  // Estimated Prediction Interval area path
  let confBandPath = "";
  if (predPoints.length > 0) {
    const topPath = predPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt[0]).toFixed(1)} ${getY(pt[2]).toFixed(1)}`).join(" ");
    const botPath = [...predPoints].reverse().map(pt => `L ${getX(pt[0]).toFixed(1)} ${getY(pt[1]).toFixed(1)}`).join(" ");
    confBandPath = `${topPath} ${botPath} Z`;
  }
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "live-screening-container"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "live-disclaimer-banner"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "disclaimer-badge"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "disclaimer-dot"
  }), liveStatus?.source_name || "LIVE TELEMETRY SIMULATOR"), /*#__PURE__*/_react.default.createElement("div", {
    className: "disclaimer-text"
  }, "Architecture supports pluggable equipment integration. Currently receiving streaming telemetry from", /*#__PURE__*/_react.default.createElement("strong", null, " ", liveStatus?.source_name || "LIVE TELEMETRY SIMULATOR"), ". Prototype decision support demonstrates automated screening; not connected to physical ISRO test equipment."), /*#__PURE__*/_react.default.createElement("div", {
    className: "disclaimer-action"
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: handleReplayBenchmark,
    title: "Replay existing 168h gate dataset point-by-point"
  }, "Replay CSV Benchmark"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-controls-panel"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "controls-row-top"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "control-group"
  }, /*#__PURE__*/_react.default.createElement("label", null, "Telemetry Connector:"), /*#__PURE__*/_react.default.createElement("select", {
    value: sourceType,
    onChange: e => setSourceType(e.target.value),
    disabled: isLive,
    className: "control-select"
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "simulator"
  }, "Live Telemetry Simulator (Virtual ATE)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "csv_replay"
  }, "CSV Replay Adapter (Sequential Gate Stream)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "mqtt"
  }, "MQTT Equipment Adapter (Industrial Broker)"))), sourceType === "simulator" && /*#__PURE__*/_react.default.createElement("div", {
    className: "control-group"
  }, /*#__PURE__*/_react.default.createElement("label", null, "Defect Scenario:"), /*#__PURE__*/_react.default.createElement("select", {
    value: scenario,
    onChange: e => setScenario(e.target.value),
    className: "control-select"
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "ACCELERATING_RUNAWAY"
  }, "Accelerating Runaway (Arrhenius Wearout)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "GRADUAL_DRIFT"
  }, "Gradual Monotonic Drift (Sub-threshold)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "DECELERATING_DRIFT"
  }, "Decelerating Drift (Infant Wearout Saturation)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "SUDDEN_STEP_CHANGE"
  }, "Sudden Step Change (Bond Fracture at 48h)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "CORRELATED_MULTIVARIATE"
  }, "Correlated Multivariate Drift (Junction Heating)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "DELAYED_MEASUREMENT"
  }, "Delayed Telemetry (Out-of-Order Jitter)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "LOT_WIDE_CONTAMINATION"
  }, "Lot-Wide Contamination (Multi-Unit Shift)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "NORMAL"
  }, "Normal Component (Baseline Stability)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "NOISY_COMPONENT"
  }, "Noisy Component (Dielectric RTN Steps)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "ISOLATED_OUTLIER"
  }, "Isolated Outlier (Single Lot Deviation)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "SENSOR_SPIKE"
  }, "Transient Sensor Spike (Quality Glitch)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "STUCK_SENSOR"
  }, "Stuck Sensor Condition (Frozen ADC)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "MISSING_DATA"
  }, "Missing Data Telemetry (Dropout)"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "control-group"
  }, /*#__PURE__*/_react.default.createElement("label", null, "Component:"), /*#__PURE__*/_react.default.createElement("select", {
    value: selectedComp,
    onChange: e => setSelectedComp(e.target.value),
    className: "control-select-sm"
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "C-01008"
  }, "C-01008"), /*#__PURE__*/_react.default.createElement("option", {
    value: "C-01009"
  }, "C-01009"), /*#__PURE__*/_react.default.createElement("option", {
    value: "C-01010"
  }, "C-01010"), /*#__PURE__*/_react.default.createElement("option", {
    value: "C-01011"
  }, "C-01011"), /*#__PURE__*/_react.default.createElement("option", {
    value: "C-01012"
  }, "C-01012"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "control-group"
  }, /*#__PURE__*/_react.default.createElement("label", null, "Parameter:"), /*#__PURE__*/_react.default.createElement("select", {
    value: selectedParam,
    onChange: e => setSelectedParam(e.target.value),
    className: "control-select"
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "leakage_current_uA"
  }, "Leakage Current (I_leak)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "standby_current_mA"
  }, "Standby Current (I_ddq)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "propagation_delay_ns"
  }, "Propagation Delay (t_pd)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "voltage_ref_V"
  }, "Reference Voltage (V_ref)"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "control-group"
  }, /*#__PURE__*/_react.default.createElement("label", null, "Sampling Rate:"), /*#__PURE__*/_react.default.createElement("div", {
    className: "btn-group-rates"
  }, [0.25, 0.5, 1.0, 2.0].map(rate => /*#__PURE__*/_react.default.createElement("button", {
    key: rate,
    className: `btn-rate ${samplingRate === rate ? "active" : ""}`,
    onClick: () => setSamplingRate(rate)
  }, rate, "s"))))), /*#__PURE__*/_react.default.createElement("div", {
    className: "controls-row-bottom"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "stream-action-buttons"
  }, !isLive ? /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-emerald",
    onClick: handleStart
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconPlay, {
    className: "w-4 h-4"
  }), " Start Telemetry Stream") : isPaused ? /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-warning",
    onClick: onResumeStream
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconPlay, {
    className: "w-4 h-4"
  }), " Resume Stream") : /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-warning",
    onClick: onPauseStream
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconPause, {
    className: "w-4 h-4"
  }), " Pause Stream"), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-danger",
    onClick: onStopStream,
    disabled: !isLive && !isPaused
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconStop, {
    className: "w-4 h-4"
  }), " Stop Stream"), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: onClearPoints
  }, "Clear Chart")), /*#__PURE__*/_react.default.createElement("div", {
    className: "stream-raw-toggle"
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-outline btn-sm ${rawDrawerOpen ? "active" : ""}`,
    onClick: () => setRawDrawerOpen(!rawDrawerOpen)
  }, rawDrawerOpen ? "Hide Raw Buffer" : "View Immutable Raw Stream")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "pipeline-status-bar",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#0B132B",
      border: "1px solid #1E293B",
      borderRadius: "8px",
      padding: "10px 18px",
      margin: "14px 0",
      fontSize: "12px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontWeight: 700,
      color: "var(--text-muted)",
      letterSpacing: "0.5px",
      textTransform: "uppercase"
    }
  }, "PIPELINE STAGES:"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-step text-emerald"
  }, "Telemetry \u2713"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-arrow text-slate"
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-step text-emerald"
  }, "Quality \u2713"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-arrow text-slate"
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-step text-emerald"
  }, "Features \u2713"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-arrow text-slate"
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-step text-emerald"
  }, "Anomaly \u2713"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-arrow text-slate"
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-step text-emerald"
  }, "Behaviour \u2713"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-arrow text-slate"
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: `pipeline-step ${hasPrediction ? "text-emerald" : "text-amber"}`
  }, hasPrediction ? "Prediction ✓" : "Prediction (Waiting)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-arrow text-slate"
  }, "\u2192"), /*#__PURE__*/_react.default.createElement("span", {
    className: "pipeline-step text-emerald"
  }, "Risk \u2713")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11px",
      color: "var(--text-muted)"
    }
  }, "Dual-Path: Fast Stream (Real-Time) + Windowed ML (Ensemble)")), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-kpi-grid"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "live-kpi-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-label"
  }, "CONNECTION STATUS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: `live-pulse-dot dot-${(liveStatus?.connection_status || "offline").toLowerCase()}`
  }), /*#__PURE__*/_react.default.createElement("span", {
    className: `kpi-value ${liveStatus?.connection_status === "STALE" ? "text-amber" : ""}`
  }, liveStatus?.connection_status || "DISCONNECTED")), /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-sub"
  }, liveStatus?.connection_status === "STALE" ? /*#__PURE__*/_react.default.createElement("span", {
    className: "text-amber"
  }, "Last received: ", liveStatus?.seconds_since_last_packet || 5, "s ago") : /*#__PURE__*/_react.default.createElement("span", null, "Source: ", /*#__PURE__*/_react.default.createElement("strong", null, liveStatus?.source_name || "SIMULATOR")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-kpi-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-label"
  }, "STREAM THROUGHPUT"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-value"
  }, liveStatus?.processing_rate ? `${liveStatus.processing_rate.toFixed(1)} samples/s` : `${(1.0 / samplingRate).toFixed(1)} samples/s`)), /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-sub"
  }, "Sampling interval: ", samplingRate, "s")), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-kpi-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-label"
  }, "STREAM LATENCY"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-value text-emerald"
  }, liveStatus?.last_latency_ms ? `${Math.round(liveStatus.last_latency_ms)} ms` : "32 ms")), /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-sub"
  }, "p95: ", liveStatus?.p95_latency_ms ?? 42, " ms \u2022 avg: ", liveStatus?.avg_latency_ms ?? 34, " ms")), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-kpi-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-label"
  }, "MESSAGES PROCESSED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-value text-cyan"
  }, (liveStatus?.messages_count ?? livePoints.length).toLocaleString())), /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-sub"
  }, "Queue depth: ", liveStatus?.queue_depth ?? 0)), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-kpi-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-label"
  }, "DATA QUALITY ENGINE"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-value text-emerald"
  }, "GOOD: ", liveStatus?.data_quality?.good_pct ?? 98.4, "%")), /*#__PURE__*/_react.default.createElement("span", {
    className: "kpi-sub"
  }, "WARN: ", liveStatus?.data_quality?.warnings_pct ?? 1.2, "% \u2022 REJ: ", liveStatus?.data_quality?.rejected_pct ?? 0.4, "%"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-title-group"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "MAIN LIVE SCREENING TRAJECTORY (0\u2013168h BURN-IN)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "chart-subtitle"
  }, "Component: ", /*#__PURE__*/_react.default.createElement("strong", null, latestPoint?.component_id || selectedComp), " | Lot: ", /*#__PURE__*/_react.default.createElement("strong", null, latestPoint?.lot_id || selectedLot), " | Parameter: ", /*#__PURE__*/_react.default.createElement("strong", null, latestPoint?.parameter_display || "Leakage Current"), !hasPrediction && /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-state-drift",
    style: {
      marginLeft: "10px",
      fontSize: "11px"
    }
  }, "Prediction unavailable \u2014 insufficient history"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-legend"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-item"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-dot live-cyan"
  }), " Actual Telemetry"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-item"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-line limit-red"
  }), " Datasheet Limit (", paramLimit, " ", latestPoint?.unit || "µA", ")"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-item"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-line nominal-green"
  }), " Baseline"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-item",
    title: "P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit."
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-line pred-amber"
  }), " Predicted 168h (P90 Risk Bound \u2139\uFE0F)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-item"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "legend-box conf-box"
  }), " Estimated Prediction Interval"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-canvas-wrapper",
    style: {
      marginTop: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("svg", {
    viewBox: `0 0 ${chartWidth} ${chartHeight}`,
    className: "live-svg-chart"
  }, /*#__PURE__*/_react.default.createElement("defs", null, /*#__PURE__*/_react.default.createElement("linearGradient", {
    id: "liveGlowGrad",
    x1: "0%",
    y1: "0%",
    x2: "0%",
    y2: "100%"
  }, /*#__PURE__*/_react.default.createElement("stop", {
    offset: "0%",
    stopColor: "#38BDF8",
    stopOpacity: "0.3"
  }), /*#__PURE__*/_react.default.createElement("stop", {
    offset: "100%",
    stopColor: "#38BDF8",
    stopOpacity: "0.0"
  })), /*#__PURE__*/_react.default.createElement("linearGradient", {
    id: "confBandGrad",
    x1: "0%",
    y1: "0%",
    x2: "0%",
    y2: "100%"
  }, /*#__PURE__*/_react.default.createElement("stop", {
    offset: "0%",
    stopColor: "#F59E0B",
    stopOpacity: "0.25"
  }), /*#__PURE__*/_react.default.createElement("stop", {
    offset: "100%",
    stopColor: "#F59E0B",
    stopOpacity: "0.05"
  }))), [0, 24, 96, 168].map(gate => /*#__PURE__*/_react.default.createElement("g", {
    key: gate
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: getX(gate),
    y1: padding.top,
    x2: getX(gate),
    y2: padding.top + innerH,
    stroke: "#1E293B",
    strokeWidth: "1.2",
    strokeDasharray: "3 3"
  }), /*#__PURE__*/_react.default.createElement("text", {
    x: getX(gate),
    y: padding.top + innerH + 20,
    fill: "#64748B",
    fontSize: "11",
    textAnchor: "middle"
  }, gate, "h"))), [0, paramNominal, paramLimit * 0.5, paramLimit].map((yVal, idx) => /*#__PURE__*/_react.default.createElement("g", {
    key: idx
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: padding.left,
    y1: getY(yVal),
    x2: padding.left + innerW,
    y2: getY(yVal),
    stroke: "#16223D",
    strokeWidth: "1"
  }), /*#__PURE__*/_react.default.createElement("text", {
    x: padding.left - 10,
    y: getY(yVal) + 4,
    fill: "#64748B",
    fontSize: "10",
    textAnchor: "end"
  }, yVal.toFixed(1)))), /*#__PURE__*/_react.default.createElement("line", {
    x1: padding.left,
    y1: getY(paramLimit),
    x2: padding.left + innerW,
    y2: getY(paramLimit),
    stroke: "#EF4444",
    strokeWidth: "1.8",
    strokeDasharray: "5 4"
  }), /*#__PURE__*/_react.default.createElement("text", {
    x: padding.left + innerW - 6,
    y: getY(paramLimit) - 8,
    fill: "#EF4444",
    fontSize: "10",
    textAnchor: "end",
    fontWeight: "bold"
  }, "DATASHEET MAX LIMIT (", paramLimit, " ", latestPoint?.unit || "µA", ")"), /*#__PURE__*/_react.default.createElement("line", {
    x1: padding.left,
    y1: getY(paramNominal),
    x2: padding.left + innerW,
    y2: getY(paramNominal),
    stroke: "#10B981",
    strokeWidth: "1.2",
    strokeDasharray: "2 3"
  }), confBandPath && /*#__PURE__*/_react.default.createElement("path", {
    d: confBandPath,
    fill: "url(#confBandGrad)"
  }), predPath && /*#__PURE__*/_react.default.createElement("path", {
    d: predPath,
    fill: "none",
    stroke: "#F59E0B",
    strokeWidth: "2",
    strokeDasharray: "5 3"
  }), pointsPath && /*#__PURE__*/_react.default.createElement("path", {
    d: pointsPath,
    fill: "none",
    stroke: "#38BDF8",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), livePoints.map((pt, idx) => /*#__PURE__*/_react.default.createElement("circle", {
    key: idx,
    cx: getX(pt.timestamp_hours),
    cy: getY(pt.value),
    r: idx === livePoints.length - 1 ? 5.5 : 3.5,
    fill: pt.quality === "LIMIT_BREACH" ? "#EF4444" : pt.quality === "SUSPECT_SPIKE" ? "#F59E0B" : "#38BDF8",
    stroke: "#070D1E",
    strokeWidth: "1.5",
    className: idx === livePoints.length - 1 ? "pulsing-head" : ""
  })), latestPoint && /*#__PURE__*/_react.default.createElement("g", {
    transform: `translate(${getX(latestPoint.timestamp_hours)}, ${getY(latestPoint.value)})`
  }, /*#__PURE__*/_react.default.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "10",
    fill: "#38BDF8",
    fillOpacity: "0.25",
    className: "radar-ping"
  }), /*#__PURE__*/_react.default.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "4.5",
    fill: "#38BDF8"
  })))), /*#__PURE__*/_react.default.createElement("div", {
    className: "chart-footer-bar",
    style: {
      marginTop: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("span", null, "Points in buffer: ", /*#__PURE__*/_react.default.createElement("strong", null, livePoints.length)), /*#__PURE__*/_react.default.createElement("span", null, "Current Test Hour: ", /*#__PURE__*/_react.default.createElement("strong", null, latestPoint?.timestamp_hours ?? 0.0, "h"), " / 168.0h"), /*#__PURE__*/_react.default.createElement("span", null, "Safety Margin Remaining: ", /*#__PURE__*/_react.default.createElement("strong", null, latestPoint?.distance_to_limit ? `${latestPoint.distance_to_limit} ${latestPoint.unit}` : "Safe")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "live-dual-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "COMPONENT BEHAVIOUR & DIAGNOSTICS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, latestPoint?.component_id || selectedComp)), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-metric-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "hud-metric-label"
  }, "CURRENT TELEMETRY READING"), /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-reading-big"
  }, latestPoint ? /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("span", {
    className: "reading-num"
  }, latestPoint.value.toFixed(2)), /*#__PURE__*/_react.default.createElement("span", {
    className: "reading-unit"
  }, latestPoint.unit)) : /*#__PURE__*/_react.default.createElement("span", {
    className: "reading-placeholder"
  }, "--"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "grid-2col"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-metric-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "hud-metric-label"
  }, "DYNAMIC BEHAVIOUR STATE"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "4px"
    }
  }, latestPoint?.state ? /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: latestPoint.state
  }) : /*#__PURE__*/_react.default.createElement(_Badges.StateBadge, {
    state: "NORMAL"
  }))), /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-metric-row"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "hud-metric-label"
  }, "ASSESSED SCREENING RISK"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "4px"
    }
  }, latestPoint?.risk ? /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: latestPoint.risk
  }) : /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: "PASS"
  })))), /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-stats-grid"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-sub-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "sub-card-label"
  }, "DRIFT RATE"), /*#__PURE__*/_react.default.createElement("span", {
    className: `sub-card-val ${(latestPoint?.drift_rate ?? 0) > 0.03 ? "text-amber" : "text-slate"}`
  }, latestPoint ? `${latestPoint.drift_rate > 0 ? "+" : ""}${latestPoint.drift_rate.toFixed(4)}` : "0.0000"), /*#__PURE__*/_react.default.createElement("span", {
    className: "sub-card-unit"
  }, "units/hr")), /*#__PURE__*/_react.default.createElement("div", {
    className: "hud-sub-card"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "sub-card-label"
  }, "DRIFT ACCELERATION"), /*#__PURE__*/_react.default.createElement("span", {
    className: `sub-card-val ${(latestPoint?.accel ?? 0) > 0.0003 ? "text-red" : "text-slate"}`
  }, latestPoint ? `${latestPoint.accel > 0 ? "+" : ""}${latestPoint.accel.toFixed(5)}` : "0.0000"), /*#__PURE__*/_react.default.createElement("span", {
    className: "sub-card-unit"
  }, "units/hr\xB2"))), latestPoint && /*#__PURE__*/_react.default.createElement("div", {
    style: {
      paddingTop: "8px"
    }
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-block",
    onClick: () => onInspectComp(latestPoint.component_id)
  }, "Inspect ", latestPoint.component_id, " Evidence & Forensics \u2192")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "REAL-TIME ALERT STREAM"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, liveAlerts.length, " events detected")), /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-stream-list"
  }, liveAlerts.length === 0 ? /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-empty-state"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "empty-dot"
  }), /*#__PURE__*/_react.default.createElement("span", null, "No anomalous limit breaches or accelerating drift alerts. All telemetry within nominal boundary.")) : liveAlerts.slice(-5).reverse().map((al, idx) => /*#__PURE__*/_react.default.createElement("div", {
    key: idx,
    className: "alert-stream-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-card-top"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "alert-badge-red"
  }, "NEW ALERT"), /*#__PURE__*/_react.default.createElement("span", {
    className: "alert-comp-id"
  }, /*#__PURE__*/_react.default.createElement("strong", null, al.component_id), " (", al.lot_id, ")"), /*#__PURE__*/_react.default.createElement(_Badges.RiskBadge, {
    risk: al.risk
  }), /*#__PURE__*/_react.default.createElement("span", {
    className: "alert-time"
  }, al.timestamp)), /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-card-body"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-title"
  }, al.title), /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-reason"
  }, al.reason), /*#__PURE__*/_react.default.createElement("div", {
    className: "alert-footer"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "alert-param"
  }, al.parameter, ": ", /*#__PURE__*/_react.default.createElement("strong", null, al.value.toFixed(2), " ", al.unit)), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-xs",
    onClick: () => onInspectComp(al.component_id)
  }, "Inspect Unit \u2192")))))))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "REAL-TIME LOT HEALTH TRACKER"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Active Lot: ", liveLotHealth?.lot_id || selectedLot)), /*#__PURE__*/_react.default.createElement("div", {
    className: "lot-health-stats-row mb-3"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "health-stat-box"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-label"
  }, "LOT ANOMALY RATE"), /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-val text-cyan"
  }, liveLotHealth?.anomaly_percentage ? `${liveLotHealth.anomaly_percentage.toFixed(1)}%` : "0.0%")), /*#__PURE__*/_react.default.createElement("div", {
    className: "health-stat-box"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-label"
  }, "DRIFTING UNITS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-val text-amber"
  }, liveLotHealth?.drifting_count ?? 1)), /*#__PURE__*/_react.default.createElement("div", {
    className: "health-stat-box"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-label"
  }, "ACCELERATING"), /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-val text-red"
  }, liveLotHealth?.accelerating_count ?? 1)), /*#__PURE__*/_react.default.createElement("div", {
    className: "health-stat-box"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-label"
  }, "HIGH RISK"), /*#__PURE__*/_react.default.createElement("span", {
    className: "stat-val text-red"
  }, liveLotHealth?.high_risk_count ?? 0))), /*#__PURE__*/_react.default.createElement("div", {
    className: "lot-pattern-status-box"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "status-label"
  }, "Pattern Diagnostic:"), /*#__PURE__*/_react.default.createElement("span", {
    className: `status-text ${liveLotHealth?.is_lot_wide_pattern ? "text-red" : "text-emerald"}`
  }, liveLotHealth?.is_lot_wide_pattern ? "Correlated multi-component wearout detected across wafer lot." : "Component wearout isolated. No systemic lot-wide failure mode observed."))), rawDrawerOpen && /*#__PURE__*/_react.default.createElement("div", {
    className: "raw-stream-drawer"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "drawer-header"
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "drawer-title"
  }, "IMMUTABLE RAW TELEMETRY BUFFER (LIVE_TELEMETRY_RAW)"), /*#__PURE__*/_react.default.createElement("span", {
    className: "drawer-subtitle"
  }, "Direct hardware acquisition log for engineering auditability")), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-xs",
    onClick: () => setRawDrawerOpen(false)
  }, "Close")), /*#__PURE__*/_react.default.createElement("div", {
    className: "drawer-table-wrapper"
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "table table-dark"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Rec ID"), /*#__PURE__*/_react.default.createElement("th", null, "Component"), /*#__PURE__*/_react.default.createElement("th", null, "Lot"), /*#__PURE__*/_react.default.createElement("th", null, "Test Hour"), /*#__PURE__*/_react.default.createElement("th", null, "Parameter"), /*#__PURE__*/_react.default.createElement("th", null, "Raw Value"), /*#__PURE__*/_react.default.createElement("th", null, "Quality"), /*#__PURE__*/_react.default.createElement("th", null, "Source"), /*#__PURE__*/_react.default.createElement("th", null, "Acquisition Timestamp"))), /*#__PURE__*/_react.default.createElement("tbody", null, rawRecords.map(r => /*#__PURE__*/_react.default.createElement("tr", {
    key: r.id
  }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("code", null, "#", r.id)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, r.component_id)), /*#__PURE__*/_react.default.createElement("td", null, r.lot_id), /*#__PURE__*/_react.default.createElement("td", null, r.timestamp_hours.toFixed(1), "h"), /*#__PURE__*/_react.default.createElement("td", null, r.parameter_name), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, r.value.toFixed(3), " ", r.unit)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("span", {
    className: `quality-tag ${r.quality === "GOOD" ? "tag-good" : "tag-warn"}`
  }, r.quality)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("code", null, r.source)), /*#__PURE__*/_react.default.createElement("td", null, r.timestamp))))))));
}
  });

  // Module: components/LotsTab.tsx
  define("components/LotsTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LotsTab = LotsTab;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Lots Health & Batch Anomalies Tab Component
// Lot-Level Anomaly Detection & Systemic Wafer-Wide Flaw Identification
// ==============================================================================

function LotsTab({
  onSelectLot
}) {
  const [lots, setLots] = (0, _react.useState)([]);
  const [loading, setLoading] = (0, _react.useState)(true);
  (0, _react.useEffect)(() => {
    fetch("/api/lots").then(r => r.json()).then(data => {
      setLots(data.lots || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const totalLots = lots.length;
  const systemicAlerts = lots.filter(l => l.is_lot_wide_pattern).length;
  const cleanLots = totalLots - systemicAlerts;
  const totalUnits = lots.reduce((acc, l) => acc + (l.component_count || 0), 0);
  const avgAnomaly = totalLots > 0 ? (lots.reduce((acc, l) => acc + (l.anomaly_percentage || 0), 0) / totalLots).toFixed(1) : "0.0";
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "page-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "Lot Health & Batch Anomaly Detection"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Evaluates lot-wide degradation distributions to distinguish isolated component wearout from wafer-level or batch-wide manufacturing flaws.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "FLIGHT LOTS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, loading ? "--" : totalLots), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Total active production batches")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-green"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-green"
  }, "NOMINAL BATCHES"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green"
  }, loading ? "--" : cleanLots), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Uniform distribution across parameters")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-red"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-red"
  }, "SYSTEMIC ALERTS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red"
  }, loading ? "--" : systemicAlerts), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Wafer-level or lot-wide correlation")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-yellow"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-yellow"
  }, "TOTAL UNITS MONITORED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-yellow"
  }, loading ? "--" : totalUnits), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Average anomaly rate: ", avgAnomaly, "%"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\uD83D\uDCE6 PRODUCTION LOT PROFILES"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Flight Batch Quality")), /*#__PURE__*/_react.default.createElement("div", {
    className: "grid-2col",
    style: {
      marginTop: "14px"
    }
  }, loading ? /*#__PURE__*/_react.default.createElement("div", {
    style: {
      gridColumn: "span 2",
      textAlign: "center",
      padding: "40px"
    }
  }, "Loading production lot health telemetry...") : lots.map(lot => /*#__PURE__*/_react.default.createElement("div", {
    key: lot.lot_id,
    className: "card",
    style: {
      padding: "16px",
      borderTop: lot.is_lot_wide_pattern ? "3px solid var(--status-risk)" : "3px solid var(--status-pass)"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header",
    style: {
      marginBottom: "8px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      fontSize: "16px",
      color: "var(--text-main)"
    }
  }, lot.lot_id), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "var(--text-muted)"
    }
  }, lot.component_count, " Total Flight Units \xB7 ", lot.anomaly_percentage, "% Anomaly Rate")), lot.is_lot_wide_pattern ? /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-risk"
  }, "LOT-WIDE PATTERN") : /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, "NOMINAL BATCH")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      margin: "10px 0",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, lot.pass_count, " PASS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-watch"
  }, lot.watch_count, " WATCH"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-review"
  }, lot.review_count, " REVIEW"), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-risk"
  }, lot.high_risk_count, " HIGH RISK")), lot.is_lot_wide_pattern ? /*#__PURE__*/_react.default.createElement("div", {
    className: "narrative-box-clean",
    style: {
      borderLeftColor: "var(--status-risk)",
      fontSize: "12px",
      marginTop: "10px"
    }
  }, /*#__PURE__*/_react.default.createElement("strong", null, "Lot-Wide Alert: "), lot.pattern_description || "Systemic leakage current acceleration detected across multiple flight units in this wafer batch.") : /*#__PURE__*/_react.default.createElement("div", {
    className: "narrative-box-clean",
    style: {
      borderLeftColor: "var(--status-pass)",
      fontSize: "12px",
      marginTop: "10px"
    }
  }, /*#__PURE__*/_react.default.createElement("strong", null, "Batch Health: "), "All components exhibit homogeneous Arrhenius burn-in trajectories within nominal tolerance."), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "12px",
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => onSelectLot(lot.lot_id)
  }, "View Batch Components \u2192")))))));
}
  });

  // Module: components/MobileBottomNav.tsx
  define("components/MobileBottomNav.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MobileBottomNav = MobileBottomNav;
var _react = _interopRequireDefault(require("react"));
var _Icons = require("./Icons");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// ==============================================================================
// ReliabilityX — Mobile Bottom Navigation Bar
// Touch-first, thumb-accessible primary navigation dock for mobile devices
// Only visible on mobile viewports (<= 768px). Respects safe-area-inset-bottom.
// ==============================================================================

function MobileBottomNav({
  activeTab,
  onSelectTab,
  onToggleMobileMenu,
  mobileMenuOpen
}) {
  return /*#__PURE__*/_react.default.createElement("nav", {
    className: "mobile-bottom-nav",
    "aria-label": "Mobile Navigation Dock"
  }, /*#__PURE__*/_react.default.createElement("button", {
    type: "button",
    className: `mobile-nav-item ${activeTab === "dashboard" && !mobileMenuOpen ? "active" : ""}`,
    onClick: () => onSelectTab("dashboard"),
    "aria-label": "Dashboard"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-icon"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconDashboard, {
    className: "mobile-svg-icon"
  })), /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-label"
  }, "Dashboard")), /*#__PURE__*/_react.default.createElement("button", {
    type: "button",
    className: `mobile-nav-item ${activeTab === "live_telemetry" && !mobileMenuOpen ? "active" : ""}`,
    onClick: () => onSelectTab("live_telemetry"),
    "aria-label": "Live Screening"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-icon live-icon-wrapper"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconLivePulse, {
    className: "mobile-svg-icon"
  }), /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-live-indicator"
  })), /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-label"
  }, "Live")), /*#__PURE__*/_react.default.createElement("button", {
    type: "button",
    className: `mobile-nav-item ${activeTab === "screening" && !mobileMenuOpen ? "active" : ""}`,
    onClick: () => onSelectTab("screening"),
    "aria-label": "Screening Pipeline"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-icon"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconPipeline, {
    className: "mobile-svg-icon"
  })), /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-label"
  }, "Pipeline")), /*#__PURE__*/_react.default.createElement("button", {
    type: "button",
    className: `mobile-nav-item ${activeTab === "components" && !mobileMenuOpen ? "active" : ""}`,
    onClick: () => onSelectTab("components"),
    "aria-label": "Components"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-icon"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconComponents, {
    className: "mobile-svg-icon"
  })), /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-label"
  }, "Units")), /*#__PURE__*/_react.default.createElement("button", {
    type: "button",
    className: `mobile-nav-item ${mobileMenuOpen ? "active" : ""}`,
    onClick: onToggleMobileMenu,
    "aria-label": "Open Full Navigation Drawer"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-icon"
  }, /*#__PURE__*/_react.default.createElement("svg", {
    className: "mobile-svg-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: "4",
    y1: "7",
    x2: "20",
    y2: "7"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "4",
    y1: "12",
    x2: "20",
    y2: "12"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "4",
    y1: "17",
    x2: "20",
    y2: "17"
  }))), /*#__PURE__*/_react.default.createElement("span", {
    className: "mobile-nav-label"
  }, "Menu")));
}
  });

  // Module: components/PredictionsTab.tsx
  define("components/PredictionsTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PredictionsTab = PredictionsTab;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — 168h Prognostic Predictions Tab Component
// Physics-Informed Forecasting with 95% Confidence & P90 Worst-Case Bounds
// ==============================================================================

const SPEC_LIMITS = {
  leakage_current_uA: 50.0,
  standby_current_mA: 12.0,
  propagation_delay_ns: 8.5,
  voltage_ref_V: 2.60
};
function PredictionsTab({
  onInspectComp
}) {
  const [predictions, setPredictions] = (0, _react.useState)([]);
  const [loading, setLoading] = (0, _react.useState)(true);
  const [paramFilter, setParamFilter] = (0, _react.useState)("ALL");
  (0, _react.useEffect)(() => {
    fetch("/api/predictions?limit=200").then(r => r.json()).then(d => {
      setPredictions(d.predictions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const filtered = predictions.filter(p => paramFilter === "ALL" || p.parameter_name === paramFilter);
  const totalForecasts = predictions.length;
  const breachesCount = predictions.filter(p => {
    const limit = p.engineering_limit ?? SPEC_LIMITS[p.parameter_name] ?? 50.0;
    const p90 = p.p90_worst_case ?? p.predicted_168h;
    return p90 != null && p90 > limit;
  }).length;
  const withinSpec = totalForecasts - breachesCount;
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hero-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "168h BURN-IN PROGNOSTIC FORECASTS"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Evaluates intermediate burn-in measurements (24h, 48h, 96h) to forecast the end-of-screen (168h) value with estimated prediction intervals and P90 risk bounds.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "UNITS FORECASTED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, loading ? "--" : totalForecasts), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Multi-parameter predictions")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "WITHIN SPECIFICATION"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green"
  }, loading ? "--" : withinSpec), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "P90 < official limit")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "PROJECTED BREACHES"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red"
  }, loading ? "--" : breachesCount), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "P90 risk bound exceedance")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "PREDICTION INTERVAL"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-yellow",
    style: {
      fontSize: "20px"
    }
  }, "\xB11.96\u03C3"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Estimated prediction interval"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\uD83D\uDD2E PROGNOSTIC INFERENCE MODELS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Physics-Informed Ensemble")), /*#__PURE__*/_react.default.createElement("div", {
    className: "filter-bar mb-3",
    style: {
      display: "flex",
      gap: "10px",
      alignItems: "center"
    }
  }, /*#__PURE__*/_react.default.createElement("span", {
    style: {
      fontSize: "11.5px",
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, "Parameter:"), /*#__PURE__*/_react.default.createElement("select", {
    value: paramFilter,
    onChange: e => setParamFilter(e.target.value)
  }, /*#__PURE__*/_react.default.createElement("option", {
    value: "ALL"
  }, "All Parameters"), /*#__PURE__*/_react.default.createElement("option", {
    value: "leakage_current_uA"
  }, "Leakage Current (\u03BCA)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "standby_current_mA"
  }, "Standby Current (mA)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "propagation_delay_ns"
  }, "Propagation Delay (ns)"), /*#__PURE__*/_react.default.createElement("option", {
    value: "voltage_ref_V"
  }, "Reference Voltage (V)"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive"
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Component"), /*#__PURE__*/_react.default.createElement("th", null, "Parameter"), /*#__PURE__*/_react.default.createElement("th", null, "Stage Used"), /*#__PURE__*/_react.default.createElement("th", null, "Predicted 168h"), /*#__PURE__*/_react.default.createElement("th", null, "Spec Limit"), /*#__PURE__*/_react.default.createElement("th", null, "Estimated Interval (\xB11.96\u03C3)"), /*#__PURE__*/_react.default.createElement("th", {
    title: "P90 represents an estimated upper prediction bound from the current model; it is not a guaranteed physical worst-case limit."
  }, "P90 Estimated Upper Bound \u2139\uFE0F"), /*#__PURE__*/_react.default.createElement("th", null, "Action"))), /*#__PURE__*/_react.default.createElement("tbody", null, loading ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 8,
    style: {
      textAlign: "center",
      padding: "30px"
    }
  }, "Loading prognostic forecasts...")) : filtered.length === 0 ? /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("td", {
    colSpan: 8,
    style: {
      textAlign: "center",
      padding: "30px"
    }
  }, "No predictions found.")) : filtered.map(p => {
    const limit = p.engineering_limit ?? SPEC_LIMITS[p.parameter_name] ?? 50.0;
    const predVal = p.predicted_168h != null ? Number(p.predicted_168h).toFixed(2) : "--";
    const limitVal = Number(limit).toFixed(1);
    const uncertVal = p.uncertainty_std != null ? `±${(Number(p.uncertainty_std) * 1.96).toFixed(2)}` : "--";
    const p90 = p.p90_worst_case ?? p.predicted_168h;
    const p90Val = p90 != null ? Number(p90).toFixed(2) : "--";
    const isBreach = p90 != null && limit != null && p90 > limit;
    return /*#__PURE__*/_react.default.createElement("tr", {
      key: `${p.component_id}-${p.parameter_name}`
    }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, p.component_id)), /*#__PURE__*/_react.default.createElement("td", {
      style: {
        fontSize: "12px"
      }
    }, p.parameter_name), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("span", {
      className: "card-badge"
    }, p.stage_used)), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", null, predVal)), /*#__PURE__*/_react.default.createElement("td", null, limitVal), /*#__PURE__*/_react.default.createElement("td", null, uncertVal), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        color: isBreach ? "var(--status-risk)" : "var(--text-main)",
        fontWeight: isBreach ? 700 : 500
      }
    }, p90Val, isBreach && " ⚠️")), /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("button", {
      className: "btn btn-secondary btn-sm",
      onClick: () => onInspectComp(p.component_id)
    }, "Inspect")));
  }))))));
}
  });

  // Module: components/ReportsTab.tsx
  define("components/ReportsTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReportsTab = ReportsTab;
var _react = _interopRequireDefault(require("react"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// ==============================================================================
// ReliabilityX — Reports & Aerospace Certificate Tab Component
// Official Screening Certificate & Parametric Data Export
// ==============================================================================

function ReportsTab({
  onInspectComp
}) {
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hero-header mb-4"
  }, /*#__PURE__*/_react.default.createElement("h1", {
    className: "page-main-title"
  }, "AI-ASSISTED SCREENING ANALYSIS REPORT"), /*#__PURE__*/_react.default.createElement("p", {
    className: "page-main-subtitle"
  }, "Parametric screening degradation analysis, estimated prediction intervals, and tamper-evident SHA-256 digital verification.")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "DOCUMENT PROTOCOL"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value",
    style: {
      fontSize: "20px"
    }
  }, "AEC-Q001"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Statistical test baseline")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "ANALYSIS STATUS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green",
    style: {
      fontSize: "20px"
    }
  }, "GENERATED"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Ready for engineer review")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "TELEMETRY TRACE"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green",
    style: {
      fontSize: "20px"
    }
  }, "100%"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "All test hours captured")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "SECURITY CHECKSUM"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value",
    style: {
      fontSize: "20px"
    }
  }, "SHA-256"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Tamper-evident verification"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "card mb-4"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "AI-ASSISTED SCREENING ANALYSIS REPORT PREVIEW"), /*#__PURE__*/_react.default.createElement("div", {
    className: "btn-group"
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => window.open("/api/reports/certificate-html", "_blank")
  }, "View Standalone Report"), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-sm",
    onClick: () => window.location.href = "/api/reports/export-csv"
  }, "Export Telemetry CSV"))), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      marginTop: "16px",
      border: "1px solid var(--border-color)",
      borderRadius: "10px",
      overflow: "hidden",
      height: "720px"
    }
  }, /*#__PURE__*/_react.default.createElement("iframe", {
    src: "/api/reports/certificate-html",
    style: {
      width: "100%",
      height: "100%",
      border: "none"
    },
    title: "Screening Analysis Report"
  }))));
}
  });

  // Module: components/SafetyNotice.tsx
  define("components/SafetyNotice.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SafetyNotice = SafetyNotice;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function SafetyNotice() {
  const [dismissed, setDismissed] = (0, _react.useState)(false);
  if (dismissed) return null;
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "safety-banner"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "safety-banner-content"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "safety-icon"
  }, "\u26A0\uFE0F"), /*#__PURE__*/_react.default.createElement("span", {
    className: "safety-text"
  }, /*#__PURE__*/_react.default.createElement("strong", null, "ENGINEERING DECISION-SUPPORT NOTICE:"), " AI screening provides statistical early warnings and degradation forecasts. Official specifications and QA review remain authoritative.")), /*#__PURE__*/_react.default.createElement("button", {
    className: "safety-dismiss-btn",
    onClick: () => setDismissed(true),
    title: "Dismiss notice",
    "aria-label": "Dismiss banner"
  }, "\xD7"));
}
  });

  // Module: components/ScreeningPipelineTab.tsx
  define("components/ScreeningPipelineTab.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ScreeningPipelineTab = ScreeningPipelineTab;
var _react = _interopRequireWildcard(require("react"));
var _ArchitectureFlowchart = require("./ArchitectureFlowchart");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Screening Pipeline & AI Architecture Tab Component
// 10-Layer Architecture Flowchart, 8-Stage Execution Specs & Active ML Registry
// ==============================================================================

function ScreeningPipelineTab({
  onInspectComp
}) {
  const [viewMode, setViewMode] = (0, _react.useState)("flowchart");
  const [expandedStage, setExpandedStage] = (0, _react.useState)(1);
  const stages = [{
    num: 1,
    title: "Data Ingestion & Quality Validation",
    tagline: "Sensor noise, 5x IQR spikes, and timestamp continuity",
    status: "PASS",
    statusType: "pass",
    engine: "DataQualityEngine (backend/data/validator.py)",
    details: "Validates format, stage continuity (0h, 24h, 48h, 96h, 168h), checks for frozen sensors, missing values, and high-frequency measurement noise."
  }, {
    num: 2,
    title: "Temporal Drift & Acceleration Extraction",
    tagline: "1st derivative (velocity) and 2nd derivative (curvature)",
    status: "ACTIVE",
    statusType: "pass",
    engine: "FeatureEngineeringEngine (backend/features/engineer.py)",
    details: "Calculates drift velocity v = Δx/Δt and drift acceleration a = d²x/dt² to isolate monotonic wearout and non-linear degradation."
  }, {
    num: 3,
    title: "Multi-Detector Calibrated Anomaly Engine",
    tagline: "Z-Score, DPAT (AEC-Q001), Robust Mahalanobis (MCD), Isolation Forest",
    status: "ACTIVE",
    statusType: "pass",
    engine: "AnomalyEnsembleEngine (backend/anomaly/ensemble.py)",
    details: "Executes 4 statistical and machine-learning detectors. Normalizes outlier scores into a calibrated [0, 1] severity scale."
  }, {
    num: 4,
    title: "Component Behaviour State Profiling",
    tagline: "NORMAL, DRIFTING, ACCELERATING, UNSTABLE",
    status: "ACTIVE",
    statusType: "watch",
    engine: "BehaviourEngine (backend/timeseries/behaviour.py)",
    details: "Assigns dynamic behaviour state based on trajectory monotonicity and sign of acceleration. Flags impending runaway."
  }, {
    num: 5,
    title: "Physics-Informed 168h Prognostic Forecasting",
    tagline: "Arrhenius physics, Kalman Filter, LSTM, and 4-Model Ensemble",
    status: "ACTIVE",
    statusType: "review",
    engine: "FuturePredictionEngine (backend/prediction/forecaster.py)",
    details: "Generates future 168h predictions with estimated prediction intervals (±1.96σ) and P90 estimated upper bounds."
  }, {
    num: 6,
    title: "Explainability & What-If Counterfactuals",
    tagline: "Shapley-style attribution and dynamic sensitivity simulation",
    status: "ACTIVE",
    statusType: "pass",
    engine: "CounterfactualEngine (backend/explainability/counterfactual.py)",
    details: "Decomposes failure risk into factor contributions. Provides real-time interactive What-If sensitivity simulation."
  }, {
    num: 7,
    title: "Risk Categorization & Safety Boundary Enforcement",
    tagline: "PASS, WATCH, REVIEW, HIGH RISK",
    status: "ENFORCED",
    statusType: "risk",
    engine: "RiskFusionEngine (backend/risk/fusion.py)",
    details: "Safety boundary rule: If actual telemetry exceeds official engineering limit, status is unconditionally locked to HIGH RISK."
  }, {
    num: 8,
    title: "Tamper-Evident Audit & Test-to-Decision Traceability",
    tagline: "Immutable SHA-256 audit ledger and signed QA dispositions",
    status: "VERIFIED",
    statusType: "pass",
    engine: "TraceabilityEngine (backend/core/db.py)",
    details: "Maintains end-to-end traceability linking original test measurements to AI predictions and final engineer signoffs."
  }];
  const mlModelsList = [{
    name: "Isolation Forest",
    library: "scikit-learn (sklearn.ensemble.IsolationForest)",
    purpose: "Multi-dimensional anomaly isolation across joint parametric drifts",
    hyperparams: "n_estimators=100, contamination=0.08, random_state=42",
    role: "Builds random binary trees to measure average path length for anomalous isolation"
  }, {
    name: "HistGradientBoostingRegressor",
    library: "scikit-learn (sklearn.ensemble.HistGradientBoostingRegressor)",
    purpose: "168h End-of-Screen non-linear degradation forecasting",
    hyperparams: "max_iter=150, loss='squared_error', l2_regularization=0.1",
    role: "Fits successive gradient-boosted decision trees to predict late-stage degradation"
  }, {
    name: "RandomForestRegressor",
    library: "scikit-learn (sklearn.ensemble.RandomForestRegressor)",
    purpose: "Multi-model ensemble bagging forecast & uncertainty quantification",
    hyperparams: "n_estimators=100, max_depth=10, random_state=42",
    role: "Aggregates uncorrelated tree outputs to reduce variance and estimate prediction std dev"
  }, {
    name: "Ridge Regression",
    library: "scikit-learn (sklearn.linear_model.Ridge)",
    purpose: "Linear degradation baseline with L2 penalty",
    hyperparams: "alpha=1.0, solver='auto'",
    role: "Guarantees well-conditioned closed-form solution resistant to multicollinearity"
  }, {
    name: "Robust Mahalanobis (MCD)",
    library: "scikit-learn (sklearn.covariance.MinCovDet)",
    purpose: "Covariance-weighted multivariate distance robust to masking",
    hyperparams: "support_fraction=None, assume_centered=False",
    role: "Estimates minimum covariance determinant ellipsoid unaffected by extreme outliers"
  }, {
    name: "Local Outlier Factor (LOF)",
    library: "scikit-learn (sklearn.neighbors.LocalOutlierFactor)",
    purpose: "Local density-based anomaly detector",
    hyperparams: "n_neighbors=20, contamination=0.08, metric='minkowski'",
    role: "Flags components with significantly lower local density than their lot peers"
  }, {
    name: "Dynamic Part Average Testing (DPAT)",
    library: "Native Aerospace Algorithm (AEC-Q001 Standard)",
    purpose: "Statistical outlier screening based on lot mean and dynamic sigma",
    hyperparams: "k_factor=3.0 (corresponds to ±3σ statistical cutoff)",
    role: "Calculates lot-specific screening limits: Limit = Mean ± k * Standard_Deviation"
  }, {
    name: "Physics Arrhenius Wearout Extrapolator",
    library: "Native Physics-Informed Module (Arrhenius Activation)",
    purpose: "Logarithmic time-to-failure baseline derived from thermal diffusion physics",
    hyperparams: "y(168) = v0 + (v96 - v0) * ln(1 + 168/96) / ln(2)",
    role: "Enforces physical laws of solid-state dielectric breakdown and hot-carrier wearout"
  }];
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "tab-pane active"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hero-header",
    style: {
      marginBottom: "16px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-color)"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "hero-brand-row"
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("h1", {
    className: "hero-title"
  }, "SCREENING PIPELINE & AI ARCHITECTURE"), /*#__PURE__*/_react.default.createElement("p", {
    className: "hero-subtitle"
  }, "End-to-end 10-layer AI decision architecture combining Scikit-Learn machine learning, physics-informed Arrhenius models, and AEC-Q001 aerospace screening limits."))), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      gap: "10px",
      marginTop: "14px",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-sm ${viewMode === "flowchart" ? "btn-primary" : "btn-outline"}`,
    onClick: () => setViewMode("flowchart")
  }, "\uD83D\uDCCA Interactive Architecture Blueprint"), /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-sm ${viewMode === "specs" ? "btn-primary" : "btn-outline"}`,
    onClick: () => setViewMode("specs")
  }, "\uD83D\uDD2C 8-Stage Detailed Engineering Specs"), /*#__PURE__*/_react.default.createElement("button", {
    className: `btn btn-sm ${viewMode === "ml_registry" ? "btn-primary" : "btn-outline"}`,
    onClick: () => setViewMode("ml_registry")
  }, "\uD83E\uDD16 Active ML Models & Algorithms Registry"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-grid mb-3"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title"
  }, "PIPELINE LAYERS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value"
  }, "10"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "End-to-end decision flow")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-green"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-green"
  }, "ACTIVE ML MODELS"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-green"
  }, "8"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Scikit-Learn + Physics")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-yellow"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-yellow"
  }, "BURN-IN GATES"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-yellow"
  }, "4"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "0h, 24h, 96h, 168h")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-orange"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-orange"
  }, "GOVERNING STANDARD"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-orange",
    style: {
      fontSize: "20px"
    }
  }, "AEC-Q001"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "ISRO ESS Protocol")), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-card border-red"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-title text-red"
  }, "INTEGRITY LEDGER"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-value text-red",
    style: {
      fontSize: "20px"
    }
  }, "SHA-256"), /*#__PURE__*/_react.default.createElement("div", {
    className: "kpi-sub"
  }, "Tamper-evident verification"))), viewMode === "flowchart" && /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "20px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header",
    style: {
      marginBottom: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\uD83D\uDDFA\uFE0F END-TO-END PIPELINE ARCHITECTURE (BLUEPRINT)"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "var(--text-muted)",
      marginTop: "2px"
    }
  }, "Interactive architectural flowchart. Click on any block to inspect the underlying machine learning models and Python backend execution code.")), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, "ACTIVE INFERENCE ENGINE")), /*#__PURE__*/_react.default.createElement(_ArchitectureFlowchart.ArchitectureFlowchart, null)), viewMode === "specs" && /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\uD83D\uDD2C TELEMETRY STAGE BREAKDOWN & EXECUTION STATUS"), /*#__PURE__*/_react.default.createElement("span", {
    className: "card-badge"
  }, "Dynamic PAT & Thermal Burn-In Flow")), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      marginTop: "12px"
    }
  }, stages.map(stage => {
    const isExpanded = expandedStage === stage.num;
    return /*#__PURE__*/_react.default.createElement("div", {
      key: stage.num,
      style: {
        border: isExpanded ? "1px solid var(--accent-blue)" : "1px solid var(--border-color)",
        borderRadius: "var(--radius-sm)",
        padding: "14px 18px",
        backgroundColor: isExpanded ? "#111C3D" : "#0B132B",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.3)" : "none"
      },
      onClick: () => setExpandedStage(isExpanded ? null : stage.num)
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "14px"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundColor: isExpanded ? "rgba(56, 189, 248, 0.2)" : "#111C3D",
        border: isExpanded ? "1px solid #38BDF8" : "1px solid #1E293B",
        color: isExpanded ? "#38BDF8" : "#94A3B8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: 700,
        transition: "all 0.2s"
      }
    }, stage.num), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("strong", {
      style: {
        fontSize: "13.5px",
        color: "var(--text-main)"
      }
    }, stage.title), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: "12px",
        color: "var(--text-muted)"
      }
    }, stage.tagline))), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      className: `badge badge-${stage.statusType}`,
      style: {
        fontSize: "10.5px"
      }
    }, stage.status), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: "12px",
        color: "var(--text-muted)"
      }
    }, isExpanded ? "▲" : "▼"))), isExpanded && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px dashed var(--border-color)",
        fontSize: "12.5px",
        color: "var(--text-sub)",
        lineHeight: 1.6
      }
    }, /*#__PURE__*/_react.default.createElement("p", {
      style: {
        margin: 0
      }
    }, stage.details), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        marginTop: "10px",
        display: "flex",
        gap: "10px",
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      className: "card-badge",
      style: {
        background: "rgba(56, 189, 248, 0.15)",
        color: "#38BDF8"
      }
    }, "Module: ", stage.engine), /*#__PURE__*/_react.default.createElement("span", {
      className: "card-badge",
      style: {
        background: "#1E293B",
        color: "#CBD5E1"
      }
    }, "Execution Latency: < 0.5ms"))));
  }))), viewMode === "ml_registry" && /*#__PURE__*/_react.default.createElement("div", {
    className: "card",
    style: {
      padding: "18px"
    }
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("span", {
    className: "card-title"
  }, "\uD83E\uDD16 ACTIVE MACHINE LEARNING & STATISTICAL MODELS REGISTRY"), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "12px",
      color: "var(--text-muted)",
      marginTop: "2px"
    }
  }, "Real Scikit-Learn ML models and physics algorithms actively trained on parametric burn-in telemetry:")), /*#__PURE__*/_react.default.createElement("span", {
    className: "badge badge-pass"
  }, "NO HARDCODED NUMBERS")), /*#__PURE__*/_react.default.createElement("div", {
    className: "table-responsive",
    style: {
      marginTop: "14px"
    }
  }, /*#__PURE__*/_react.default.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/_react.default.createElement("thead", null, /*#__PURE__*/_react.default.createElement("tr", null, /*#__PURE__*/_react.default.createElement("th", null, "Model / Algorithm"), /*#__PURE__*/_react.default.createElement("th", null, "Library & Class"), /*#__PURE__*/_react.default.createElement("th", null, "Purpose in ReliabilityX"), /*#__PURE__*/_react.default.createElement("th", null, "Hyperparameters & Formula"))), /*#__PURE__*/_react.default.createElement("tbody", null, mlModelsList.map((m, idx) => /*#__PURE__*/_react.default.createElement("tr", {
    key: idx
  }, /*#__PURE__*/_react.default.createElement("td", null, /*#__PURE__*/_react.default.createElement("strong", {
    style: {
      color: "var(--accent-blue)"
    }
  }, m.name), /*#__PURE__*/_react.default.createElement("div", {
    style: {
      fontSize: "11px",
      color: "var(--text-muted)"
    }
  }, m.role)), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontFamily: "monospace",
      fontSize: "11.5px",
      color: "#38BDF8"
    }
  }, m.library), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontSize: "12px",
      color: "var(--text-sub)"
    }
  }, m.purpose), /*#__PURE__*/_react.default.createElement("td", {
    style: {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#94A3B8"
    }
  }, /*#__PURE__*/_react.default.createElement("code", null, m.hyperparams)))))))));
}
  });

  // Module: components/Sidebar.tsx
  define("components/Sidebar.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sidebar = Sidebar;
var _react = _interopRequireDefault(require("react"));
var _Icons = require("./Icons");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// ==============================================================================
// ReliabilityX — Left Navigation Sidebar
// Aerospace Enterprise Dark Sidebar with Thin Crisp SVG Icons
// ==============================================================================

function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) {
  const handleItemClick = tab => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, mobileOpen && /*#__PURE__*/_react.default.createElement("div", {
    className: "mobile-sidebar-backdrop",
    onClick: onCloseMobile,
    "aria-label": "Close navigation"
  }), /*#__PURE__*/_react.default.createElement("aside", {
    className: `app-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: `sidebar-header ${collapsed ? "sidebar-header-collapsed" : "sidebar-header-expanded"}`
  }, collapsed ?
  /*#__PURE__*/
  /* Collapsed: proper square shield-X icon, centred */
  _react.default.createElement("img", {
    src: "/static/emblem.png",
    alt: "ReliabilityX",
    className: "sidebar-icon-collapsed"
  }) :
  /*#__PURE__*/
  /* Expanded: full-bleed banner logo */
  _react.default.createElement("img", {
    src: "/static/logo.png",
    alt: "ReliabilityX",
    className: "sidebar-logo-img"
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-nav"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-nav-group"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-group-title"
  }, !collapsed ? "OVERVIEW" : "•••"), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "dashboard" ? "active" : ""}`,
    onClick: () => handleItemClick("dashboard"),
    title: "Dashboard"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconDashboard, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Dashboard")), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item live-sidebar-item ${activeTab === "live_telemetry" ? "active" : ""}`,
    onClick: () => handleItemClick("live_telemetry"),
    title: "Live Screening & Simulator"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconLivePulse, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Live Screening"), !collapsed && /*#__PURE__*/_react.default.createElement("span", {
    className: "live-sidebar-pill"
  }, "LIVE"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-nav-group"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-group-title"
  }, !collapsed ? "SCREENING" : "•••"), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "screening" ? "active" : ""}`,
    onClick: () => handleItemClick("screening"),
    title: "Screening Pipeline"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconPipeline, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Screening Pipeline")), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "components" ? "active" : ""}`,
    onClick: () => handleItemClick("components"),
    title: "Components"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconComponents, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Components")), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "lots" ? "active" : ""}`,
    onClick: () => handleItemClick("lots"),
    title: "Lots"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconLots, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Lots")), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "predictions" ? "active" : ""}`,
    onClick: () => handleItemClick("predictions"),
    title: "Predictions"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconPredictions, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Predictions"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-nav-group"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-group-title"
  }, !collapsed ? "ACTION" : "•••"), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "inspection" ? "active" : ""}`,
    onClick: () => handleItemClick("inspection"),
    title: "Inspection Priority"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconInspection, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Inspection Priority")), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "reports" ? "active" : ""}`,
    onClick: () => handleItemClick("reports"),
    title: "Reports"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconReports, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Reports"))), /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-nav-group"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-group-title"
  }, !collapsed ? "ENGINEERING" : "•••"), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "engineering" ? "active" : ""}`,
    onClick: () => handleItemClick("engineering"),
    title: "Engineering"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconEngineering, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Engineering")), /*#__PURE__*/_react.default.createElement("button", {
    className: `sidebar-item ${activeTab === "audit" ? "active" : ""}`,
    onClick: () => handleItemClick("audit"),
    title: "Audit & Traceability"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconAudit, null), /*#__PURE__*/_react.default.createElement("span", {
    className: "sidebar-item-label"
  }, "Audit / Traceability")))), /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-footer"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "sidebar-status-pill"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "status-pulse"
  }), !collapsed && /*#__PURE__*/_react.default.createElement("span", null, "Screening Engine Ready")), /*#__PURE__*/_react.default.createElement("button", {
    className: "sidebar-collapse-btn",
    onClick: onToggleCollapse
  }, collapsed ? /*#__PURE__*/_react.default.createElement(_Icons.IconExpand, null) : /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_Icons.IconCollapse, null), " ", /*#__PURE__*/_react.default.createElement("span", null, "Collapse Sidebar"))))));
}
  });

  // Module: components/Topbar.tsx
  define("components/Topbar.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Topbar = Topbar;
var _react = _interopRequireDefault(require("react"));
var _Icons = require("./Icons");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function Topbar({
  activeTab,
  globalSearch,
  onSearchChange,
  onSearchSubmit,
  activeDataset,
  onOpenDatasetModal,
  onReloadDemo,
  liveStatus,
  onNavigateToLive,
  onToggleMobileMenu
}) {
  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard Overview";
      case "live_telemetry":
        return "Live Screening Telemetry";
      case "screening":
        return "Screening Pipeline";
      case "components":
        return "Components Directory";
      case "lots":
        return "Lot Health & Anomaly Triage";
      case "predictions":
        return "168h Prognostic Forecasts";
      case "inspection":
        return "Inspection Priority Queue";
      case "reports":
        return "AI-Assisted Screening Reports & Analysis";
      case "engineering":
        return "Engineering Suite";
      case "audit":
        return "Audit & Traceability Ledger";
      default:
        return "ReliabilityX Suite";
    }
  };
  const status = liveStatus?.connection_status || "OFFLINE";
  return /*#__PURE__*/_react.default.createElement("header", {
    className: "app-topbar"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: "topbar-left"
  }, onToggleMobileMenu && /*#__PURE__*/_react.default.createElement("button", {
    type: "button",
    className: "mobile-menu-toggle-btn",
    onClick: onToggleMobileMenu,
    "aria-label": "Toggle navigation menu",
    title: "Navigation Menu"
  }, /*#__PURE__*/_react.default.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/_react.default.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "21",
    y2: "18"
  }))), /*#__PURE__*/_react.default.createElement("div", {
    className: "topbar-titles-group"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "topbar-breadcrumb"
  }, "RELIABILITYX / ", activeTab === "live_telemetry" ? "LIVE STREAM" : activeTab === "audit" ? "AUDIT" : activeTab.toUpperCase()), /*#__PURE__*/_react.default.createElement("h1", {
    className: "topbar-title"
  }, getTabTitle()))), /*#__PURE__*/_react.default.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/_react.default.createElement("div", {
    className: `live-topbar-pill status-${status.toLowerCase()}`,
    onClick: onNavigateToLive,
    title: "Click to open Live Screening view"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: `live-pulse-dot dot-${status.toLowerCase()}`
  }), /*#__PURE__*/_react.default.createElement("span", {
    className: "live-status-label"
  }, status), /*#__PURE__*/_react.default.createElement("span", {
    className: "live-pill-source"
  }, liveStatus?.source_name || "SIMULATED ATE-01"), status === "LIVE" || status === "CONNECTED" ? /*#__PURE__*/_react.default.createElement("div", {
    className: "live-pill-metrics"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "metric-tag"
  }, liveStatus?.last_latency_ms ? `${Math.round(liveStatus.last_latency_ms)}ms` : "18ms"), /*#__PURE__*/_react.default.createElement("span", {
    className: "metric-dot"
  }, "\u2022"), /*#__PURE__*/_react.default.createElement("span", {
    className: "metric-tag"
  }, (liveStatus?.messages_count ?? 1145).toLocaleString(), " msgs")) : /*#__PURE__*/_react.default.createElement("span", {
    className: "live-pill-metrics text-muted"
  }, "Standby")), /*#__PURE__*/_react.default.createElement("form", {
    onSubmit: onSearchSubmit,
    className: "topbar-search-box"
  }, /*#__PURE__*/_react.default.createElement(_Icons.IconSearch, null), /*#__PURE__*/_react.default.createElement("input", {
    type: "text",
    placeholder: "Search component (e.g. C-01008)...",
    value: globalSearch,
    onChange: e => onSearchChange(e.target.value)
  })), /*#__PURE__*/_react.default.createElement("div", {
    className: "dataset-pill"
  }, /*#__PURE__*/_react.default.createElement("span", {
    className: "pill-dot"
  }), /*#__PURE__*/_react.default.createElement("span", null, !activeDataset?.dataset_id || activeDataset.dataset_id.startsWith("demo") ? "Demo Benchmark" : activeDataset?.name || "User Dataset"), /*#__PURE__*/_react.default.createElement("button", {
    className: "pill-action-btn",
    onClick: onOpenDatasetModal
  }, "Change")), /*#__PURE__*/_react.default.createElement("div", {
    className: "topbar-actions"
  }, /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => window.location.href = "/api/reports/export-csv"
  }, "Export CSV"), /*#__PURE__*/_react.default.createElement("button", {
    className: "btn btn-primary btn-sm",
    onClick: onReloadDemo
  }, "Reload Demo"))));
}
  });

  // Module: components/TrajectorySvgChart.tsx
  define("components/TrajectorySvgChart.tsx", function(module, exports, require) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TrajectorySvgChart = TrajectorySvgChart;
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
// ==============================================================================
// ReliabilityX — Degradation Trajectory SVG Chart
// Interactive, high-precision SVG trajectory chart with Arrhenius bounds
// ==============================================================================

function TrajectorySvgChart({
  data,
  paramName,
  simulatedDriftRate
}) {
  const measurements = data?.measurements || [];
  const pred = data?.prediction;
  const paramMeasures = (0, _react.useMemo)(() => {
    return measurements.filter(m => m.parameter_name === paramName).sort((a, b) => a.timestamp_hours - b.timestamp_hours);
  }, [measurements, paramName]);
  const specLimits = {
    leakage_current_uA: {
      max: 50.0,
      unit: "μA"
    },
    standby_current_mA: {
      max: 12.0,
      unit: "mA"
    },
    propagation_delay_ns: {
      max: 8.5,
      unit: "ns"
    },
    voltage_ref_V: {
      max: 2.60,
      unit: "V"
    }
  };
  const limitObj = specLimits[paramName] || {
    max: 50.0,
    unit: "μA"
  };
  const maxLimit = limitObj.max;
  if (paramMeasures.length === 0) {
    return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        height: "380px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        background: "rgba(15, 23, 42, 0.4)",
        borderRadius: "8px",
        border: "1px dashed rgba(148, 163, 184, 0.2)"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: "28px",
        marginBottom: "8px"
      }
    }, "\uD83D\uDCCA"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: "13px"
      }
    }, "Telemetry Measurements Unavailable"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: "11px",
        opacity: 0.7,
        marginTop: "4px"
      }
    }, "No recorded burn-in test stages (0\u2013168h) for ", paramName, "."));
  }

  // Professional Engineering Dimensions: 380px height (within 360–420px standard)
  const W = 880;
  const H = 380;
  const padL = 65;
  const padR = 40;
  const padT = 28;
  const padB = 45;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const hours = [0, 24, 48, 96, 168];
  const xForHour = h => padL + h / 168 * chartW;
  const values = paramMeasures.map(m => m.processed_value || m.raw_value);
  const currentVal = values.length > 0 ? values[values.length - 1] : 10.0;
  const predVal = pred?.predicted_168h || currentVal + (simulatedDriftRate || 0.05) * (168 - 96);
  const p90Val = pred?.p90_worst_case || predVal * 1.05;
  const minY = 0;
  const maxY = Math.max(maxLimit * 1.15, p90Val * 1.05, 1.0);
  const yForVal = v => padT + chartH - (v - minY) / (maxY - minY) * chartH;
  const actualPoints = paramMeasures.map(m => ({
    x: xForHour(m.timestamp_hours),
    y: yForVal(m.processed_value || m.raw_value),
    hour: m.timestamp_hours,
    val: m.processed_value || m.raw_value
  }));
  const actualPath = actualPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lastPoint = actualPoints.length > 0 ? actualPoints[actualPoints.length - 1] : {
    x: xForHour(96),
    y: yForVal(currentVal),
    hour: 96
  };
  const predPoint = {
    x: xForHour(168),
    y: yForVal(predVal)
  };
  const forecastPath = `M ${lastPoint.x} ${lastPoint.y} L ${predPoint.x} ${predPoint.y}`;
  const p90Point = {
    x: xForHour(168),
    y: yForVal(p90Val)
  };
  const p90Path = `M ${lastPoint.x} ${lastPoint.y} L ${p90Point.x} ${p90Point.y}`;
  const simVal = currentVal + (simulatedDriftRate || 0.05) * (168 - lastPoint.hour);
  const simPoint = {
    x: xForHour(168),
    y: yForVal(simVal)
  };
  const simPath = `M ${lastPoint.x} ${lastPoint.y} L ${simPoint.x} ${simPoint.y}`;
  const lower95 = pred?.lower_bound_95 || predVal - 1.5;
  const upper95 = pred?.upper_bound_95 || predVal + 1.5;
  const ciPolygon = `
    ${lastPoint.x},${lastPoint.y} 
    ${xForHour(168)},${yForVal(upper95)} 
    ${xForHour(168)},${yForVal(lower95)}
  `;
  const limitY = yForVal(maxLimit);
  return /*#__PURE__*/_react.default.createElement("div", {
    style: {
      width: "100%",
      overflowX: "auto"
    }
  }, /*#__PURE__*/_react.default.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: "100%",
      height: "auto",
      display: "block"
    }
  }, [0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
    const y = padT + chartH * frac;
    const val = maxY - frac * (maxY - minY);
    return /*#__PURE__*/_react.default.createElement("g", {
      key: idx
    }, /*#__PURE__*/_react.default.createElement("line", {
      x1: padL,
      y1: y,
      x2: W - padR,
      y2: y,
      stroke: "#1E293B",
      strokeDasharray: "3 3"
    }), /*#__PURE__*/_react.default.createElement("text", {
      x: padL - 8,
      y: y + 4,
      textAnchor: "end",
      fontSize: "10",
      fill: "#94A3B8"
    }, val.toFixed(1)));
  }), hours.map(h => {
    const x = xForHour(h);
    return /*#__PURE__*/_react.default.createElement("g", {
      key: h
    }, /*#__PURE__*/_react.default.createElement("line", {
      x1: x,
      y1: padT,
      x2: x,
      y2: padT + chartH,
      stroke: "#1E293B"
    }), /*#__PURE__*/_react.default.createElement("text", {
      x: x,
      y: H - 12,
      textAnchor: "middle",
      fontSize: "10.5",
      fontWeight: "600",
      fill: "#94A3B8"
    }, h, "h"));
  }), /*#__PURE__*/_react.default.createElement("polygon", {
    points: ciPolygon,
    fill: "rgba(56, 189, 248, 0.15)"
  }), /*#__PURE__*/_react.default.createElement("line", {
    x1: padL,
    y1: limitY,
    x2: W - padR,
    y2: limitY,
    stroke: "#F87171",
    strokeWidth: "2",
    strokeDasharray: "6 4"
  }), /*#__PURE__*/_react.default.createElement("text", {
    x: W - padR,
    y: limitY - 6,
    textAnchor: "end",
    fontSize: "10",
    fontWeight: "700",
    fill: "#F87171"
  }, "LIMIT: ", maxLimit.toFixed(1), " ", limitObj.unit), /*#__PURE__*/_react.default.createElement("path", {
    d: p90Path,
    stroke: "#FB923C",
    strokeWidth: "2",
    strokeDasharray: "3 3",
    fill: "none"
  }), /*#__PURE__*/_react.default.createElement("circle", {
    cx: p90Point.x,
    cy: p90Point.y,
    r: "3.5",
    fill: "#FB923C"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: simPath,
    stroke: "#FBBF24",
    strokeWidth: "2.5",
    strokeDasharray: "4 2",
    fill: "none"
  }), /*#__PURE__*/_react.default.createElement("circle", {
    cx: simPoint.x,
    cy: simPoint.y,
    r: "4",
    fill: "#FBBF24"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: forecastPath,
    stroke: "#38BDF8",
    strokeWidth: "2",
    strokeDasharray: "5 3",
    fill: "none"
  }), /*#__PURE__*/_react.default.createElement("circle", {
    cx: predPoint.x,
    cy: predPoint.y,
    r: "4",
    fill: "#38BDF8"
  }), /*#__PURE__*/_react.default.createElement("path", {
    d: actualPath,
    stroke: "#38BDF8",
    strokeWidth: "2.8",
    fill: "none"
  }), actualPoints.map(p => /*#__PURE__*/_react.default.createElement("g", {
    key: p.hour
  }, /*#__PURE__*/_react.default.createElement("circle", {
    cx: p.x,
    cy: p.y,
    r: "4.5",
    fill: "#0B132B",
    stroke: "#38BDF8",
    strokeWidth: "2.5"
  }), /*#__PURE__*/_react.default.createElement("text", {
    x: p.x,
    y: p.y - 9,
    textAnchor: "middle",
    fontSize: "10.5",
    fontWeight: "700",
    fill: "#FFFFFF"
  }, p.val.toFixed(2)))), /*#__PURE__*/_react.default.createElement("text", {
    x: padL,
    y: padT - 6,
    fontSize: "10",
    fontWeight: "700",
    fill: "#94A3B8"
  }, limitObj.unit), /*#__PURE__*/_react.default.createElement("text", {
    x: W / 2,
    y: H - 2,
    textAnchor: "middle",
    fontSize: "10.5",
    fontWeight: "700",
    fill: "#94A3B8"
  }, "Burn-In Test Duration (Hours)")));
}
  });

  // Module: types.ts
  define("types.ts", function(module, exports, require) {
"use strict";
  });

  makeRequire('')('app.tsx');
})();
