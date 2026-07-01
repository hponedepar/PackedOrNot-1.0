// Forum posts data-access layer (MySQL).
const { pool } = require("../config/db");

// Approved posts with optional category + search filtering, newest first.
async function findApproved({ category, search }) {
  let sql = "SELECT * FROM posts WHERE status = 'approved'";
  const params = [];

  if (category && category !== "All") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)";
    const q = `%${search.toLowerCase()}%`;
    params.push(q, q);
  }
  sql += " ORDER BY id DESC";

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM posts WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function findByStatus(status) {
  const [rows] = await pool.query(
    "SELECT * FROM posts WHERE status = ? ORDER BY id DESC",
    [status]
  );
  return rows;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO posts (userId, author, authorYear, title, category, content, suggestedAction, status, upvotes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      data.userId,
      data.author,
      data.authorYear,
      data.title,
      data.category,
      data.content,
      data.suggestedAction,
      data.status,
      data.createdAt,
    ]
  );
  return findById(result.insertId);
}

// Update only the fields provided (undefined fields are ignored).
async function update(id, fields) {
  const allowed = ["title", "category", "content", "suggestedAction", "status", "upvotes"];
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
    await pool.query(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`, params);
  }
  return findById(id);
}

async function remove(id) {
  const post = await findById(id);
  if (!post) return null;
  await pool.query("DELETE FROM posts WHERE id = ?", [id]);
  return post;
}

async function incrementUpvotes(id) {
  await pool.query("UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?", [id]);
  return findById(id);
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM posts");
  return rows[0].n;
}

async function countByStatus(status) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM posts WHERE status = ?",
    [status]
  );
  return rows[0].n;
}

module.exports = {
  findApproved,
  findById,
  findByStatus,
  create,
  update,
  remove,
  incrementUpvotes,
  count,
  countByStatus,
};
