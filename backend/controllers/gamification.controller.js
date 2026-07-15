// Gamification summary — assembles the Progress page's data from real stats.
//
// Request flow (the same layered shape as every other feature):
//   GET /api/gamification?userId=1
//     → this controller
//       → gamification.repo (reads calendar_tasks / habits / posts / comments)
//       → config/gamification.js (pure XP / level / badge rules)
//     → one JSON object the frontend renders as-is.
const repo = require("../repositories/gamification.repo");
const G = require("../config/gamification");

// ---- small date helpers (work on plain "YYYY-MM-DD" strings, UTC-safe) ----
function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86400000;
  const nd = new Date(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${nd.getUTCFullYear()}-${p(nd.getUTCMonth() + 1)}-${p(nd.getUTCDate())}`;
}

// Current streak = consecutive days ending today (or yesterday, so the streak
// stays "alive" until the day is over) on which a task was completed.
function computeStreak(dates, today) {
  const set = new Set(dates);
  const studiedToday = set.has(today);
  let cursor = studiedToday ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  // First day of the current run (used to date streak badges).
  const runStart = streak > 0 ? addDays(studiedToday ? today : addDays(today, -1), -(streak - 1)) : null;
  return { streak, studiedToday, runStart };
}

// Longest run ever, for badge eligibility (best-ever ≥ current).
function longestStreak(dates) {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort();
  let best = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

// GET /api/gamification?userId=
async function getSummary(req, res) {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const { taskDates, taskCount, habitRows, postRows, comments } = await repo.rawStats(userId);
  const today = todayStr();

  // --- Streaks ---
  const { streak, studiedToday, runStart } = computeStreak(taskDates, today);
  const bestStreak = Math.max(streak, longestStreak(taskDates));

  // --- Habit-derived figures ---
  const completedHabits = habitRows.filter((h) => h.status === "completed").length;
  // Only count in-flight progress so a completed habit isn't rewarded twice.
  const liveProgress = habitRows
    .filter((h) => h.status !== "completed")
    .reduce((sum, h) => sum + (h.progress || 0), 0);
  const firstCompletedHabitDate = habitRows
    .filter((h) => h.status === "completed" && h.createdAt)
    .map((h) => h.createdAt)
    .sort()[0] || null;

  // --- Community figures ---
  const approvedPosts = postRows.length;
  const upvotesReceived = postRows.reduce((sum, p) => sum + (p.upvotes || 0), 0);
  const firstPostDate = postRows[0]?.createdAt || null;

  // --- XP: every term is a real, earned signal ---
  const xpBreakdown = {
    tasks: taskCount * G.XP.COMPLETED_TASK,
    habitsCompleted: completedHabits * G.XP.COMPLETED_HABIT,
    habitProgress: liveProgress * G.XP.HABIT_PROGRESS,
    posts: approvedPosts * G.XP.APPROVED_POST,
    upvotes: upvotesReceived * G.XP.UPVOTE_RECEIVED,
    comments: comments * G.XP.COMMENT,
  };
  const totalXp = Object.values(xpBreakdown).reduce((a, b) => a + b, 0);
  const levelInfo = G.resolveLevel(totalXp);

  // --- Badge evaluation context ---
  const firstCompletedDate = taskDates[0] || firstCompletedHabitDate || null;
  const stats = {
    completedTasks: taskCount,
    completedHabits,
    approvedPosts,
    bestStreak,
    level: levelInfo.level,
    firstCompletedDate,
    firstCompletedHabitDate,
    firstPostDate,
    // Date a streak badge of `threshold` days would have unlocked (best effort).
    streakBadgeDate: (threshold) =>
      streak >= threshold && runStart ? addDays(runStart, threshold - 1) : null,
  };

  const badges = G.BADGES.map((b) => {
    const earned = b.earned(stats);
    return {
      id: b.id,
      icon: b.icon,
      title: b.title,
      description: b.description,
      earned,
      unlockedAt: earned && b.date ? b.date(stats) : null,
      hint: !earned && b.hint ? b.hint(stats) : null,
    };
  });

  // Most recently unlocked badge — shown on the main dashboard strip.
  const latestBadge = badges
    .filter((b) => b.earned)
    .sort((a, b) => String(b.unlockedAt || "").localeCompare(String(a.unlockedAt || "")))[0] || null;

  // --- Growth journey (which long-term stage the level places you in) ---
  const journey = G.JOURNEY.map((s, i) => {
    const next = G.JOURNEY[i + 1];
    return {
      name: s.name,
      reached: levelInfo.level >= s.atLevel,
      current: levelInfo.level >= s.atLevel && (!next || levelInfo.level < next.atLevel),
    };
  });

  // --- AI motivation: personalised, computed from the very same figures ---
  const motivation = buildMotivation({ streak, bestStreak, studiedToday, levelInfo });

  res.json({
    xp: { total: totalXp, breakdown: xpBreakdown },
    level: levelInfo,
    streak: { current: streak, best: bestStreak, studiedToday },
    badges,
    latestBadge,
    journey,
    motivation,
  });
}

// A supportive, specific message — never generic. Priority order matters:
// the most timely nudge (a streak at risk) wins.
function buildMotivation({ streak, studiedToday, levelInfo }) {
  if (streak > 0 && !studiedToday) {
    return {
      title: "Keep your streak alive",
      message: `You're one study session away from keeping your ${streak}-day streak going. A quick 25 minutes does it.`,
    };
  }
  if (levelInfo.xpRemaining <= 120) {
    return {
      title: "So close to levelling up",
      message: `You're only ${levelInfo.xpRemaining} XP from Level ${levelInfo.level + 1}. One more completed task or focus session gets you there.`,
    };
  }
  if (streak >= 7) {
    return {
      title: "You're on a roll",
      message: `${streak} days of consistent studying — that's real discipline. Keep showing up for yourself.`,
    };
  }
  if (studiedToday) {
    return {
      title: "Nice work today",
      message: "You showed up and studied today. Small, steady steps are exactly how progress is built.",
    };
  }
  return {
    title: "Every step counts",
    message: "Complete one study task today to start a streak. The hardest part is beginning — you've got this.",
  };
}

module.exports = { getSummary };
