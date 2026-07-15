// Gamification data-access layer (MySQL).
//
// This repo does NOT invent any numbers — every figure is read straight from
// the tables other features already fill in:
//   • calendar_tasks (completed)  → study consistency + daily streaks
//   • habits (completed / progress) → follow-through on goals
//   • posts / comments            → community contribution
// The controller turns these raw aggregates into levels, XP and badges using
// the pure rules in config/gamification.js.
const { pool } = require("../config/db");

// Distinct dates (YYYY-MM-DD) on which the user completed at least one planned
// task. dateStrings:true in config/db.js keeps these as plain strings.
async function completedTaskDates(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT date FROM calendar_tasks
     WHERE "userId" = ? AND completed = TRUE
     ORDER BY date ASC`,
    [Number(userId)]
  );
  return rows.map((r) => r.date);
}

async function completedTaskCount(userId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM calendar_tasks WHERE "userId" = ? AND completed = TRUE',
    [Number(userId)]
  );
  return rows[0].n;
}

// Every habit row for the user (small set — computed in JS for clarity).
async function habits(userId) {
  const [rows] = await pool.query(
    'SELECT status, progress, "createdAt" FROM habits WHERE "userId" = ?',
    [Number(userId)]
  );
  return rows;
}

// Approved posts the user authored, with the upvotes each earned.
async function approvedPosts(userId) {
  const [rows] = await pool.query(
    `SELECT upvotes, "createdAt" FROM posts
     WHERE "userId" = ? AND status = 'approved'
     ORDER BY "createdAt" ASC`,
    [Number(userId)]
  );
  return rows;
}

async function commentCount(userId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM comments WHERE "userId" = ?',
    [Number(userId)]
  );
  return rows[0].n;
}

// Pull everything the controller needs in one call (runs the queries in
// parallel — same style as the dashboard's Promise.all on the frontend).
async function rawStats(userId) {
  const [taskDates, taskCount, habitRows, postRows, comments] = await Promise.all([
    completedTaskDates(userId),
    completedTaskCount(userId),
    habits(userId),
    approvedPosts(userId),
    commentCount(userId),
  ]);
  return { taskDates, taskCount, habitRows, postRows, comments };
}

module.exports = { rawStats };
