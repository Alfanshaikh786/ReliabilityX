// ==============================================================================
// ReliabilityX — Dataset Management Modal
// Load Synthetic Arrhenius Benchmark or Upload Flight Telemetry Data
// ==============================================================================
import React, { useState } from "react";
import { API_BASE } from "../types";

interface DatasetModalProps {
  onClose: () => void;
  onDatasetLoaded: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function DatasetModal({ onClose, onDatasetLoaded, showToast }: DatasetModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const handleUpload = async () => {
    if (!file) {
      showToast("Please select a file to upload.", "error");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/data/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      onDatasetLoaded();
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay open">
      <div className="modal-card modal-sm">
        <div className="modal-header">
          <span className="modal-title">Dataset Management</span>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="dataset-mode-card" style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
            <h4 style={{ fontSize: "14px", marginBottom: "6px" }}>🧪 Demo Benchmark Mode</h4>
            <p className="input-hint" style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Generates 125 synthetic benchmark component telemetries across 5 lots using Arrhenius physics, oxide leakage trap models, and simulated ground-truth degradation cases.
            </p>
            <button
              className="btn btn-secondary btn-block mt-2"
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE}/data/load-demo`, { method: "POST" });
                  await res.json();
                  onDatasetLoaded();
                } catch (err: any) {
                  showToast("Reload demo error: " + err.message, "error");
                }
              }}
            >
              Load Synthetic Benchmark Data
            </button>
          </div>

          <div className="dataset-mode-card mt-3" style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
            <h4 style={{ fontSize: "14px", marginBottom: "6px" }}>📁 User Data Mode (CSV, Excel, JSON)</h4>
            <p className="input-hint" style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Upload custom component telemetry files. Automatically executes data quality checks, feature extraction, and screening.
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="form-input mt-2"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              style={{ width: "100%", padding: "6px", fontSize: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
            />
            <button
              className="btn btn-primary btn-block mt-2"
              onClick={handleUpload}
              disabled={uploading || !file}
            >
              {uploading ? "Uploading & Screening..." : "Upload & Run Screening Pipeline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
