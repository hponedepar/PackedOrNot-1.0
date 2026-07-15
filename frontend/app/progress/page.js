"use client";
// Playground — a dark, neon ARCADE dashboard (theme scoped to this page only).
// One immersive stage with a live animated background, your study buddy, and one
// big button into the game. No stat clutter, no abstract currency — just "press
// play". The game (Flash Quiz Arcade) is the whole feature.
//
// Real progress (level / XP / streak) still comes from the backend; the game's
// high score is tracked per-user in the browser (usePlayground).
import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useGamification } from "@/components/gamification/useGamification";
import { usePlayground } from "@/lib/playground";
import Companion from "@/components/gamification/playground/Companion";
import ArcadeBackground from "@/components/gamification/playground/ArcadeBackground";
import SpeedSort from "@/components/gamification/playground/SpeedSort";
import { ACCESSORIES } from "@/lib/playground";
import { PlayIcon, TrophyIcon } from "@/lib/icons";

function moodFor(streak, leveledUp) {
  if (leveledUp) return "excited";
  if (streak.current >= 7) return "proud";
  if (streak.studiedToday) return "happy";
  return "sleepy";
}

export default function PlaygroundPage() {
  const { user } = useAuth();
  const { data, demo, celebrate } = useGamification(user, { track: true });
  const { state: pg, actions } = usePlayground(user);
  const [quizOpen, setQuizOpen] = useState(false);

  if (!data || !pg) {
    return (
      <AppShell title="Playground" subtitle="Loading the arcade…">
        <p className="muted">Warming things up…</p>
      </AppShell>
    );
  }

  const mood = moodFor(data.streak, celebrate.leveledUp);
  const accessory = ACCESSORIES.find((a) => a.id === pg.accessory)?.emoji || "";
  const name = pg.companion.name;

  const sub = data.streak.studiedToday
    ? `Nice work today — think you can beat your high score?`
    : `Sort concepts into the right bins before the clock runs out.`;

  return (
    <AppShell title="Playground" subtitle="Enter the arcade and turn studying into a game.">
      {celebrate.leveledUp && (
        <div className="gm-levelup">
          <div className="stat-icon" style={{ background: "var(--surface)", color: "var(--primary-600)" }}>
            <TrophyIcon size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 780 }}>Level up! You reached Level {data.level.level}</div>
            <div className="small muted">{data.level.title} — {name} is thrilled.</div>
          </div>
        </div>
      )}

      {demo && (
        <div className="banner mb-24">Showing demo data — the gamification API isn&apos;t reachable right now.</div>
      )}

      {/* The arcade stage: live background + buddy + one big Play button. */}
      <div className="pg-stage-arcade">
        <ArcadeBackground />
        <div className="pg-arcade-glow-ring" aria-hidden="true" />
        <div className="pg-arcade-content">
          <span className="pg-arcade-eyebrow">Learning Arcade</span>
          <div className="pg-arcade-buddy">
            <Companion mood={mood} accessory={accessory} size={150} />
          </div>
          <h2 className="pg-arcade-title">Speed Sort</h2>
          <p className="pg-arcade-sub">{sub}</p>
          <button className="pg-arcade-play" onClick={() => setQuizOpen(true)}>
            <PlayIcon size={20} /> PLAY NOW
          </button>
          <div className="pg-arcade-hint">Drag terms into bins · 60 seconds · upload your own revision file</div>
        </div>
      </div>

      {quizOpen && (
        <SpeedSort
          userId={user.id}
          onClose={() => setQuizOpen(false)}
          onComplete={(score) => actions.recordQuiz(score)}
          personalBest={pg.totals.bestQuiz}
        />
      )}
    </AppShell>
  );
}
