// Calendar tasks data-access layer (MySQL).
const { pool } = require("../config/db");

// MySQL stores `completed` as TINYINT(1) (0/1). Convert it back to a real
// boolean so the API JSON stays identical to the old in-memory data.
function mapTask(row) {
  if (!row) return row;
  return { ...row, completed: Boolean(row.completed) };
}

async function find(userId) {
  let rows;
  if (userId === undefined || userId === null || userId === "") {
    [rows] = await pool.query("SELECT * FROM calendar_tasks ORDER BY id");
  } else {
    [rows] = await pool.query(
      "SELECT * FROM calendar_tasks WHERE userId = ? ORDER BY id",
      [Number(userId)]
    );
  }
  return rows.map(mapTask);
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM calendar_tasks WHERE id = ? LIMIT 1", [id]);
  return mapTask(rows[0]) || null;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO calendar_tasks (userId, habitId, title, date, time, completed)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [data.userId, data.habitId, data.title, data.date, data.time]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.completed !== undefined) {
    sets.push("completed = ?");
    params.push(fields.completed ? 1 : 0);
  }
  for (const key of ["title", "date", "time"]) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE calendar_tasks SET ${sets.join(", ")} WHERE id = ?`, params);
  }
  return findById(id);
}

async function remove(id) {
  const task = await findById(id);
  if (!task) return null;
  await pool.query("DELETE FROM calendar_tasks WHERE id = ?", [id]);
  return task;
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM calendar_tasks");
  return rows[0].n;
}

module.exports = { find, findById, create, update, remove, count };
