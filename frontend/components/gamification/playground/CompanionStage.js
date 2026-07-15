"use client";
import React, { useState } from "react";
import Companion from "./Companion";
import { ACCESSORIES, THEMES } from "@/lib/playground";
import { SparkIcon, CheckIcon } from "@/lib/icons";

// The centrepiece of the Playground: the companion in its themed home, with a
// speech bubble that acts as the AI coach. Its mood and words are computed from
// the student's *real* momentum (streak, whether they studied today, how close
// the next level is), so encouragement always feels earned and specific.

// Pick an expression from real signals. Priority: a level-up celebration wins,
// then a hot streak, then whether today's session is done.
function moodFor({ studiedToday, streak }, leveledUp) {
  if (leveledUp) return "excited";
  if (streak >= 7) return "proud";
  if (studiedToday) return "happy";
  return "sleepy";
}

// A short, companion-voiced coach line. Falls back to the server's motivation
// message so the two never contradict each other.
function coachLine({ name, mood, level, motivation }) {
  const lines = {
    excited: `Level ${level}! ${name} is bouncing off the walls — look how far you've come! 🎉`,
    proud:   `${name} is so proud of your streak. This is what real discipline looks like.`,
    happy:   `Nice one today! ${name} loves studying alongside you. Keep it rolling.`,
    sleepy:  motivation?.message || `${name} is waiting for today's first session. One small step wakes them right up.`,
  };
  return lines[mood];
}

export default function CompanionStage({ data, pg, leveledUp, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const level = data.level;
  const pct = level.xpForNextLevel ? Math.round((level.xpIntoLevel / level.xpForNextLevel) * 100) : 0;
  const mood = moodFor({ studiedToday: data.streak.studiedToday, streak: data.streak.current }, leveledUp);
  const name = pg.companion.name;
  const accessory = ACCESSORIES.find((a) => a.id === pg.accessory)?.emoji || "";
  const theme = THEMES.find((t) => t.id === pg.theme) || THEMES[0];
  const dark = pg.theme === "midnight";

  function commit() {
    const n = draft.trim();
    if (n) onRename(n);
    setEditing(false);
  }

  return (
    <div className={"card pg-stage" + (dark ? " pg-stage-dark" : "")} style={{ "--stage-grad": theme.grad }}>
      <div className="pg-stage-scene">
        <Companion mood={mood} accessory={accessory} size={158} />
      </div>

      <div className="pg-stage-info">
        <div className="row gap-8" style={{ marginBottom: 2 }}>
          {editing ? (
            <span className="row gap-8">
              <input
                className="input pg-name-input"
                autoFocus
                value={draft}
                maxLength={14}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                aria-label="Companion name"
              />
              <button className="btn btn-primary btn-sm" onClick={commit} aria-label="Save name"><CheckIcon size={14} /></button>
            </span>
          ) : (
            <>
              <h3 className="pg-companion-name">{name}</h3>
              <button
                className="pg-rename"
                onClick={() => { setDraft(name); setEditing(true); }}
                aria-label="Rename companion"
                title="Rename"
              >✏️</button>
            </>
          )}
        </div>
        <div className="pg-companion-sub">Your study buddy · Level {level.level}</div>

        <div className="pg-bubble">
          <span className="pg-bubble-ai"><SparkIcon size={13} /> AI Coach</span>
          <p>{coachLine({ name, mood, level: level.level, motivation: data.motivation })}</p>
        </div>

        <div className="pg-xp">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span className="small" style={{ fontWeight: 700 }}>{level.title}</span>
            <span className="small muted">{level.xpIntoLevel} / {level.xpForNextLevel} XP</span>
          </div>
          <div className="progress"><span style={{ width: `${pct}%` }} /></div>
          <div className="small muted" style={{ marginTop: 6 }}>{level.xpRemaining} XP to Level {level.level + 1}</div>
        </div>
      </div>
    </div>
  );
}
