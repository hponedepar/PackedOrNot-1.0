import React from "react";

// Circular XP ring with the level number in the centre. Pure SVG, themed via
// the brand gradient (a <linearGradient> that reads the current --primary /
// --violet so it flips with study/habit mode). `size` drives both the ring and
// the number, so the same component serves the big level card and the compact
// dashboard strip.
export default function LevelRing({ level, pct = 0, size = 132, stroke = 11, celebrate = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);
  const gid = `gm-ring-grad-${size}`;

  return (
    <div className={"gm-ring" + (celebrate ? " gm-celebrate" : "")} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="gm-ring-center">
        <span className="gm-ring-cap">Level</span>
        <span className="gm-ring-num" style={{ fontSize: size * 0.3 }}>{level}</span>
      </div>
    </div>
  );
}
