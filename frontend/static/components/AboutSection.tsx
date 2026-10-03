// ==============================================================================
// ReliabilityX — Dedicated About Page & Team Brigebytes Component
// Separate Informational View Accessible from Left Sidebar
// ==============================================================================
import React, { useEffect, useRef } from "react";

interface TeamMember {
  id: string;
  name: string;
  role: "TEAM LEADER" | "TEAM MEMBER";
  initials: string;
  team: string;
  isLeader?: boolean;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "alfan",
    name: "Alfan Yaseen Shaikh",
    role: "TEAM LEADER",
    initials: "AS",
    team: "Brigebytes",
    isLeader: true
  },
  {
    id: "samrudhi",
    name: "Samrudhi Shetty",
    role: "TEAM MEMBER",
    initials: "SA",
    team: "Brigebytes"
  },
  {
    id: "amrutha",
    name: "Amrutha Somashekar Shetty",
    role: "TEAM MEMBER",
    initials: "AS",
    team: "Brigebytes"
  },
  {
    id: "amarnath",
    name: "Amarnath Singh",
    role: "TEAM MEMBER",
    initials: "AM",
    team: "Brigebytes"
  },
  {
    id: "manish",
    name: "Manish Kumar Verma",
    role: "TEAM MEMBER",
    initials: "MA",
    team: "Brigebytes"
  },
  {
    id: "janith",
    name: "Janith Bopanna A M",
    role: "TEAM MEMBER",
    initials: "JA",
    team: "Brigebytes"
  }
];

const IMPACT_AREAS = [
  {
    id: "early_detection",
    title: "Early Detection",
    description: "Identifies subtle degradation patterns, parameter drift, and abnormal behavior during early Burn-In and ESS screening.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  },
  {
    id: "predictive_reliability",
    title: "Predictive Reliability",
    description: "Estimates future parameter trajectories and reliability risk from observed screening behavior, with uncertainty-aware predictions.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    )
  },
  {
    id: "engineering_decision_support",
    title: "Engineering Decision Support",
    description: "Provides actionable risk classifications, supporting evidence, and inspection insights to assist engineering and quality teams.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  },
  {
    id: "lot_level_intelligence",
    title: "Lot-Level Intelligence",
    description: "Analyzes multi-unit screening distributions to distinguish individual component anomalies from broader lot-level patterns.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  {
    id: "explainable_screening",
    title: "Explainable Screening",
    description: "Links anomaly and prediction results to measured parameters, observed trends, and relevant screening conditions for transparent analysis.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    )
  },
  {
    id: "inspection_prioritization",
    title: "Inspection Prioritization",
    description: "Prioritizes components showing stronger anomaly or degradation indicators to help focus engineering inspection resources.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
];

const VALUES = [
  {
    num: "01",
    title: "Reliability",
    description: "Focused on dependable screening analysis and consistent identification of abnormal component behavior.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  {
    num: "02",
    title: "Explainability",
    description: "Every anomaly and prediction should be supported by understandable evidence, trends, and measurable parameters.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  },
  {
    num: "03",
    title: "Accuracy",
    description: "Prioritizing reliable measurement analysis, robust modeling, and evidence-based interpretation of screening data.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    )
  },
  {
    num: "04",
    title: "Innovation",
    description: "Advancing beyond static threshold checks through predictive degradation analysis and intelligent screening methods.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  {
    num: "05",
    title: "Engineering First",
    description: "Designed to support engineers and quality teams with practical, interpretable insights for screening and inspection decisions.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    )
  }
];

export function AboutSection() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const rootEl = sectionRef.current;
    if (!rootEl) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = rootEl.querySelectorAll<HTMLElement>(
      ".rx-about-fade, .rx-about-heading, .rx-about-card, .team-card, .about-hero-intro"
    );

    if (prefersReduced || !("IntersectionObserver" in window)) {
      targets.forEach((el) => {
        el.classList.add("rx-settled-in");
      });
      return;
    }

    // High-performance IntersectionObserver with once-only reveal
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("rx-settled-in");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -30px 0px",
        threshold: 0.08
      }
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="section-about"
      ref={sectionRef}
      className="about-section-container mb-4"
      aria-labelledby="about-main-heading"
    >
      {/* 1. Hero-Style Introduction (Centered Title, Decorative Line, Tagline) */}
      <div className="card about-hero-intro mb-4 rx-about-fade">
        <h1 id="about-main-heading" className="about-hero-title">
          About Reliability<span style={{ color: "var(--accent-blue)" }}>X</span>
        </h1>

        <div className="about-hero-divider" aria-hidden="true">
          <span className="about-divider-line line-left" />
          <span className="about-divider-accent" />
          <span className="about-divider-line line-right" />
        </div>

        <p className="about-hero-tagline">
          AI-assisted reliability intelligence for high-reliability component screening and space applications.
        </p>
      </div>

      {/* 2. Our Impact Areas (6 Professional Cards) */}
      <div className="card mb-4 rx-about-fade">
        <div className="card-header about-section-inner-header">
          <div className="about-section-header-left">
            <span className="card-title rx-about-heading">OUR IMPACT AREAS</span>
            <p className="about-subheading-note">
              Advancing high-reliability component screening through predictive reliability intelligence.
            </p>
          </div>
          <span className="card-badge d-desktop-only">6 OPERATIONAL DOMAINS</span>
        </div>

        <div className="about-impact-grid">
          {IMPACT_AREAS.map((item) => (
            <div key={item.id} className="about-impact-item rx-about-card">
              <div className="about-impact-icon-badge">
                {item.icon}
              </div>
              <h4 className="about-impact-title">{item.title}</h4>
              <p className="about-impact-text">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Our Mission & 4. Our Vision (Side-by-Side Responsive Grid) */}
      <div className="about-two-col-grid mb-4">
        {/* OUR MISSION */}
        <div className="card about-mv-card rx-about-card">
          <div className="about-card-top-icon-row">
            <div className="about-icon-box icon-mission">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className="about-mv-label">CORE DIRECTIVE</span>
          </div>
          <h3 className="about-card-title rx-about-heading">Our Mission</h3>
          <p className="about-card-body-text">
            To make high-reliability component screening more intelligent, predictive, and explainable by transforming Burn-In and ESS measurements into actionable reliability insights for engineering teams.
          </p>
        </div>

        {/* OUR VISION */}
        <div className="card about-mv-card rx-about-card">
          <div className="about-card-top-icon-row">
            <div className="about-icon-box icon-vision">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12c2.5-5 6.5-8 10-8s7.5 3 10 8c-2.5 5-6.5 8-10 8s-7.5-3-10-8z" />
              </svg>
            </div>
            <span className="about-mv-label">FUTURE HORIZON</span>
          </div>
          <h3 className="about-card-title rx-about-heading">Our Vision</h3>
          <p className="about-card-body-text">
            To advance reliability engineering for space applications through data-driven intelligence that helps engineers identify emerging degradation earlier, understand screening behavior, and make better-informed reliability decisions.
          </p>
        </div>
      </div>

      {/* 5. Our Values (5 Values Grid) */}
      <div className="card mb-4 rx-about-fade">
        <div className="card-header about-section-inner-header">
          <div className="about-section-header-left">
            <span className="card-title rx-about-heading">OUR VALUES</span>
            <p className="about-subheading-note">
              Core engineering principles guiding reliable, explainable, and evidence-based screening intelligence.
            </p>
          </div>
          <span className="card-badge d-desktop-only">5 PILLARS</span>
        </div>

        <div className="about-values-grid">
          {VALUES.map((val) => (
            <div key={val.num} className="about-value-item rx-about-card">
              <div className="about-value-header">
                <div className="about-value-num">{val.num}</div>
                <div className="about-value-icon-box">{val.icon}</div>
              </div>
              <h4 className="about-value-title">{val.title}</h4>
              <p className="about-value-text">{val.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TEAM BRIGEBYTES SECTION */}
      <div id="section-team-brigebytes" className="card about-team-card-wrapper mb-4 rx-about-fade">
        <div className="about-team-header-block text-center">
          <div className="team-identifier-tag">
            <span className="team-tag-pulse" />
            TEAM BRIGEBYTES
          </div>
          <h3 className="team-main-heading rx-about-heading">Team Brigebytes</h3>
        </div>

        {/* 3 cards/row desktop, 2 cards/row tablet, 1 card/row mobile */}
        <div className="team-cards-grid" role="list">
          {TEAM_MEMBERS.map((member, idx) => {
            const isLeader = member.isLeader === true;

            return (
              <div
                key={member.id}
                role="listitem"
                className={`team-card ${isLeader ? "is-leader" : "is-member"}`}
                style={{ "--stagger-index": idx } as any}
              >
                {/* Top identifier */}
                <div className="team-card-top-bar">
                  <span className="team-identifier-label">{member.team}</span>
                </div>

                {/* Profile / Avatar Area */}
                <div className="team-avatar-container">
                  <div className={`team-avatar-frame ${isLeader ? "leader-frame" : "member-frame"}`}>
                    <span className="team-avatar-initials">{member.initials}</span>
                  </div>
                </div>

                {/* Member Name & Role */}
                <div className="team-member-info">
                  <h4 className="team-member-name" title={member.name}>
                    {member.name}
                  </h4>

                  <div className="team-role-wrap">
                    <span className={`team-role-badge ${isLeader ? "role-leader" : "role-member"}`}>
                      {isLeader ? (
                        <>
                          <svg className="leader-star-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span>TEAM LEADER</span>
                        </>
                      ) : (
                        <span>TEAM MEMBER</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Consistent Card Footer */}
                <div className="team-card-footer">
                  <span className="team-footer-meta">Brigebytes · ReliabilityX</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
