import React, { useState } from "react";

interface SafetyNoticeProps {
  activeTab?: string;
}

export function SafetyNotice({ activeTab }: SafetyNoticeProps = {}) {
  const [dismissed, setDismissed] = useState(false);
  if (
    dismissed ||
    activeTab !== "dashboard"
  ) {
    return null;
  }

  return (
    <div className="safety-banner">
      <div className="safety-banner-content">
        <span className="safety-icon">⚠️</span>
        <span className="safety-text">
          <strong>ENGINEERING DECISION-SUPPORT NOTICE:</strong> AI screening provides statistical early warnings and degradation forecasts. Official specifications and QA review remain authoritative.
        </span>
      </div>
      <button 
        className="safety-dismiss-btn" 
        onClick={() => setDismissed(true)} 
        title="Dismiss notice"
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  );
}
