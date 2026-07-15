"use client";
import React from "react";
import Card from "@/components/Card";
import { LockIcon } from "@/lib/icons";
import { WORLDS } from "@/lib/playground";

// The learning adventure as a map of worlds instead of one long bar. Each world
// unlocks at a real study level, so exploring the map IS making real progress.
// The world you're currently in is highlighted; locked worlds show the level
// they open at, giving a clear "here's where I'm headed" horizon.
export default function WorldsMap({ level }) {
  // Current world = the highest one whose level requirement you've met.
  const currentIdx = WORLDS.reduce((acc, w, i) => (level >= w.minLevel ? i : acc), 0);

  return (
    <Card className="pg-worlds">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="card-title">Learning adventure</h2>
        <span className="small muted">You&apos;re exploring <strong>{WORLDS[currentIdx].name}</strong></span>
      </div>
      <div className="pg-worlds-track">
        {WORLDS.map((w, i) => {
          const unlocked = level >= w.minLevel;
          const current = i === currentIdx;
          return (
            <React.Fragment key={w.id}>
              <div className={"pg-world" + (unlocked ? " unlocked" : " locked") + (current ? " current" : "")}>
                <div className="pg-world-orb">
                  <span className="pg-world-emoji" aria-hidden="true">{w.emoji}</span>
                  {!unlocked && <span className="pg-world-lock"><LockIcon size={14} /></span>}
                  {current && <span className="pg-world-pin">You</span>}
                </div>
                <div className="pg-world-name">{w.name}</div>
                <div className="pg-world-meta small muted">
                  {unlocked ? w.blurb : `Unlocks at Level ${w.minLevel}`}
                </div>
              </div>
              {i < WORLDS.length - 1 && (
                <div className={"pg-world-path" + (level >= WORLDS[i + 1].minLevel ? " lit" : "")} aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}
