// ==============================================================================
// ReliabilityX — Master Reusable Section Hero Component
// Directly replicates the exact design, structure, styles, and animation
// of the Master "About ReliabilityX" Hero Section across all major sections.
// ==============================================================================
import React, { useEffect, useRef } from "react";

export interface SectionHeroProps {
  badge: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  id?: string;
  className?: string;
  titleId?: string;
}

export function SectionHero({
  badge,
  title,
  subtitle,
  id,
  className = "",
  titleId
}: SectionHeroProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    // Immediately trigger smooth CSS entrance animation on mount
    const raf = requestAnimationFrame(() => {
      el.classList.add("rx-settled-in");
    });

    const timer = setTimeout(() => {
      el.classList.add("rx-settled-in");
    }, 50);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      id={id}
      ref={heroRef}
      className={`card about-hero-intro mb-4 rx-about-fade ${className}`.trim()}
    >
      <div className="about-hero-eyebrow">
        <span className="about-hero-eyebrow-dot" />
        {badge}
      </div>

      <h1 id={titleId} className="about-hero-title">
        {title}
      </h1>

      <div className="about-hero-divider" aria-hidden="true">
        <span className="about-divider-line line-left" />
        <span className="about-divider-accent" />
        <span className="about-divider-line line-right" />
      </div>

      <p className="about-hero-tagline">
        {subtitle}
      </p>
    </div>
  );
}
