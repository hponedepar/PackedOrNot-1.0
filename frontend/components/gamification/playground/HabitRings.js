import React from "react";

// Three concentric activity rings (Apple Fitness style), each a genuine signal:
//   • Consistency — progress toward a 7-day streak
//   • Goals       — today's challenges completed
//   • Play        — Flash Quiz rounds played today
// Pure SVG, themed via CSS variables. The rings animate their fill on mount.
const RING_DEFS = [
  { key: "consistency", label: "Consistency", color: "var(--primary)", r: 46 },
  { key: "goals",       label: "Goals",       color: "var(--green)",   r: 35 },
  { key: "play",        label: "Play",        color: "var(--amber)",   r: 24 },
];

function Ring({ r, color, pct }) {
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);
  return (
    <>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        className="pg-ring-fill"
        style={{ "--ring-c": c, "--ring-off": offset }}
      />
    </>
  );
}

export default function HabitRings({ values }) {
  // values: { consistency, goals, play } as 0–100
  return (
    <div className="pg-rings">
      <svg viewBox="0 0 120 120" width="132" height="132" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        {RING_DEFS.map((d) => <Ring key={d.key} r={d.r} color={d.color} pct={values[d.key] || 0} />)}
      </svg>
      <ul className="pg-rings-legend">
        {RING_DEFS.map((d) => (
          <li key={d.key}>
            <span className="pg-ring-dot" style={{ background: d.color }} />
            <span className="small" style={{ fontWeight: 650 }}>{d.label}</span>
            <span className="small muted" style={{ marginLeft: "auto" }}>{Math.round(values[d.key] || 0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
