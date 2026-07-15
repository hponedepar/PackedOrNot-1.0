"use client";
// Learning Playground — the client-side "fun layer" that sits on top of the
// real, server-derived progress (level / XP / streak from GamificationAPI).
//
// Design note on persistence: the numbers that must be *true* (level, XP,
// streak, badges) come from the backend and are never invented here. The purely
// cosmetic, opt-in game state (coins, the study companion, daily rewards,
// self-checked habit challenges, unlocked accessories) has no real-world source,
// so it lives in the browser per-user — exactly the same "graceful degradation"
// convention the rest of the app uses for not-yet-built backends. Swapping this
// for a real API later means re-implementing usePlayground()'s reads/writes; no
// component needs to change.
//
// Everything below is data-driven so new worlds, challenges, cosmetics and
// (later) games can be added by editing a single array.
import { useCallback, useEffect, useMemo, useState } from "react";

// ---- Constants (single source of truth — extend these, not the components) --

// The long-term learning adventure. Each world unlocks at a real study level,
// so the map is another face of genuine progress, not a parallel currency.
export const WORLDS = [
  { id: "village",    name: "Study Village",     emoji: "🏡", minLevel: 1,  blurb: "Where every journey begins." },
  { id: "forest",     name: "Focus Forest",      emoji: "🌲", minLevel: 3,  blurb: "Deep work, one session at a time." },
  { id: "mountain",   name: "Knowledge Mountain", emoji: "⛰️", minLevel: 5,  blurb: "The climb that builds real discipline." },
  { id: "city",       name: "Innovation City",   emoji: "🌆", minLevel: 7,  blurb: "Where knowledge turns into ideas." },
  { id: "academy",    name: "Master Academy",    emoji: "🎓", minLevel: 10, blurb: "You've become the mentor now." },
];

// Companion accessories — cosmetic, bought with coins, rendered on the creature.
export const ACCESSORIES = [
  { id: "none",  label: "No hat",       emoji: "",   cost: 0 },
  { id: "grad",  label: "Grad cap",     emoji: "🎓", cost: 120 },
  { id: "phones", label: "Headphones",  emoji: "🎧", cost: 180 },
  { id: "star",  label: "Star halo",    emoji: "⭐", cost: 220 },
  { id: "crown", label: "Gold crown",   emoji: "👑", cost: 400 },
];

// Stage themes — recolour the companion's home. Values feed CSS custom props.
export const THEMES = [
  { id: "aurora", label: "Aurora",  cost: 0,   grad: "linear-gradient(135deg, rgba(124,58,237,.14), rgba(167,139,250,.12))" },
  { id: "sunrise", label: "Sunrise", cost: 150, grad: "linear-gradient(135deg, rgba(245,158,11,.16), rgba(251,113,133,.14))" },
  { id: "mint",   label: "Mint",    cost: 150, grad: "linear-gradient(135deg, rgba(16,185,129,.16), rgba(45,212,191,.12))" },
  { id: "midnight", label: "Midnight", cost: 260, grad: "linear-gradient(135deg, rgba(30,41,59,.9), rgba(76,29,149,.85))" },
];

// Daily challenge pool. `auto` challenges read real activity + today's play
// state; `self` challenges are honest habit nudges the student checks off.
export const CHALLENGE_POOL = [
  { id: "streak",   icon: "🔥", label: "Keep your streak alive today",     coins: 20, type: "auto", check: (s) => s.studiedToday },
  { id: "quiz",     icon: "🧠", label: "Play a Flash Quiz round",          coins: 25, type: "auto", check: (s, d) => d.quizPlays > 0 },
  { id: "quizAce",  icon: "🎯", label: "Score 5+ in a Flash Quiz",         coins: 40, type: "auto", check: (s, d) => d.quizBest >= 5 },
  { id: "reward",   icon: "🎁", label: "Open your daily reward",           coins: 10, type: "auto", check: (s, d) => d.rewardClaimed },
  { id: "coins",    icon: "🪙", label: "Earn 60 coins today",              coins: 20, type: "auto", check: (s, d) => d.coinsToday >= 60 },
  { id: "water",    icon: "💧", label: "Drink a glass of water",           coins: 10, type: "self" },
  { id: "break",    icon: "🧘", label: "Take a proper study break",        coins: 10, type: "self" },
  { id: "review",   icon: "📖", label: "Review yesterday's notes",         coins: 15, type: "self" },
  { id: "early",    icon: "🌙", label: "Get a session in before 9 PM",     coins: 15, type: "self" },
  { id: "stretch",  icon: "🤸", label: "Stretch for two minutes",          coins: 10, type: "self" },
];

const STORAGE_PREFIX = "nextstep_pg_v1_";

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Deterministic hash so a student sees the SAME challenges all day, and a fresh
// rotation tomorrow — without any server round-trip.
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick today's four challenges: the streak nudge is always relevant, then three
// more chosen deterministically from the pool.
export function pickDailyChallenges(userId, date = todayStr()) {
  const rest = CHALLENGE_POOL.filter((c) => c.id !== "streak");
  const seed = hashStr(`${userId}:${date}`);
  const shuffled = [...rest].sort(
    (a, b) => ((hashStr(a.id) ^ seed) >>> 0) - ((hashStr(b.id) ^ seed) >>> 0)
  );
  return [CHALLENGE_POOL[0], ...shuffled.slice(0, 3)];
}

function freshDaily(date) {
  return { date, rewardClaimed: false, claimed: [], quizBest: 0, quizPlays: 0, coinsToday: 0 };
}

function defaultState() {
  return {
    version: 1,
    coins: 0,
    companion: { name: "Pip", level: 1 },
    accessory: "none",
    theme: "aurora",
    owned: ["none", "aurora"],
    totals: { quizzesPlayed: 0, bestQuiz: 0, coinsEarned: 0 },
    daily: freshDaily(todayStr()),
  };
}

function load(userId) {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    const merged = { ...base, ...saved, companion: { ...base.companion, ...saved.companion } };
    // Roll the daily block over at midnight, keeping coins & lifetime totals.
    if (!merged.daily || merged.daily.date !== todayStr()) merged.daily = freshDaily(todayStr());
    return merged;
  } catch {
    return base;
  }
}

function save(userId, state) {
  try { localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(state)); } catch { /* ignore */ }
}

// ---- The hook ------------------------------------------------------------
// Returns the cosmetic game state + actions. `onReward(payload)` is an optional
// callback the page uses to fire coin/particle celebrations; keeping the effect
// out of this file lets the hook stay pure-ish and testable.
export function usePlayground(user, onReward) {
  const [state, setState] = useState(null); // null until hydrated (avoids SSR mismatch)
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    setState(load(userId));
  }, [userId]);

  // Persist on every change.
  useEffect(() => {
    if (userId && state) save(userId, state);
  }, [userId, state]);

  const reward = useCallback((payload) => { if (onReward) onReward(payload); }, [onReward]);

  const addCoins = useCallback((amount, meta = {}) => {
    setState((s) => s && ({
      ...s,
      coins: s.coins + amount,
      totals: { ...s.totals, coinsEarned: s.totals.coinsEarned + amount },
      daily: { ...s.daily, coinsToday: s.daily.coinsToday + amount },
    }));
    reward({ type: "coins", amount, ...meta });
  }, [reward]);

  // Claim a challenge: grants its coins once. `self` challenges complete on
  // claim; `auto` ones must already be satisfied (guarded in the UI).
  const claimChallenge = useCallback((challenge) => {
    setState((s) => {
      if (!s || s.daily.claimed.includes(challenge.id)) return s;
      return {
        ...s,
        coins: s.coins + challenge.coins,
        totals: { ...s.totals, coinsEarned: s.totals.coinsEarned + challenge.coins },
        daily: {
          ...s.daily,
          claimed: [...s.daily.claimed, challenge.id],
          coinsToday: s.daily.coinsToday + challenge.coins,
        },
      };
    });
    reward({ type: "coins", amount: challenge.coins, label: challenge.label });
  }, [reward]);

  // Open the once-a-day mystery box → a random coin haul.
  const openDailyReward = useCallback(() => {
    let payoutAmount = 0;
    setState((s) => {
      if (!s || s.daily.rewardClaimed) return s;
      const payout = 20 + (hashStr(s.daily.date + s.coins) % 6) * 12; // 20–80, stable per day
      payoutAmount = payout;
      return {
        ...s,
        coins: s.coins + payout,
        totals: { ...s.totals, coinsEarned: s.totals.coinsEarned + payout },
        daily: { ...s.daily, rewardClaimed: true, coinsToday: s.daily.coinsToday + payout },
      };
    });
    return payoutAmount;
  }, []);

  // Record a finished quiz — updates today's best/plays and awards coins.
  const recordQuiz = useCallback((score) => {
    setState((s) => s && ({
      ...s,
      totals: { ...s.totals, quizzesPlayed: s.totals.quizzesPlayed + 1, bestQuiz: Math.max(s.totals.bestQuiz, score) },
      daily: { ...s.daily, quizPlays: s.daily.quizPlays + 1, quizBest: Math.max(s.daily.quizBest, score) },
    }));
  }, []);

  // Buy a cosmetic (accessory or theme) if affordable and not already owned.
  const buyItem = useCallback((id, cost) => {
    let ok = false;
    setState((s) => {
      if (!s || s.owned.includes(id) || s.coins < cost) return s;
      ok = true;
      return { ...s, coins: s.coins - cost, owned: [...s.owned, id] };
    });
    return ok;
  }, []);

  const equipAccessory = useCallback((id) => setState((s) => s && ({ ...s, accessory: id })), []);
  const equipTheme = useCallback((id) => setState((s) => s && ({ ...s, theme: id })), []);
  const renameCompanion = useCallback((name) =>
    setState((s) => s && ({ ...s, companion: { ...s.companion, name: name.slice(0, 14) } })), []);

  const actions = useMemo(() => ({
    addCoins, claimChallenge, openDailyReward, recordQuiz, buyItem, equipAccessory, equipTheme, renameCompanion,
  }), [addCoins, claimChallenge, openDailyReward, recordQuiz, buyItem, equipAccessory, equipTheme, renameCompanion]);

  return { state, actions };
}
