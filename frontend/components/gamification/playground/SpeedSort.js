"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Companion from "./Companion";
import { SortingAPI } from "@/lib/api";
import { ZapIcon, ClockIcon, XIcon, PlusIcon } from "@/lib/icons";

// Speed Sorting Challenge — the arcade game. You DRAG each term into the correct
// category bin before the clock runs out. The whole point is SPEED, not
// answering questions: right = points (combo multiplies), wrong = a time
// penalty. Terms never stop coming, so you sort as many as you can in 60s.
//
// How it differs from a Gen-AI quiz: nothing is generated. Built-in sets come
// from the student's study plans (MySQL), and you can upload a plain revision
// file that is parsed deterministically into a set — then you RACE it. The
// value is the timed reflex sorting, not AI content.

const ROUND_SECONDS = 60;
const WRONG_PENALTY = 3; // seconds lost on a wrong drop
const multFor = (combo) => Math.min(1 + Math.floor(combo / 3), 5);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SpeedSort({ onClose, onComplete, personalBest = 0, userId }) {
  const [sets, setSets] = useState(null); // null while loading
  const [fromPlans, setFromPlans] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  const [phase, setPhase] = useState("pick"); // pick | play | done
  const [set, setSet] = useState(null);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [feedback, setFeedback] = useState(null); // { cat, ok }
  const [overCat, setOverCat] = useState(null);
  const [sessionBest, setSessionBest] = useState(personalBest);
  const [record, setRecord] = useState(false);
  const tickRef = useRef(null);
  const endedRef = useRef(false);
  const reportedRef = useRef(false);

  // Load the sets available to this student (plan-matched + general + uploads).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await SortingAPI.list(userId);
        if (!active) return;
        setSets(data?.sets || []);
        setFromPlans(!!data?.fromPlans);
      } catch {
        if (active) setSets([]);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const current = deck[idx] || null;
  const mult = multFor(combo);
  const mood = feedback ? (feedback.ok ? "excited" : "sleepy") : "happy";

  function start(chosen) {
    setSet(chosen);
    setDeck(shuffle(chosen.items));
    setIdx(0); setScore(0); setCombo(0); setBestCombo(0); setCorrect(0); setWrong(0);
    setFeedback(null); setOverCat(null);
    setTimeLeft(ROUND_SECONDS);
    endedRef.current = false; reportedRef.current = false;
    setPhase("play");
  }

  function endGame() {
    if (endedRef.current) return;
    endedRef.current = true;
    setPhase("done");
  }

  // Countdown.
  useEffect(() => {
    if (phase !== "play") return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(tickRef.current); endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Report the final score once.
  useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      setRecord(score > sessionBest && score > 0);
      setSessionBest((b) => Math.max(b, score));
      onComplete?.(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function place(cat) {
    if (endedRef.current || !current) return;
    const ok = cat === current.category;
    if (ok) {
      setScore((s) => s + 100 * multFor(combo));
      setCombo((c) => { const n = c + 1; setBestCombo((b) => Math.max(b, n)); return n; });
      setCorrect((n) => n + 1);
    } else {
      setCombo(0);
      setWrong((n) => n + 1);
      setTimeLeft((t) => Math.max(0, t - WRONG_PENALTY));
    }
    setFeedback({ cat, ok });
    setOverCat(null);
    setTimeout(() => setFeedback(null), 350);

    // Next term (endless: reshuffle when the deck runs out).
    if (idx + 1 >= deck.length) { setDeck((d) => shuffle(d)); setIdx(0); }
    else setIdx(idx + 1);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const content = await file.text();
      const created = await SortingAPI.upload({ userId, filename: file.name, content });
      setSets((prev) => [created, ...(prev || [])]);
      setUploading(false);
      start(created); // jump straight into the freshly uploaded set
    } catch (err) {
      setUploading(false);
      setUploadError(err.message || "Upload failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const timePct = (timeLeft / ROUND_SECONDS) * 100;
  const urgent = timeLeft <= 10;
  const doneTitle = record ? "NEW HIGH SCORE! 🏆" : "TIME'S UP!";
  const growth = useMemo(() => {
    if (record) return `${score} points — a new personal best! Lightning-fast sorting. ⚡`;
    if (score > 0) return `${correct} sorted, ${wrong} slips. Beat ${Math.max(sessionBest, score)} next run!`;
    return "Speed comes with reps — jump back in and beat the clock!";
  }, [record, score, correct, wrong, sessionBest]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pg-quiz pg-quiz-arcade pg-sort" onClick={(e) => e.stopPropagation()}>
        <button className="pg-quiz-close" onClick={onClose} aria-label="Close game"><XIcon size={18} /></button>

        {phase === "pick" && (
          <div className="pg-sort-pick">
            <h2 className="card-title" style={{ marginBottom: 4 }}>Speed Sort ⚡</h2>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Drag each term into the right category before time runs out — {fromPlans ? "sets from your study plans:" : "pick a set:"}
            </p>

            {sets === null ? (
              <p className="small muted">Loading your sets…</p>
            ) : (
              <div className="pg-sort-setgrid">
                {sets.map((s) => (
                  <button key={s.id} className="pg-topic-btn" onClick={() => start(s)}>
                    <span className="pg-topic-emoji">{s.emoji}</span>
                    <span style={{ fontWeight: 700 }}>{s.title}</span>
                    <span className="small muted">{s.categories.length} categories · {s.items.length} items</span>
                  </button>
                ))}
              </div>
            )}

            {/* Upload your own revision file → parsed into a sortable set. */}
            <div className="pg-upload">
              <div className="pg-upload-head">
                <strong>Bring your own revision file</strong>
                <span className="small muted">.txt / .csv — no AI, just your material against the clock</span>
              </div>
              <code className="pg-upload-fmt">Category: item1, item2, item3</code>
              <div className="row gap-8" style={{ marginTop: 10 }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <PlusIcon size={14} /> {uploading ? "Reading…" : "Upload file"}
                </button>
                <input ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" hidden onChange={onFile} />
              </div>
              {uploadError && <p className="small" style={{ color: "#f87171", marginTop: 8 }}>{uploadError}</p>}
            </div>
          </div>
        )}

        {phase === "play" && current && (
          <div className="pg-sort-play">
            <div className="pg-quiz-buddy">
              <Companion mood={mood} size={54} />
            </div>

            <div className="pg-quiz-hud">
              <span className={"badge badge-violet" + (urgent ? " pg-time-urgent" : "")}><ClockIcon size={13} /> {timeLeft}s</span>
              <span className="badge badge-blue pg-score-badge">{score.toLocaleString()} pts</span>
              <span className="badge badge-green">✓ {correct}</span>
              {mult > 1 && <span className="badge badge-amber pg-combo"><ZapIcon size={12} /> ×{mult}</span>}
            </div>
            <div className={"pg-quiz-timerbar" + (urgent ? " urgent" : "")}><span style={{ width: `${timePct}%` }} /></div>

            <div className="pg-sort-stage">
              <div className="pg-sort-prompt small muted">Drag this into its category</div>
              <div
                className="pg-sort-current"
                draggable
                onDragStart={() => setOverCat(null)}
                onDragEnd={() => setOverCat(null)}
              >
                {current.term}
              </div>
              <div className="pg-sort-next small muted">
                Next: {deck[(idx + 1) % deck.length]?.term}
              </div>
            </div>

            <div className={"pg-sort-bins bins-" + set.categories.length}>
              {set.categories.map((cat) => (
                <button
                  key={cat}
                  className={
                    "pg-sort-bin" +
                    (overCat === cat ? " over" : "") +
                    (feedback?.cat === cat ? (feedback.ok ? " correct" : " wrong") : "")
                  }
                  onClick={() => place(cat)}
                  onDragOver={(e) => { e.preventDefault(); setOverCat(cat); }}
                  onDragLeave={() => setOverCat((c) => (c === cat ? null : c))}
                  onDrop={(e) => { e.preventDefault(); place(cat); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="pg-quiz-done center">
            <div className="pg-quiz-donebuddy"><Companion mood={record ? "excited" : "happy"} size={92} /></div>
            <h2 className="card-title pg-done-title" style={{ marginBottom: 2 }}>{doneTitle}</h2>
            <p className="small muted" style={{ marginBottom: 16 }}>{set?.title} · best combo {bestCombo}×</p>
            <div className="pg-quiz-stats">
              <div><div className="stat-value">{score.toLocaleString()}</div><div className="stat-label">Score</div></div>
              <div><div className="stat-value">{Math.max(sessionBest, score).toLocaleString()}</div><div className="stat-label">High score</div></div>
            </div>
            <p className="pg-quiz-growth">{growth}</p>
            <div className="row gap-8" style={{ justifyContent: "center", marginTop: 18 }}>
              <button className="btn" onClick={() => setPhase("pick")}>Pick a set</button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
