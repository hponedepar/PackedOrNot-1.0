// Habits / study-plan data-access layer (MySQL).
const { pool } = require("../config/db");

// All habits, or just one user's habits. Newest first.
async function find(userId) {
  if (userId === undefined || userId === null || userId === "") {
    const [rows] = await pool.query("SELECT * FROM habits ORDER BY id DESC");
    return rows;
  }
  const [rows] = await pool.query(
    "SELECT * FROM habits WHERE userId = ? ORDER BY id DESC",
    [Number(userId)]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM habits WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO habits (userId, sourcePostId, name, frequency, status, progress, createdAt)
     VALUES (?, ?, ?, ?, 'active', 0, ?)`,
    [data.userId, data.sourcePostId, data.name, data.frequency, data.createdAt]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = ["status", "progress", "name", "frequency"];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE habits SET ${sets.join(", ")} WHERE id = ?`, params);
  }
  return findById(id);
}

async function remove(id) {
  const habit = await findById(id);
  if (!habit) return null;
  await pool.query("DELETE FROM habits WHERE id = ?", [id]);
  return habit;
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM habits");
  return rows[0].n;
}

async function countByStatus(status) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM habits WHERE status = ?",
    [status]
  );
  return rows[0].n;
}

module.exports = { find, findById, create, update, remove, count, countByStatus };
