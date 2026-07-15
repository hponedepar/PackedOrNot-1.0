"use client";
import React from "react";
import Card from "@/components/Card";
import { PlayIcon } from "@/lib/icons";

// The arcade shelf. Flash Quiz is live; the rest are tasteful "coming soon"
// tiles so the shelf reads as a growing collection (and the architecture makes
// adding a real game just another entry here + a component).
const GAMES = [
  { id: "quiz",    emoji: "⚡", name: "Flash Quiz",       desc: "Beat the clock on real topics", live: true },
  { id: "memory",  emoji: "🃏", name: "Memory Match",     desc: "Pair concepts with meanings",   live: false },
  { id: "recall",  emoji: "⏱️", name: "Speed Recall",     desc: "How many in 60 seconds?",       live: false },
  { id: "puzzle",  emoji: "🧩", name: "Vocab Puzzle",     desc: "Rebuild the key terms",         live: false },
];

export default function GamesCard({ onPlayQuiz, bestToday }) {
  return (
    <Card className="pg-games">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <h2 className="card-title">Learning arcade</h2>
        {bestToday > 0 && <span className="badge badge-amber">Best today: {bestToday}</span>}
      </div>
      <div className="pg-games-grid">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"pg-game" + (g.live ? "" : " soon")}
            onClick={g.live ? onPlayQuiz : undefined}
            disabled={!g.live}
          >
            <span className="pg-game-emoji" aria-hidden="true">{g.emoji}</span>
            <span className="pg-game-name">{g.name}</span>
            <span className="pg-game-desc small muted">{g.desc}</span>
            {g.live ? (
              <span className="pg-game-play"><PlayIcon size={13} /> Play</span>
            ) : (
              <span className="pg-game-soon small">Soon</span>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
