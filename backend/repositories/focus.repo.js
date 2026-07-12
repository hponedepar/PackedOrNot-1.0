const { pool } = require("../config/db");

async function find(userId) {
  let rows;

  if (!userId) {
    [rows] = await pool.query(
      "SELECT * FROM focus_sessions ORDER BY date DESC, id DESC"
    );
  } else {
    [rows] = await pool.query(
      "SELECT * FROM focus_sessions WHERE userId = ? ORDER BY date DESC, id DESC",
      [Number(userId)]
    );
  }

  return rows;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO focus_sessions
      (userId, habitId, habitName, minutes, date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.habitId,
      data.habitName,
      data.minutes,
      data.date,
    ]
  );

  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM focus_sessions WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] || null;
}

module.exports = {
  find,
  create,
  findById,
};