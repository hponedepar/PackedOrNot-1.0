// Study plans + lessons data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

// All of a user's plans, each with its lessons nested (the shape the
// frontend Study Plans page + dashboard expect).
async function findByUser(userId) {
  const [plans] = await pool.query(
    'SELECT * FROM study_plans WHERE "userId" = ? ORDER BY id',
    [Number(userId)]
  );
  const [lessons] = await pool.query(
    'SELECT l.* FROM lessons l JOIN study_plans p ON p.id = l."planId" WHERE p."userId" = ? ORDER BY l.id',
    [Number(userId)]
  );
  return plans.map((p) => ({
    ...p,
    lessons: lessons.filter((l) => l.planId === p.id),
  }));
}

async function findPlanById(id) {
  const [rows] = await pool.query("SELECT * FROM study_plans WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

// Create a plan. Optionally seed it with `lessons` (an array of bullet-point
// titles), a `message` (the student's objective) and where it came from
// (`sourcePostId`) — this is how forum advice becomes a study plan with steps.
async function createPlan({ userId, name, module, message, frequency, sourcePostId, createdAt, lessons }) {
  const [rows] = await pool.query(
    `INSERT INTO study_plans ("userId", name, module, message, frequency, "sourcePostId", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [userId, name, module, message, frequency, sourcePostId, createdAt]
  );
  const planId = rows[0].id;

  // Insert each bullet point as a lesson.
  if (Array.isArray(lessons)) {
    for (const title of lessons) {
      if (title && title.trim()) await addLesson(planId, title.trim());
    }
  }

  const plan = await findPlanById(planId);
  const [ls] = await pool.query('SELECT * FROM lessons WHERE "planId" = ? ORDER BY id', [planId]);
  return { ...plan, lessons: ls };
}

async function removePlan(id) {
  const plan = await findPlanById(id);
  if (!plan) return null;
  await pool.query('DELETE FROM lessons WHERE "planId" = ?', [id]); // clear its lessons first
  await pool.query("DELETE FROM study_plans WHERE id = ?", [id]);
  return plan;
}

async function addLesson(planId, title) {
  const [rows] = await pool.query(
    'INSERT INTO lessons ("planId", title, completed) VALUES (?, ?, FALSE) RETURNING id',
    [planId, title]
  );
  const [ls] = await pool.query("SELECT * FROM lessons WHERE id = ?", [rows[0].id]);
  return ls[0];
}

async function setLessonCompleted(lessonId, completed) {
  await pool.query("UPDATE lessons SET completed = ? WHERE id = ?", [completed, lessonId]);
  const [ls] = await pool.query("SELECT * FROM lessons WHERE id = ?", [lessonId]);
  return ls[0] || null;
}

module.exports = { findByUser, findPlanById, createPlan, removePlan, addLesson, setLessonCompleted };
