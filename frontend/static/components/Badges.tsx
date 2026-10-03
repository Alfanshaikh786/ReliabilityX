// ==============================================================================
// ReliabilityX — Status & Behaviour State Badges
// ==============================================================================
import React from "react";

export function StateBadge({ state }: { state: string }) {
  if (!state) return null;
  const s = state.toUpperCase();
  if (s === "NORMAL") return <span className="badge badge-state-normal">NORMAL</span>;
  if (s === "DRIFTING") return <span className="badge badge-state-drifting">DRIFTING</span>;
  if (s === "ACCELERATING") return <span className="badge badge-state-accel">ACCELERATING</span>;
  if (s === "UNSTABLE") return <span className="badge badge-state-unstable">UNSTABLE</span>;
  return <span className="badge badge-review">{s}</span>;
}

export function RiskBadge({ risk }: { risk: string }) {
  if (!risk) return null;
  const r = risk.toUpperCase();
  if (r === "PASS") return <span className="badge badge-pass">PASS</span>;
  if (r === "WATCH") return <span className="badge badge-watch">WATCH</span>;
  if (r === "REVIEW") return <span className="badge badge-review">REVIEW</span>;
  return <span className="badge badge-risk">HIGH RISK</span>;
}
