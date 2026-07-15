"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TOPICS as STATIC_TOPICS } from "./quizData";
import { QuizAPI } from "@/lib/api";
import Companion from "./Companion";
import { ZapIcon, ClockIcon, XIcon } from "@/lib/icons";

// Flash Quiz — arcade edition. Not just a quiz: it's a fast, scored survival
// game on the subjects the student is actually studying. Topics + questions are
// loaded from the backend (GET /api/quiz), which derives them from the student's
// STUDY PLANS — so the arena you play is your own coursework. (Falls back to a
// built-in bank if the API is unreachable.)
//
// You get 3 lives and 60 seconds; every correct answer scores points multiplied
// by your combo, wrong answers cost a life and break the combo. Wrong answers
// reveal the right one, so it still teaches while it plays like a game.

const ROUND_SECONDS = 60;
const START_LIVES = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Combo multiplier grows every 3-answer streak, capped at ×5.
const multFor = (combo) => Math.min(1 + Math.floor(combo / 3), 5);

function praiseFor(combo) {
  if (combo >= 9) return "UNSTOPPABLE! ⚡";
  if (combo >= 6) return "ON FIRE! 🔥";
  if (combo >= 3) return "COMBO!";
  return "Nice!";
}

export default function FlashQuiz({ onClose, onComplete, personalBest = 0, userId }) {
  // Topics come from the student's study plans (backend). null while loading.
  const [topics, setTopics] = useState(null);
  const [fromPlans, setFromPlans] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await QuizAPI.topics(userId);
        if (!active) return;
        const t = data?.topics?.length ? data.topics : STATIC_TOPICS;
        setTopics(t);
        setFromPlans(!!data?.fromPlans && data.topics?.length > 0);
      } catch {
        if (active) { setTopics(STATIC_TOPICS); setFromPlans(false); }
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const [phase, setPhase] = useState("topic"); // topic | play | done
  const [topic, setTopic] = useState(null);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [picked, setPicked] = useState(null);
  const [reaction, setReaction] = useState(null);
  const [praise, setPraise] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [endReason, setEndReason] = useState("time"); // 'time' | 'over'
  const [sessionBest, setSessionBest] = useState(personalBest);
  const [record, setRecord] = useState(false);
  const tickRef = useRef(null);
  const endedRef = useRef(false);

  const current = deck[idx] || null;
  const mood = reaction === "correct" ? "excited" : reaction === "wrong" ? "sleepy" : "happy";
  const mult = multFor(combo);

  function start(t) {
    setTopic(t);
    setDeck(shuffle(t.questions));
    setIdx(0); setScore(0); setCombo(0); setBestCombo(0); setLives(START_LIVES);
    setPicked(null); setReaction(null); setPraise(null);
    setTimeLeft(ROUND_SECONDS); setEndReason("time");
    endedRef.current = false;
    setPhase("play");
  }

  function endGame(reason) {
    if (endedRef.current) return;
    endedRef.current = true;
    setEndReason(reason);
    setPhase("done");
  }

  // Countdown.
  useEffect(() => {
    if (phase !== "play") return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(tickRef.current); endGame("time"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Report the final score once and flag a new high score.
  const reportedRef = useRef(false);
  useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      setRecord(score > sessionBest && score > 0);
      setSessionBest((b) => Math.max(b, score));
      onComplete?.(score);
    }
    if (phase !== "done") reportedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function answer(optionIdx) {
    if (picked != null || !current || endedRef.current) return;
    setPicked(optionIdx);
    const correct = optionIdx === current.answer;
    if (correct) {
      setScore((s) => s + 100 * multFor(combo));
      setCombo((c) => { const n = c + 1; setBestCombo((b) => Math.max(b, n)); setPraise(praiseFor(n)); return n; });
      setReaction("correct");
    } else {
      setCombo(0);
      setPraise("Miss!");
      setReaction("wrong");
      setLives((l) => {
        const nl = l - 1;
        if (nl <= 0) setTimeout(() => endGame("over"), 750);
        return nl;
      });
    }
    // Brief reveal (the correct option stays lit so you learn it), then advance.
    setTimeout(() => {
      if (endedRef.current) return;
      setPicked(null); setReaction(null); setPraise(null);
      setIdx((i) => (i + 1) % deck.length);
    }, 800);
  }

  const timePct = (timeLeft / ROUND_SECONDS) * 100;
  const urgent = timeLeft <= 10;

  const doneTitle = record ? "NEW HIGH SCORE! 🏆" : endReason === "over" ? "GAME OVER" : "TIME'S UP!";
  const growth = useMemo(() => {
    if (record) return `${score} points — a new personal best. You're leveling up your brain! 🎉`;
    if (score > 0) return `${score} points on ${topic?.name}. Play daily and beat ${Math.max(sessionBest, score)} next time!`;
    return "Every attempt trains your recall. Jump back in and try again!";
  }, [record, score, topic, sessionBest]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pg-quiz pg-quiz-arcade" onClick={(e) => e.stopPropagation()}>
        <button className="pg-quiz-close" onClick={onClose} aria-label="Close quiz"><XIcon size={18} /></button>

        {phase === "topic" && (
          <div className="pg-quiz-topic">
            <h2 className="card-title" style={{ marginBottom: 4 }}>Flash Quiz ⚡ Arcade</h2>
            <p className="small muted" style={{ marginBottom: 16 }}>
              {topics === null
                ? "Loading your topics…"
                : fromPlans
                  ? `3 lives · ${ROUND_SECONDS} seconds · topics from your study plans:`
                  : `3 lives · ${ROUND_SECONDS} seconds · build combos for big points. Pick a topic:`}
            </p>
            {topics === null ? (
              <p className="small muted">Fetching questions from your study plans…</p>
            ) : topics.length === 0 ? (
              <p className="small muted">No quiz topics yet — add a study plan for a subject that has questions.</p>
            ) : (
              <div className="pg-topic-grid">
                {topics.map((t) => (
                  <button key={t.id} className="pg-topic-btn" onClick={() => start(t)}>
                    <span className="pg-topic-emoji">{t.emoji}</span>
                    <span style={{ fontWeight: 700 }}>{t.name}</span>
                    <span className="small muted">{t.questions.length} questions</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "play" && current && (
          <div className="pg-quiz-play">
            <div className="pg-quiz-buddy">
              <Companion mood={mood} size={62} />
              {praise && <span className={"pg-praise" + (reaction === "wrong" ? " miss" : "")}>{praise}</span>}
            </div>

            <div className="pg-quiz-hud">
              <span className="pg-hud-lives" aria-label={`${lives} lives left`}>
                {[0, 1, 2].map((i) => <span key={i} className={"pg-heart" + (i < lives ? "" : " lost")}>❤️</span>)}
              </span>
              <span className={"badge badge-violet" + (urgent ? " pg-time-urgent" : "")}><ClockIcon size={13} /> {timeLeft}s</span>
              <span className="badge badge-blue pg-score-badge">{score.toLocaleString()} pts</span>
              {mult > 1 && <span className="badge badge-amber pg-combo"><ZapIcon size={12} /> ×{mult}</span>}
            </div>
            <div className={"pg-quiz-timerbar" + (urgent ? " urgent" : "")}><span style={{ width: `${timePct}%` }} /></div>

            <h3 className="pg-quiz-q">{current.q}</h3>
            <div className="pg-quiz-options">
              {current.options.map((opt, i) => {
                let cls = "pg-opt";
                if (picked != null) {
                  if (i === current.answer) cls += " correct";
                  else if (i === picked) cls += " wrong";
                }
                return (
                  <button key={i} className={cls} onClick={() => answer(i)} disabled={picked != null}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="pg-quiz-done center">
            <div className="pg-quiz-donebuddy"><Companion mood={record ? "excited" : "happy"} size={92} /></div>
            <h2 className="card-title pg-done-title" style={{ marginBottom: 2 }}>{doneTitle}</h2>
            <p className="small muted" style={{ marginBottom: 16 }}>{topic?.name} · best combo {bestCombo}×</p>
            <div className="pg-quiz-stats">
              <div><div className="stat-value">{score.toLocaleString()}</div><div className="stat-label">Score</div></div>
              <div><div className="stat-value">{Math.max(sessionBest, score).toLocaleString()}</div><div className="stat-label">High score</div></div>
            </div>
            <p className="pg-quiz-growth">{growth}</p>
            <div className="row gap-8" style={{ justifyContent: "center", marginTop: 18 }}>
              <button className="btn" onClick={() => setPhase("topic")}>Play again</button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
