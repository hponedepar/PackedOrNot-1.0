// Gamification rules — the single source of truth for XP weights, the level
// curve, level titles, achievement badges, and the growth-journey stages.
//
// Everything here is PURE logic (no database, no Express) so it is easy to
// unit-test and — importantly — easy to extend. To reward a new activity
// later (e.g. finishing a focus session or an AI quiz once those backends
// exist), add a weight below and a line in gamification.repo.js that feeds it
// a real count. No other file needs to change.

// ---- XP weights ---------------------------------------------------------
// Each reflects a real, existing signal of consistent studying. Chosen so a
// steady student earns a satisfying total without any single action dominating.
const XP = {
  COMPLETED_TASK: 25,       // a planned study task ticked off on the calendar
  COMPLETED_HABIT: 150,     // a habit carried all the way to "completed"
  HABIT_PROGRESS: 3,        // per % of progress on habits still in flight
  APPROVED_POST: 50,        // a piece of advice shared with the community
  UPVOTE_RECEIVED: 4,       // per upvote your advice earned
  COMMENT: 15,              // helping out in a discussion
};

// ---- Level curve --------------------------------------------------------
// XP needed to advance FROM level L to L+1. Grows gently so early levels feel
// quick and later ones feel earned.
function xpToAdvance(level) {
  return 250 + (level - 1) * 150; // L1→2: 250, L2→3: 400, L3→4: 550 …
}

// Total XP required to *reach* the start of a given level.
function xpForLevelStart(level) {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToAdvance(l);
  return total;
}

// Human titles for each level — a small identity the student grows into.
const LEVEL_TITLES = [
  "Newcomer",             // 1
  "Getting Started",      // 2
  "Steady Starter",       // 3
  "Consistent Learner",   // 4
  "Focused Student",      // 5
  "Disciplined Achiever", // 6
  "Independent Learner",  // 7
  "Academic Explorer",    // 8
  "Peak Performer",       // 9
  "NextStep Champion",    // 10
];

function titleForLevel(level) {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

// Given total XP, resolve the current level and progress within it.
function resolveLevel(totalXp) {
  let level = 1;
  while (totalXp >= xpForLevelStart(level + 1)) level++;
  const intoLevel = totalXp - xpForLevelStart(level);
  const forNext = xpToAdvance(level);
  return {
    level,
    title: titleForLevel(level),
    xpIntoLevel: intoLevel,
    xpForNextLevel: forNext,
    xpRemaining: forNext - intoLevel,
  };
}

// ---- Growth journey -----------------------------------------------------
// A coarse, long-term arc laid over the levels so students can see where they
// are headed, not just their current level.
const JOURNEY = [
  { name: "Freshman", atLevel: 1 },
  { name: "Consistent Learner", atLevel: 3 },
  { name: "Focused Student", atLevel: 5 },
  { name: "Independent Learner", atLevel: 7 },
  { name: "Academic Explorer", atLevel: 8 },
  { name: "NextStep Champion", atLevel: 10 },
];

// ---- Achievement badges -------------------------------------------------
// Deliberately few and meaningful. Each `earned(stats)` reads only real data;
// `hint(stats)` shows progress toward a locked badge. `date(stats)` returns a
// best-effort unlock date (or null) so earned badges can be dated.
const BADGES = [
  {
    id: "first-step",
    icon: "📚",
    title: "First Step",
    description: "Completed your very first study task or habit.",
    earned: (s) => s.completedTasks + s.completedHabits >= 1,
    date: (s) => s.firstCompletedDate,
  },
  {
    id: "goal-achiever",
    icon: "🎯",
    title: "Goal Achiever",
    description: "Carried a habit all the way to completion.",
    earned: (s) => s.completedHabits >= 1,
    date: (s) => s.firstCompletedHabitDate,
  },
  {
    id: "streak-7",
    icon: "🔥",
    title: "7-Day Streak",
    description: "Studied 7 days in a row. Consistency is clicking.",
    earned: (s) => s.bestStreak >= 7,
    hint: (s) => `${Math.min(s.bestStreak, 7)}/7 days`,
    date: (s) => s.streakBadgeDate(7),
  },
  {
    id: "knowledge-sharer",
    icon: "💬",
    title: "Knowledge Sharer",
    description: "Shared 2+ pieces of advice with fellow students.",
    earned: (s) => s.approvedPosts >= 2,
    hint: (s) => `${Math.min(s.approvedPosts, 2)}/2 posts`,
    date: (s) => s.firstPostDate,
  },
  {
    id: "streak-30",
    icon: "⭐",
    title: "30-Day Devotion",
    description: "A full month of daily studying. Elite discipline.",
    earned: (s) => s.bestStreak >= 30,
    hint: (s) => `${Math.min(s.bestStreak, 30)}/30 days`,
    date: (s) => s.streakBadgeDate(30),
  },
  {
    id: "champion",
    icon: "🏆",
    title: "Productivity Champion",
    description: "Reached Level 5 — a genuinely dedicated learner.",
    earned: (s) => s.level >= 5,
    hint: (s) => `Level ${Math.min(s.level, 5)}/5`,
    date: () => null,
  },
];

module.exports = {
  XP,
  xpToAdvance,
  xpForLevelStart,
  titleForLevel,
  resolveLevel,
  LEVEL_TITLES,
  JOURNEY,
  BADGES,
};
