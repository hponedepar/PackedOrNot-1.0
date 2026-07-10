"use client";
// Focus Timer — not just a clock: every finished session is tied to a habit
// or study plan and logged, so the tracker/dashboard can show real focus data.
//
// BACKEND OWNER TODO:
//   Implement the FocusAPI endpoints (see lib/api.js + TEAM_HANDOFF.md).
//   The timer itself is pure frontend and already works. Sessions are kept
//   in local state (demo mode) until POST /api/focus-sessions exists —
//   the handleSessionDone() try/catch below already prefers the real API.
import React, { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HabitsAPI, FocusAPI } from "@/lib/api";
import { readPrefs } from "@/lib/prefs";
import { PlayIcon, PauseIcon, ClockIcon, CheckIcon } from "@/lib/icons";

const DURATIONS = [15, 25, 45, 60]; // minutes

// Demo sessions shown until the backend endpoint exists.
const DEMO_SESSIONS = [
  { id: 1, habitName: "Solve one coding problem each weekday", minutes: 25, date: new Date().toISOString().slice(0, 10) },
  { id: 2, habitName: "Recap yesterday's topic for 20 minutes", minutes: 45, date: new Date().toISOString().slice(0, 10) },
  { id: 3, habitName: "Solve one coding problem each weekday", minutes: 25, date: "2026-07-06" },
];

function fmt(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimerPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Timer state
  const [target, setTarget] = useState("");        // habit id ("" = free focus)
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const tick = useRef(null);

  async function load() {
    if (!user) return;
    setError("");
    try { setHabits(await HabitsAPI.list(user.id)); } catch (err) { setError(err.message); }
    try {
      setSessions(await FocusAPI.list(user.id));
      setDemoMode(false);
    } catch {
      setSessions(DEMO_SESSIONS);
      setDemoMode(true);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Start from the default session length chosen in Settings.
  useEffect(() => {
    const m = readPrefs().timerDefault;
    if (DURATIONS.includes(m)) { setMinutes(m); setSecondsLeft(m * 60); }
  }, []);

  // Countdown loop.
  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(tick.current); handleSessionDone(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
    // eslint-disable-next-line
  }, [running]);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  function pickDuration(m) {
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(minutes * 60);
  }

  const habit = habits.find((h) => String(h.id) === String(target));

  async function handleSessionDone(early = false) {
    setRunning(false);
    const spentMin = Math.max(1, Math.round((minutes * 60 - secondsLeft) / 60)) || minutes;
    const entry = {
      userId: user.id,
      habitId: habit?.id || null,
      habitName: habit?.name || "Free focus",
      minutes: early ? spentMin : minutes,
      date: new Date().toISOString().slice(0, 10),
    };
    if (demoMode) {
      setSessions((prev) => [{ id: Date.now(), ...entry }, ...prev]);
    } else {
      try { await FocusAPI.create(entry); load(); }
      catch { setSessions((prev) => [{ id: Date.now(), ...entry }, ...prev]); }
    }
    setSecondsLeft(minutes * 60);
    flash(`Session logged: ${entry.minutes} min on "${entry.habitName}"${habit ? " — progress updated" : ""}`);
    // BACKEND OWNER TODO: on the server, a logged session for a habit should
    // also bump that habit's progress (e.g. +10% per completed session).
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayMin = sessions.filter((s) => s.date === today).reduce((n, s) => n + s.minutes, 0);
  const weekCount = sessions.length;
  const pct = Math.round(((minutes * 60 - secondsLeft) / (minutes * 60)) * 100);

  return (
    <AppShell
      title="Focus Timer"
      subtitle="Pick a habit or plan, focus, and every session is logged to your progress."
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}
      {demoMode && (
        <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
          Demo data — the <code>/api/focus-sessions</code> endpoints aren&rsquo;t connected yet (see TEAM_HANDOFF.md).
        </div>
      )}

      <div className="grid grid-3 mb-24">
        <Card className="center"><div className="stat-value" style={{ color: "var(--primary)" }}>{todayMin}<span style={{ fontSize: 16 }}> min</span></div><div className="stat-label">Focused today</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--violet)" }}>{weekCount}</div><div className="stat-label">Sessions logged</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--green)" }}>{sessions.filter((s) => s.date === today).length}</div><div className="stat-label">Sessions today</div></Card>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        {/* Timer card */}
        <Card className="center">
          <div className="field-group" style={{ textAlign: "left" }}>
            <label className="field">What are you focusing on?</label>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={running}>
              <option value="">Free focus (no habit linked)</option>
              {habits.filter((h) => h.status === "active").map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="chip-row mb-16" style={{ justifyContent: "center" }}>
            {DURATIONS.map((m) => (
              <button key={m} className={"filter-chip" + (minutes === m ? " active" : "")} onClick={() => pickDuration(m)} disabled={running}>
                {m} min
              </button>
            ))}
          </div>

          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", margin: "8px 0" }}>
            {fmt(secondsLeft)}
          </div>
          <div className="mb-16"><div className="progress"><span style={{ width: `${pct}%` }} /></div></div>

          <div className="row gap-8" style={{ justifyContent: "center" }}>
            {!running ? (
              <Button variant="primary" onClick={() => setRunning(true)}><PlayIcon size={16} /> {secondsLeft < minutes * 60 ? "Resume" : "Start focus"}</Button>
            ) : (
              <Button onClick={() => setRunning(false)}><PauseIcon size={16} /> Pause</Button>
            )}
            {secondsLeft < minutes * 60 && (
              <>
                <Button variant="success" onClick={() => handleSessionDone(true)}><CheckIcon size={16} /> End &amp; log</Button>
                <Button variant="danger" onClick={reset}>Reset</Button>
              </>
            )}
          </div>
          {habit && <p className="small muted mt-16">Finishing this session updates the progress of <strong>{habit.name}</strong>.</p>}
        </Card>

        {/* Session history */}
        <Card>
          <div className="row gap-8 mb-16">
            <span className="stat-icon" style={{ background: "var(--primary-050)", color: "var(--primary-600)", width: 36, height: 36 }}><ClockIcon size={18} /></span>
            <h3 className="card-title">Recent sessions</h3>
          </div>
          <div className="stack gap-8">
            {sessions.length === 0 && <p className="muted small">No sessions yet — start your first focus session.</p>}
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="row" style={{ justifyContent: "space-between", padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{s.habitName}</div>
                  <div className="small muted">{s.date}</div>
                </div>
                <span className="small" style={{ fontWeight: 700, color: "var(--primary)" }}>{s.minutes} min</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
