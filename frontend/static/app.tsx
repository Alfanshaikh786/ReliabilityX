// ==============================================================================
// ReliabilityX — Predictive Component Reliability Intelligence
// Enterprise Aerospace UI Architecture (React 18 / .tsx)
// Left Sidebar Navigation + High-Resolution Industrial Decision Support
// ==============================================================================
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";

import { TabType, ToastInfo, LiveStreamStatus, LiveTelemetryPoint, LiveAlertItem, LiveLotHealth } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { SafetyNotice } from "./components/SafetyNotice";
import { DashboardTab } from "./components/DashboardTab";
import { LiveScreeningTab } from "./components/LiveScreeningTab";
import { ScreeningPipelineTab } from "./components/ScreeningPipelineTab";
import { ComponentsTab } from "./components/ComponentsTab";
import { LotsTab } from "./components/LotsTab";
import { PredictionsTab } from "./components/PredictionsTab";
import { InspectionTriageTab } from "./components/InspectionTriageTab";
import { ReportsTab } from "./components/ReportsTab";
import { EngineeringSuiteTab } from "./components/EngineeringSuiteTab";
import { ComponentDetailModal } from "./components/ComponentDetailModal";
import { DatasetModal } from "./components/DatasetModal";
import { MobileBottomNav } from "./components/MobileBottomNav";
const getApiBase = (): string => {
  try {
    const custom = localStorage.getItem("rx_backend_url");
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/+$/, "");
      return clean.endsWith("/api") ? clean : `${clean}/api`;
    }
    if ((window as any).__RELIABILITYX_API_URL__) {
      return (window as any).__RELIABILITYX_API_URL__;
    }
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://127.0.0.1:8000/api";
      }
      if (window.location.hostname.includes("vercel.app")) {
        return "https://reliabilityx.onrender.com/api";
      }
    }
  } catch {}
  return "https://reliabilityx.onrender.com/api";
};

const API_BASE = getApiBase();
export function ReliabilityXApp() {
  const getInitialTab = (): TabType => {
    try {
      const hash = window.location.hash.replace("#", "") as TabType;
      const validTabs: TabType[] = [
        "dashboard",
        "screening",
        "live_telemetry",
        "components",
        "lots",
        "predictions",
        "inspection",
        "reports",
        "engineering",
        "audit"
      ];
      if (validTabs.includes(hash)) return hash;
    } catch {}
    return "dashboard";
  };

  const [activeTab, setActiveTabState] = useState<TabType>(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const smoothScrollToTop = () => {
    try {
      const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = prefersReduced ? "auto" : "smooth";
      const viewport = document.querySelector(".app-main-viewport");
      if (viewport) {
        viewport.scrollTo({ top: 0, behavior: behavior as ScrollBehavior });
      } else {
        window.scrollTo({ top: 0, behavior: behavior as ScrollBehavior });
      }
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const smoothScrollToElement = (elementId: string) => {
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

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    try {
      window.location.hash = tab;
    } catch {}
    smoothScrollToTop();
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "") as TabType;
      const validTabs: TabType[] = [
        "dashboard",
        "screening",
        "live_telemetry",
        "components",
        "lots",
        "predictions",
        "inspection",
        "reports",
        "engineering",
        "audit"
      ];
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
    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const targetId = href.substring(1);
        const validTabs: TabType[] = [
          "dashboard",
          "screening",
          "live_telemetry",
          "components",
          "lots",
          "predictions",
          "inspection",
          "reports",
          "engineering",
          "audit"
        ];
        if (validTabs.includes(targetId as TabType)) {
          e.preventDefault();
          setActiveTab(targetId as TabType);
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
  const [liveStatus, setLiveStatus] = useState<LiveStreamStatus | null>(null);
  const [livePoints, setLivePoints] = useState<LiveTelemetryPoint[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlertItem[]>([]);
  const [liveLotHealth, setLiveLotHealth] = useState<LiveLotHealth | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("relx_sidebar_collapsed");
      if (saved === "true") setSidebarCollapsed(true);
    } catch {}
  }, []);

  const [activeDataset, setActiveDataset] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  // Hero Selected Component state for Dashboard
  const [heroCompId, setHeroCompId] = useState<string>("C-01008");
  const [heroCompData, setHeroCompData] = useState<any>(null);
  const [heroCompLoading, setHeroCompLoading] = useState<boolean>(false);
  const [heroSimulatedDrift, setHeroSimulatedDrift] = useState<number>(0.08);
  const [heroSimResult, setHeroSimResult] = useState<any>(null);
  const [heroParam, setHeroParam] = useState<string>("leakage_current_uA");

  // Inspect Modal State
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [compDetail, setCompDetail] = useState<any>(null);
  const [compLoading, setCompLoading] = useState<boolean>(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState<boolean>(false);

  // Global search and lot selection state
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [selectedLotFilter, setSelectedLotFilter] = useState<string>("ALL");

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("relx_sidebar_collapsed", String(next));
      return next;
    });
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Overview Data
  const loadSystemData = useCallback(async () => {
    try {
      setLoading(true);
      const [healthRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE}/health`).then((r) => r.json()),
        fetch(`${API_BASE}/dashboard/overview`).then((r) => r.json())
      ]);
      setActiveDataset(healthRes.active_dataset);
      setOverview(overviewRes);

      const pList = overviewRes?.top_priorities || overviewRes?.inspection_priority;
      if (pList && pList.length > 0) {
        setHeroCompId(pList[0].component_id);
      }
    } catch (err: any) {
      showToast("Error connecting to backend: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
  useEffect(() => {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = document.querySelector(".app-main-viewport");

    const targetSelectors = [
      ".hero-header",
      ".page-header",
      ".kpi-grid > .kpi-card",
      ".live-kpi-grid > .live-kpi-card",
      ".dashboard-hero-grid > .card",
      ".lot-summary-grid > .lot-summary-card",
      ".card",
      ".insight-panel",
      ".table-container",
      ".table-responsive",
      ".alert-stream-card",
      ".flowchart-node",
      ".whatif-card",
      ".dossier-tab-strip",
      ".rx-scroll-reveal",
      ".rx-floating-card",
      ".rx-reveal-item"
    ];

    if (prefersReduced || !("IntersectionObserver" in window)) {
      document.querySelectorAll(targetSelectors.join(", ")).forEach((el) => {
        el.classList.add("rx-scroll-reveal", "rx-revealed", "rx-settled", "rx-floating-card");
      });
      return;
    }

    let observer: IntersectionObserver | null = null;

    const setupScrollReveal = () => {
      if (observer) observer.disconnect();

      const vp = document.querySelector(".app-main-viewport") || viewport;
      const isMobile = window.innerWidth <= 768;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("rx-revealed", "rx-settled");
              observer?.unobserve(entry.target);
            }
          });
        },
        {
          root: vp || null,
          rootMargin: isMobile ? "0px 0px -15px 0px" : "0px 0px -35px 0px",
          threshold: 0.04
        }
      );

      // Collect candidate elements
      const candidateElements = document.querySelectorAll(targetSelectors.join(", "));
      const viewportRect = vp ? vp.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, height: window.innerHeight };

      candidateElements.forEach((el) => {
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
        const isInInitialView = rect.top < (viewportRect.bottom - (isMobile ? 20 : 50)) && rect.bottom > (viewportRect.top + 20);

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
    let introHandler: (() => void) | null = null;

    if (introOverlay) {
      introHandler = () => {
        setTimeout(setupScrollReveal, 80);
      };
      window.addEventListener("rx-intro-complete", introHandler, { once: true });
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
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    // Load initial status via REST
    fetch(`${API_BASE}/stream/status`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        setLiveStatus(d);
        if (d.recent_alerts) setLiveAlerts(d.recent_alerts);
      })
      .catch(() => {});

    const connectWs = () => {
      if (!isMounted) return;
      let wsUrl = "";
      if (API_BASE.startsWith("http")) {
        wsUrl = API_BASE.replace(/^http/, "ws").replace(/\/api$/, "") + "/ws/live";
      } else if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
        wsUrl = "wss://reliabilityx.onrender.com/ws/live";
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws/live`;
      }
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) return;
        console.log("[ReliabilityX WS] Live telemetry connected");
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const raw = typeof event.data === "string" 
            ? event.data.replace(/:\s*NaN\b/g, ": null").replace(/:\s*-?Infinity\b/g, ": null") 
            : event.data;
          const msg = JSON.parse(raw);
          if (msg.type === "CONNECTION_STATUS") {
            setLiveStatus(msg.data);
          } else if (msg.type === "LIVE_SAMPLE") {
            const pt: LiveTelemetryPoint = msg.data;
            setLivePoints((prev) => {
              const next = [...prev, pt];
              return next.length > 80 ? next.slice(-80) : next;
            });
            setLiveStatus((prev) => prev ? {
              ...prev,
              messages_count: prev.messages_count + 1,
              last_update: pt.timestamp,
              last_latency_ms: 28 + Math.random() * 15
            } : null);
          } else if (msg.type === "NEW_ALERT") {
            const al: LiveAlertItem = msg.data;
            setLiveAlerts((prev) => {
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
        setLiveStatus((prev) => prev ? { ...prev, connection_status: "DISCONNECTED" } : null);
        reconnectTimer = setTimeout(() => {
          if (isMounted) connectWs();
        }, 3000);
      };

      ws.onerror = () => {
        if (!isMounted) return;
        try { ws?.close(); } catch (e) {}
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
        try { ws.close(); } catch (e) {}
      }
    };
  }, []);

  const handleStartStream = async (sourceType: string, config: any) => {
    try {
      const res = await fetch(`${API_BASE}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_type: sourceType, config })
      });
      const data = await res.json();
      setLiveStatus(data);
      showToast(`Stream started: ${data.source_name}`, "success");
    } catch (err: any) {
      showToast(`Start stream failed: ${err.message}`, "error");
    }
  };

  const handlePauseStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/pause`, { method: "POST" });
      const data = await res.json();
      setLiveStatus(data);
      showToast("Stream paused", "info");
    } catch (err: any) {
      showToast(`Pause stream failed: ${err.message}`, "error");
    }
  };

  const handleResumeStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/resume`, { method: "POST" });
      const data = await res.json();
      setLiveStatus(data);
      showToast("Stream resumed", "info");
    } catch (err: any) {
      showToast(`Resume stream failed: ${err.message}`, "error");
    }
  };

  const handleStopStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/stream/stop`, { method: "POST" });
      const data = await res.json();
      setLiveStatus(data);
      showToast("Stream stopped", "info");
    } catch (err: any) {
      showToast(`Stop stream failed: ${err.message}`, "error");
    }
  };

  // Load Hero Component Details
  useEffect(() => {
    if (!heroCompId) return;
    let isCurrent = true;
    setHeroCompLoading(true);
    fetch(`${API_BASE}/components/${heroCompId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Component not found");
        return r.json();
      })
      .then((d) => {
        if (isCurrent) {
          setHeroCompData(d);
          setHeroCompLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) setHeroCompLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [heroCompId]);

  // Real-time Hero What-If Simulation
  useEffect(() => {
    if (!heroCompId) return;
    let isCurrent = true;
    fetch(`${API_BASE}/counterfactual/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component_id: heroCompId,
        parameter_name: heroParam,
        simulated_drift_rate: heroSimulatedDrift
      })
    })
      .then((r) => r.json())
      .then((res) => {
        if (isCurrent) setHeroSimResult(res);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [heroCompId, heroParam, heroSimulatedDrift]);

  // Load Detail for Modal when selectedCompId changes
  useEffect(() => {
    if (!selectedCompId) {
      setCompDetail(null);
      return;
    }
    let isCurrent = true;
    setCompLoading(true);
    fetch(`${API_BASE}/components/${selectedCompId}`)
      .then((r) => r.json())
      .then((data) => {
        if (isCurrent) {
          setCompDetail(data);
          setCompLoading(false);
        }
      })
      .catch((err) => {
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
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    const cleanId = globalSearch.trim().toUpperCase();
    setHeroCompId(cleanId);
    setSelectedCompId(cleanId);
    setGlobalSearch("");
  };

  return (
    <div className="app-shell">
      {/* 1. PROFESSIONAL LEFT SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* 2. MAIN APPLICATION VIEWPORT */}
      <div className="app-main-viewport">
        {/* Ambient Multi-Depth Floating Parallax Background */}
        <div className="rx-floating-background" aria-hidden="true">
          <div className="rx-floating-orb rx-orb-1" />
          <div className="rx-floating-orb rx-orb-2" />
          <div className="rx-floating-orb rx-orb-3" />
          <div className="rx-floating-grid-mesh" />
        </div>

        {/* Top Utility Bar */}
        <Topbar
          activeTab={activeTab}
          globalSearch={globalSearch}
          onSearchChange={setGlobalSearch}
          onSearchSubmit={handleSearchSubmit}
          activeDataset={activeDataset}
          onOpenDatasetModal={() => setIsDatasetModalOpen(true)}
          liveStatus={liveStatus}
          onNavigateToLive={() => setActiveTab("live_telemetry")}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onReloadDemo={async () => {
            try {
              showToast("Reloading Arrhenius benchmark...", "info");
              await fetch(`${API_BASE}/data/load-demo`, { method: "POST" });
              await loadSystemData();
              showToast("Benchmark reloaded successfully.", "success");
            } catch (err: any) {
              showToast("Reload failed: " + err.message, "error");
            }
          }}
        />

        {/* Safety Notice Banner */}
        <SafetyNotice />

        {/* Dynamic Page Content */}
        <main className="app-content">
          {activeTab === "dashboard" && (
            <DashboardTab
              overview={overview}
              loading={loading}
              heroCompId={heroCompId}
              heroCompData={heroCompData}
              heroCompLoading={heroCompLoading}
              heroParam={heroParam}
              heroSimulatedDrift={heroSimulatedDrift}
              heroSimResult={heroSimResult}
              onSelectHeroComp={setHeroCompId}
              onSelectHeroParam={setHeroParam}
              onChangeSimDrift={setHeroSimulatedDrift}
              onOpenInspectModal={(id: string) => setSelectedCompId(id)}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "live_telemetry" && (
            <LiveScreeningTab
              onInspectComp={(id: string) => setSelectedCompId(id)}
              liveStatus={liveStatus}
              livePoints={livePoints}
              liveAlerts={liveAlerts}
              liveLotHealth={liveLotHealth}
              onStartStream={handleStartStream}
              onPauseStream={handlePauseStream}
              onResumeStream={handleResumeStream}
              onStopStream={handleStopStream}
              onClearPoints={() => setLivePoints([])}
            />
          )}

          {activeTab === "screening" && (
            <ScreeningPipelineTab onInspectComp={(id: string) => setSelectedCompId(id)} />
          )}

          {activeTab === "components" && (
            <ComponentsTab
              onInspectComp={(id: string) => setSelectedCompId(id)}
              selectedLot={selectedLotFilter}
            />
          )}

          {activeTab === "lots" && (
            <LotsTab onSelectLot={(lotId: string) => {
              setSelectedLotFilter(lotId);
              setActiveTab("components");
            }} />
          )}

          {activeTab === "predictions" && (
            <PredictionsTab onInspectComp={(id: string) => setSelectedCompId(id)} />
          )}

          {activeTab === "inspection" && (
            <InspectionTriageTab onInspectComp={(id: string) => setSelectedCompId(id)} />
          )}

          {activeTab === "reports" && (
            <ReportsTab onInspectComp={(id: string) => setSelectedCompId(id)} />
          )}

          {activeTab === "engineering" && (
            <EngineeringSuiteTab
              onSaved={() => showToast("Specifications updated successfully.", "success")}
              initialSubTab="benchmarks"
            />
          )}

          {activeTab === "audit" && (
            <EngineeringSuiteTab
              onSaved={() => showToast("Specifications updated successfully.", "success")}
              initialSubTab="audit"
            />
          )}
        </main>
        {/* Mobile Bottom Navigation Dock */}
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          mobileMenuOpen={mobileMenuOpen}
        />
      </div>

      {/* Inspection & Disposition Modal */}
      {selectedCompId && (
        <ComponentDetailModal
          compId={selectedCompId}
          data={compDetail}
          loading={compLoading}
          onClose={() => setSelectedCompId(null)}
          onDecisionCommitted={() => {
            showToast(`Authoritative QA disposition committed for ${selectedCompId}`, "success");
            loadSystemData();
          }}
        />
      )}

      {/* Dataset Management Modal */}
      {isDatasetModalOpen && (
        <DatasetModal
          onClose={() => setIsDatasetModalOpen(false)}
          onDatasetLoaded={() => {
            setIsDatasetModalOpen(false);
            loadSystemData();
            showToast("New dataset loaded and screened successfully.", "success");
          }}
          showToast={showToast}
        />
      )}

      {/* Interactive Toast Notifications */}
      {toast && (
        <div className="toast-container">
          <div className={`toast-notification toast-${toast.type}`}>
            {toast.type === "success" && "✅ "}
            {toast.type === "error" && "❌ "}
            {toast.type === "info" && "ℹ️ "}
            <span style={{ marginLeft: "6px" }}>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// RENDER REACT 18 ROOT
// -----------------------------------------------------------------------------
const container = document.getElementById("root");
if (container) {
  const root = (ReactDOM as any).createRoot(container);
  root.render(<ReliabilityXApp />);
}
