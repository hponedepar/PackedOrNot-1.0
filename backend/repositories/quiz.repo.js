// Flash Quiz data-access layer (MySQL). Reads the quiz_questions bank and the
// study_plans table so the game can be scoped to what a student is studying.
const { pool } = require("../config/db");

// Distinct subjects the student has study plans for.
async function subjectsForUser(userId) {
  const [rows] = await pool.query(
    'SELECT DISTINCT name AS subject FROM study_plans WHERE "userId" = ?',
    [Number(userId)]
  );
  return rows.map((r) => r.subject);
}

// Distinct subjects that actually have questions in the bank.
async function subjectsWithQuestions() {
  const [rows] = await pool.query("SELECT DISTINCT subject FROM quiz_questions ORDER BY subject ASC");
  return rows.map((r) => r.subject);
}

// Every question for the given subjects.
async function questionsForSubjects(subjects) {
  if (!subjects.length) return [];
  const placeholders = subjects.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT * FROM quiz_questions WHERE subject IN (${placeholders}) ORDER BY id ASC`,
    subjects
  );
  return rows;
}

module.exports = { subjectsForUser, subjectsWithQuestions, questionsForSubjects };
