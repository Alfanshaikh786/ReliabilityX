// ==============================================================================
// ReliabilityX — Data Types & Interface Specifications
// SIH26170: AI-Driven Anomaly Detection in Component Burn-In & Screening
// ==============================================================================

export type TabType =
  | "dashboard"
  | "screening"
  | "live_telemetry"
  | "hardware_connectivity"
  | "components"
  | "lots"
  | "predictions"
  | "inspection"
  | "reports"
  | "engineering"
  | "audit"
  | "about";

export interface LiveStreamStatus {
  connection_status: "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "STALE" | "PAUSED" | "LIVE" | "OFFLINE" | string;
  raw_connection_status?: string;
  seconds_since_last_packet?: number;
  source_type: "simulator" | "csv_replay" | "mqtt" | string;
  source_name: string;
  source_integration_note?: string;
  messages_count: number;
  messages_received?: number;
  messages_processed?: number;
  messages_rejected?: number;
  queue_depth?: number;
  last_latency_ms: number;
  avg_latency_ms?: number;
  p95_latency_ms?: number;
  processing_rate?: number;
  last_update: string;
  subscribers: number;
  adapter_health?: any;
  data_quality?: {
    good_pct: number;
    warnings_pct: number;
    rejected_pct: number;
    good_count: number;
    warnings_count: number;
    rejected_count: number;
    recent_rejected_reasons?: any[];
  };
  alerts_count: number;
  recent_alerts?: LiveAlertItem[];
}

export interface LiveTelemetryPoint {
  component_id: string;
  lot_id: string;
  timestamp: string;
  timestamp_hours: number;
  test_stage: string;
  parameter: string;
  parameter_display: string;
  value: number;
  unit: string;
  source: string;
  quality: string;
  limit: number;
  nominal: number;
  drift_rate: number;
  accel: number;
  distance_to_limit: number;
  state: "NORMAL" | "DRIFTING" | "ACCELERATING" | "UNSTABLE" | "HIGH RISK" | string;
  risk: "PASS" | "WATCH" | "REVIEW" | "HIGH RISK" | string;
  alert?: LiveAlertItem;
  predicted_168h?: number | null;
  predicted_168h_value?: number | null;
  estimated_prediction_interval?: [number, number] | null;
  conformal_radius?: number | null;
  interval_method?: string;
  nominal_coverage_pct?: number;
  p90_upper_bound?: number | null;
  p90_worst_case?: number | null;
  uncertainty_std?: number | null;
  prediction_status?: string;
  prediction_available?: boolean;
  prediction_confidence?: string;
  p90_tooltip?: string;
  drift_acceleration?: number;
  evidence_state?: string;
  evidence_status?: string;
  model_status?: string;
  model_applicability?: string;
  interval_type?: string;
  conformal_engineering_note?: string;
  probability_of_limit_breach?: number | null;
  probability_of_breach_pct?: number | string | null;
  estimated_time_to_breach?: string | null;
  test_system_status?: string;
  source_type?: string;
  test_station_id?: string;
  channel_id?: string;
  pipeline_status?: {
    telemetry: boolean;
    quality: boolean;
    features: boolean;
    anomaly: boolean;
    behaviour: boolean;
    prediction: boolean;
    prediction_label: string;
    risk: boolean;
    status_string: string;
  };
  [key: string]: any;
}

export interface LiveAlertItem {
  component_id: string;
  lot_id: string;
  title: string;
  parameter: string;
  value: number;
  limit: number;
  unit: string;
  state: string;
  risk: string;
  timestamp: string;
  reason: string;
}

export interface LiveLotHealth {
  lot_id: string;
  anomaly_percentage: number;
  drifting_count: number;
  accelerating_count: number;
  high_risk_count: number;
  is_lot_wide_pattern: boolean;
  pattern_description: string;
}

export interface RawMeasurementRecord {
  id: number;
  component_id: string;
  lot_id: string;
  timestamp: string;
  timestamp_hours: number;
  test_stage: string;
  parameter_name: string;
  value: number;
  unit: string;
  source: string;
  quality: string;
  created_at: string;
}

export interface ComponentItem {
  component_id: string;
  lot_id: string;
  dataset_id?: string;
  current_state: string;
  risk_level: string;
  inspection_priority: number;
  priority_reason: string;
  rules_fired: string[];
  behaviour_fingerprint?: any;
  explanation?: any;
}

export interface MeasurementItem {
  test_stage: string;
  timestamp_hours: number;
  parameter_name: string;
  raw_value: number;
  processed_value: number;
  is_valid: number;
  noise_flag: number;
}

export interface PredictionItem {
  component_id: string;
  lot_id?: string;
  current_state?: string;
  risk_level?: string;
  parameter_name: string;
  stage_used: string;
  model_name: string;
  model_version: string;
  predicted_168h: number;
  uncertainty_std: number;
  lower_bound_95: number;
  upper_bound_95: number;
  conformal_radius?: number;
  interval_method?: string;
  nominal_coverage_pct?: number;
  p90_worst_case: number;
  actual_168h: number | null;
  engineering_limit: number;
  is_p90_breach?: boolean;
}

export interface LotItem {
  lot_id: string;
  component_count: number;
  pass_count: number;
  watch_count: number;
  review_count: number;
  high_risk_count: number;
  anomaly_percentage: number;
  avg_drift?: number;
  accelerating_count: number;
  is_lot_wide_pattern: number | boolean;
  pattern_description: string;
  dominant_abnormal_param?: string;
}

export interface ToastInfo {
  message: string;
  type: "success" | "error" | "info";
}

export const getApiBase = (): string => {
  try {
    if (typeof window !== "undefined") {
      // 1. Check URL query parameter: ?backend=https://your-backend-url or ?backend=railway
      const urlParams = new URLSearchParams(window.location.search);
      const backendQuery = urlParams.get("backend");
      if (backendQuery && backendQuery.trim()) {
        let target = backendQuery.trim();
        if (!target.startsWith("http")) target = `https://${target}`;
        target = target.replace(/\/+$/, "");
        const formatted = target.endsWith("/api") ? target : `${target}/api`;
        try { localStorage.setItem("rx_backend_url", formatted); } catch {}
        return formatted;
      }

      // 2. Check localStorage override
      const custom = localStorage.getItem("rx_backend_url");
      if (custom && custom.trim()) {
        const clean = custom.trim().replace(/\/+$/, "");
        return clean.endsWith("/api") ? clean : `${clean}/api`;
      }

      // 3. Global injection override
      if ((window as any).__RELIABILITYX_API_URL__) {
        return (window as any).__RELIABILITYX_API_URL__;
      }

      // 4. Running directly on Railway, Render, or any unified fullstack host
      if (
        window.location.hostname.includes("railway.app") ||
        window.location.hostname.includes("onrender.com") ||
        window.location.port === "8000"
      ) {
        return `${window.location.origin}/api`;
      }

      // 5. Localhost development
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return `${window.location.protocol}//${window.location.hostname}:8000/api`;
      }

      // 6. Standalone frontend on Vercel
      if (window.location.hostname.includes("vercel.app")) {
        return "https://reliabilityx.onrender.com/api";
      }

      // 7. Any other self-hosted origin
      if (window.location.origin && window.location.origin !== "null") {
        return `${window.location.origin}/api`;
      }
    }
  } catch {}
  return "https://reliabilityx.onrender.com/api";
};

export const API_BASE = getApiBase();

/**
 * Universal, cross-platform CSV download & export utility.
 * Guarantees reliable operation across Android Chrome, Android WebView/Apps, iOS Safari, and Desktop.
 * - Stage 1: Fetches CSV binary/text via fetch() with exact stream parsing.
 * - Stage 2: In Android WebViews/Apps, uses Web Share API if supported to allow direct saving to Drive, Downloads, WhatsApp, Files.
 * - Stage 3: Programmatic anchor download with Blob Object URL and same-origin scope.
 * - Stage 4: Data URI fallback for locked-down WebViews where Object URLs are blocked.
 * - Stage 5: Fallback to direct anchor navigation with download attribute.
 */
export async function downloadCsvReport(
  onStatus?: (status: { loading: boolean; message?: string; type?: "info" | "success" | "error" }) => void
): Promise<boolean> {
  const url = `${API_BASE}/reports/export-csv`;
  const defaultFilename = `ReliabilityX_Screening_Report_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15)}.csv`;

  if (onStatus) {
    onStatus({ loading: true, message: "Exporting CSV...", type: "info" });
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "text/csv, application/octet-stream, */*"
      }
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    let filename = defaultFilename;
    const disposition = res.headers.get("Content-Disposition") || res.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    const csvText = await res.text();
    if (!csvText || csvText.trim().length === 0) {
      throw new Error("Received empty CSV from server.");
    }

    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });

    // Method 1: Web Share API for Mobile WebViews & Apps (Android & iOS)
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isAndroidApp = isMobile && typeof navigator !== "undefined" && (/wv|WebView|Version\/4\.0/i.test(navigator.userAgent) || !(window as any).chrome);

    if (isAndroidApp && typeof navigator !== "undefined" && typeof (navigator as any).canShare === "function") {
      try {
        const file = new File([blob], filename, { type: "text/csv" });
        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({
            files: [file],
            title: filename,
            text: "ReliabilityX Component Screening Report CSV"
          });
          if (onStatus) onStatus({ loading: false, message: "CSV exported successfully!", type: "success" });
          return true;
        }
      } catch (shareErr: any) {
        if (shareErr?.name === "AbortError") {
          if (onStatus) onStatus({ loading: false });
          return true;
        }
      }
    }

    // Method 2: Standard Anchor download with Blob Object URL (works on Android Chrome, iOS Safari, Desktop)
    if (typeof window !== "undefined" && window.URL && window.URL.createObjectURL) {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = blobUrl;
      link.setAttribute("download", filename);
      link.setAttribute("target", "_blank");
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 1500);

      if (onStatus) onStatus({ loading: false, message: "CSV downloaded successfully!", type: "success" });
      return true;
    }

    // Method 3: Data URI fallback for environments where Blob URLs are blocked
    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvText);
    const fallbackLink = document.createElement("a");
    fallbackLink.style.display = "none";
    fallbackLink.href = dataUri;
    fallbackLink.setAttribute("download", filename);
    fallbackLink.setAttribute("target", "_blank");
    document.body.appendChild(fallbackLink);
    fallbackLink.click();

    setTimeout(() => {
      try {
        document.body.removeChild(fallbackLink);
      } catch {}
    }, 1500);

    if (onStatus) onStatus({ loading: false, message: "CSV exported successfully!", type: "success" });
    return true;

  } catch (err: any) {
    console.warn("[ReliabilityX] Direct CSV export failed, falling back to direct anchor link:", err);

    // Method 4: Fallback to direct anchor navigation with download attribute
    try {
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;
      link.setAttribute("download", defaultFilename);
      link.setAttribute("target", "_blank");
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try { document.body.removeChild(link); } catch {}
      }, 1500);
      
      if (onStatus) onStatus({ loading: false, message: "Downloading CSV via browser link...", type: "info" });
      return true;
    } catch {
      window.location.href = url;
      if (onStatus) onStatus({ loading: false, message: "Navigating to CSV download...", type: "info" });
      return false;
    }
  }
}

