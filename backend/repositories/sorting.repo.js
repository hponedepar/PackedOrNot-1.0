// Speed Sorting data-access layer (MySQL). Reads built-in sets (matched to a
// student's study plans, plus general ones) and a student's own uploaded sets,
// and creates new sets parsed from an uploaded revision file.
const { pool } = require("../config/db");

// Subjects the student is studying (their study plans) — used to pick which
// built-in sets to offer, keeping the game tied to their coursework.
async function planSubjects(userId) {
  const [rows] = await pool.query(
    'SELECT DISTINCT name AS subject FROM study_plans WHERE "userId" = ?',
    [Number(userId)]
  );
  return rows.map((r) => r.subject);
}

// Built-in sets whose subject matches one the student studies, PLUS general
// (subject IS NULL) sets which are always available.
async function builtinSets(subjects) {
  if (subjects.length) {
    const placeholders = subjects.map(() => "?").join(",");
    const [rows] = await pool.query(
      `SELECT * FROM sorting_sets
       WHERE source = 'builtin' AND (subject IS NULL OR subject IN (${placeholders}))
       ORDER BY (subject IS NULL), id`,
      subjects
    );
    return rows;
  }
  const [rows] = await pool.query(
    "SELECT * FROM sorting_sets WHERE source = 'builtin' AND subject IS NULL ORDER BY id"
  );
  return rows;
}

async function uploadSets(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM sorting_sets WHERE source = \'upload\' AND "userId" = ? ORDER BY id DESC',
    [Number(userId)]
  );
  return rows;
}

async function itemsForSets(setIds) {
  if (!setIds.length) return [];
  const placeholders = setIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT "setId", term, category FROM sorting_items WHERE "setId" IN (${placeholders}) ORDER BY id ASC`,
    setIds
  );
  return rows;
}

async function findSet(id) {
  const [rows] = await pool.query("SELECT * FROM sorting_sets WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

// Create an upload set + its items in one go.
async function createUploadSet({ userId, title, filename, items }) {
  const [rows] = await pool.query(
    'INSERT INTO sorting_sets ("userId", title, subject, source, filename, "createdAt") ' +
      "VALUES (?, ?, NULL, 'upload', ?, CURRENT_DATE) RETURNING id",
    [Number(userId), title, filename || null]
  );
  const setId = rows[0].id;

  const placeholders = items.map(() => "(?, ?, ?)").join(", ");
  const values = items.flatMap((it) => [setId, it.term, it.category]);
  await pool.query(`INSERT INTO sorting_items ("setId", term, category) VALUES ${placeholders}`, values);

  return findSet(setId);
}

async function removeSet(id) {
  const set = await findSet(id);
  if (!set) return null;
  await pool.query('DELETE FROM sorting_items WHERE "setId" = ?', [id]);
  await pool.query("DELETE FROM sorting_sets WHERE id = ?", [id]);
  return set;
}

module.exports = {
  planSubjects, builtinSets, uploadSets, itemsForSets, findSet, createUploadSet, removeSet,
};
