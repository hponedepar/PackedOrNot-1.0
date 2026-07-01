// Comments data-access layer (MySQL).
const { pool } = require("../config/db");

// All comments, or just those for a given post when postId is provided.
async function find(postId) {
  if (postId === undefined || postId === null || postId === "") {
    const [rows] = await pool.query("SELECT * FROM comments ORDER BY id");
    return rows;
  }
  const [rows] = await pool.query(
    "SELECT * FROM comments WHERE postId = ? ORDER BY id",
    [Number(postId)]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM comments WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO comments (postId, userId, author, authorYear, \`text\`, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.postId, data.userId, data.author, data.authorYear, data.text, data.createdAt]
  );
  return findById(result.insertId);
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM comments");
  return rows[0].n;
}

module.exports = { find, findById, create, count };
