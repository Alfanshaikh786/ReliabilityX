// ==============================================================================
// ReliabilityX — Degradation Trajectory SVG Chart
// Interactive, high-precision SVG trajectory chart with Arrhenius bounds
// ==============================================================================
import React, { useMemo } from "react";
import { MeasurementItem } from "../types";

interface TrajectorySvgChartProps {
  data: any;
  paramName: string;
  simulatedDriftRate?: number;
}

export function TrajectorySvgChart({ data, paramName, simulatedDriftRate }: TrajectorySvgChartProps) {
  const measurements: MeasurementItem[] = data?.measurements || [];
  const pred = data?.predictions?.find((p: any) => p.parameter_name === paramName)
    || data?.predictions?.[0]
    || data?.prediction;

  const paramMeasures = useMemo(() => {
    return measurements
      .filter(m => m.parameter_name === paramName)
      .sort((a, b) => a.timestamp_hours - b.timestamp_hours);
  }, [measurements, paramName]);

  const specLimits: Record<string, { max: number; unit: string }> = {
    leakage_current_uA: { max: 50.0, unit: "μA" },
    standby_current_mA: { max: 12.0, unit: "mA" },
    propagation_delay_ns: { max: 8.5, unit: "ns" },
    voltage_ref_V: { max: 2.60, unit: "V" }
  };

  const limitObj = specLimits[paramName] || { max: 50.0, unit: "μA" };
  const maxLimit = limitObj.max;

  if (paramMeasures.length === 0) {
    return (
      <div style={{
        height: "380px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        background: "rgba(15, 23, 42, 0.4)",
        borderRadius: "8px",
        border: "1px dashed rgba(148, 163, 184, 0.2)"
      }}>
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📊</div>
        <div style={{ fontWeight: 600, fontSize: "13px" }}>Telemetry Measurements Unavailable</div>
        <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
          No recorded burn-in test stages (0–168h) for {paramName}.
        </div>
      </div>
    );
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
  const xForHour = (h: number) => padL + (h / 168) * chartW;

  const values = paramMeasures.map(m => m.processed_value || m.raw_value);
  const currentVal = values.length > 0 ? values[values.length - 1] : 10.0;
  const predVal = pred?.predicted_168h || (currentVal + (simulatedDriftRate || 0.05) * (168 - 96));
  const p90Val = pred?.p90_worst_case || (predVal * 1.05);

  const minY = 0;
  const maxY = Math.max(maxLimit * 1.15, p90Val * 1.05, 1.0);
  const yForVal = (v: number) => padT + chartH - ((v - minY) / (maxY - minY)) * chartH;

  const actualPoints = paramMeasures.map(m => ({
    x: xForHour(m.timestamp_hours),
    y: yForVal(m.processed_value || m.raw_value),
    hour: m.timestamp_hours,
    val: m.processed_value || m.raw_value
  }));

  const actualPath = actualPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const lastPoint = actualPoints.length > 0 ? actualPoints[actualPoints.length - 1] : { x: xForHour(96), y: yForVal(currentVal), hour: 96 };
  const predPoint = { x: xForHour(168), y: yForVal(predVal) };
  const forecastPath = `M ${lastPoint.x} ${lastPoint.y} L ${predPoint.x} ${predPoint.y}`;

  const p90Point = { x: xForHour(168), y: yForVal(p90Val) };
  const p90Path = `M ${lastPoint.x} ${lastPoint.y} L ${p90Point.x} ${p90Point.y}`;

  const simVal = currentVal + (simulatedDriftRate || 0.05) * (168 - lastPoint.hour);
  const simPoint = { x: xForHour(168), y: yForVal(simVal) };
  const simPath = `M ${lastPoint.x} ${lastPoint.y} L ${simPoint.x} ${simPoint.y}`;

  const lower95 = pred?.lower_bound_95 || (predVal - 1.5);
  const upper95 = pred?.upper_bound_95 || (predVal + 1.5);
  const ciPolygon = `
    ${lastPoint.x},${lastPoint.y} 
    ${xForHour(168)},${yForVal(upper95)} 
    ${xForHour(168)},${yForVal(lower95)}
  `;

  const limitY = yForVal(maxLimit);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
          const y = padT + chartH * frac;
          const val = maxY - frac * (maxY - minY);
          return (
            <g key={idx}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1E293B" strokeDasharray="3 3" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {hours.map(h => {
          const x = xForHour(h);
          return (
            <g key={h}>
              <line x1={x} y1={padT} x2={x} y2={padT + chartH} stroke="#1E293B" />
              <text x={x} y={H - 12} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#94A3B8">
                {h}h
              </text>
            </g>
          );
        })}

        <polygon points={ciPolygon} fill="rgba(56, 189, 248, 0.15)" />

        <line
          x1={padL}
          y1={limitY}
          x2={W - padR}
          y2={limitY}
          stroke="#F87171"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <text x={W - padR} y={limitY - 6} textAnchor="end" fontSize="10" fontWeight="700" fill="#F87171">
          LIMIT: {maxLimit.toFixed(1)} {limitObj.unit}
        </text>

        <path d={p90Path} stroke="#FB923C" strokeWidth="2" strokeDasharray="3 3" fill="none" />
        <circle cx={p90Point.x} cy={p90Point.y} r="3.5" fill="#FB923C" />

        <path d={simPath} stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="4 2" fill="none" />
        <circle cx={simPoint.x} cy={simPoint.y} r="4" fill="#FBBF24" />

        <path d={forecastPath} stroke="#38BDF8" strokeWidth="2" strokeDasharray="5 3" fill="none" />
        <circle cx={predPoint.x} cy={predPoint.y} r="4" fill="#38BDF8" />

        <path d={actualPath} stroke="#38BDF8" strokeWidth="2.8" fill="none" />
        {actualPoints.map(p => (
          <g key={p.hour}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#0B132B" stroke="#38BDF8" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFFFFF">
              {p.val.toFixed(2)}
            </text>
          </g>
        ))}

        <text x={padL} y={padT - 6} fontSize="10" fontWeight="700" fill="#94A3B8">
          {limitObj.unit}
        </text>
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#94A3B8">
          Burn-In Test Duration (Hours)
        </text>
      </svg>
    </div>
  );
}
