import React from "react";
import Card from "../Card";
import LevelRing from "./LevelRing";

// The headline "where am I" card: level ring + title + XP progress bar.
export default function LevelCard({ level, celebrate = false }) {
  const { level: lv, title, xpIntoLevel, xpForNextLevel, xpRemaining } = level;
  const pct = xpForNextLevel ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 0;

  return (
    <Card className="gm-level">
      <LevelRing level={lv} pct={pct} celebrate={celebrate} />
      <div className="grow">
        <div className="small muted" style={{ fontWeight: 650 }}>Study level</div>
        <h2 className="section-title" style={{ marginBottom: 12 }}>{title}</h2>
        <div className="gm-xp-meta">
          <span className="small" style={{ fontWeight: 700 }}>
            {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
          </span>
          <span className="small muted">Level {lv + 1} in {xpRemaining.toLocaleString()} XP</span>
        </div>
        <div className="progress"><span style={{ width: `${pct}%` }} /></div>
      </div>
    </Card>
  );
}
