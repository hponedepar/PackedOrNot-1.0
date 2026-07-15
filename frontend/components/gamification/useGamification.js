"use client";
// Shared hook for the Progress page and the dashboard strip: fetches the
// gamification summary, falls back to demo data if the backend is unreachable
// (same convention as the rest of the app), and — when `track` is on — detects
// a level-up or a freshly unlocked badge since the last visit so the page can
// play a subtle celebration.
import { useEffect, useState } from "react";
import { GamificationAPI } from "@/lib/api";

// Fallback mirrors the real API shape so the UI never looks broken offline.
export const DEMO_GAMIFICATION = {
  xp: { total: 1293, breakdown: {} },
  level: { level: 4, title: "Consistent Learner", xpIntoLevel: 93, xpForNextLevel: 700, xpRemaining: 607 },
  streak: { current: 18, best: 18, studiedToday: false },
  badges: [
    { id: "first-step", icon: "📚", title: "First Step", description: "Completed your very first study task or habit.", earned: true, unlockedAt: "2026-06-25", hint: null },
    { id: "goal-achiever", icon: "🎯", title: "Goal Achiever", description: "Carried a habit all the way to completion.", earned: true, unlockedAt: "2026-02-16", hint: null },
    { id: "streak-7", icon: "🔥", title: "7-Day Streak", description: "Studied 7 days in a row. Consistency is clicking.", earned: true, unlockedAt: "2026-07-01", hint: null },
    { id: "knowledge-sharer", icon: "💬", title: "Knowledge Sharer", description: "Shared 2+ pieces of advice with fellow students.", earned: true, unlockedAt: "2026-02-18", hint: null },
    { id: "streak-30", icon: "⭐", title: "30-Day Devotion", description: "A full month of daily studying. Elite discipline.", earned: false, unlockedAt: null, hint: "18/30 days" },
    { id: "champion", icon: "🏆", title: "Productivity Champion", description: "Reached Level 5 — a genuinely dedicated learner.", earned: false, unlockedAt: null, hint: "Level 4/5" },
  ],
  latestBadge: { id: "streak-7", icon: "🔥", title: "7-Day Streak", unlockedAt: "2026-07-01", earned: true },
  journey: [
    { name: "Freshman", reached: true, current: false },
    { name: "Consistent Learner", reached: true, current: true },
    { name: "Focused Student", reached: false, current: false },
    { name: "Independent Learner", reached: false, current: false },
    { name: "Academic Explorer", reached: false, current: false },
    { name: "NextStep Champion", reached: false, current: false },
  ],
  motivation: { title: "Keep your streak alive", message: "You're one study session away from keeping your 18-day streak going. A quick 25 minutes does it." },
};

export function useGamification(user, { track = false } = {}) {
  const [data, setData] = useState(null);
  const [demo, setDemo] = useState(false);
  const [celebrate, setCelebrate] = useState({ leveledUp: false, newBadgeId: null });

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user) return;
      let summary, isDemo = false;
      try {
        summary = await GamificationAPI.summary(user.id);
      } catch {
        summary = DEMO_GAMIFICATION;
        isDemo = true;
      }
      if (!active) return;
      if (track) setCelebrate(detectCelebration(user.id, summary));
      setData(summary);
      setDemo(isDemo);
    }
    run();
    return () => { active = false; };
  }, [user, track]);

  return { data, demo, celebrate };
}

// Compare this visit to the last seen level / earned-badge set (per user, in
// localStorage). Returns what changed, then records the new baseline. On the
// very first visit there is no baseline, so nothing is flagged.
function detectCelebration(userId, summary) {
  const lvKey = `nextstep_gm_level_${userId}`;
  const bgKey = `nextstep_gm_badges_${userId}`;
  const result = { leveledUp: false, newBadgeId: null };
  try {
    const prevLevel = Number(localStorage.getItem(lvKey));
    const prevBadges = new Set(JSON.parse(localStorage.getItem(bgKey) || "[]"));
    const earned = summary.badges.filter((b) => b.earned).map((b) => b.id);

    if (!Number.isNaN(prevLevel) && localStorage.getItem(lvKey) !== null) {
      if (summary.level.level > prevLevel) result.leveledUp = true;
      const fresh = earned.find((id) => !prevBadges.has(id));
      if (fresh) result.newBadgeId = fresh;
    }
    localStorage.setItem(lvKey, String(summary.level.level));
    localStorage.setItem(bgKey, JSON.stringify(earned));
  } catch { /* localStorage unavailable — skip celebration */ }
  return result;
}
