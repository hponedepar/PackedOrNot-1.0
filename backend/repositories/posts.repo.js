// Forum posts data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

const inMemoryVotes = new Map();

function getVoteSet(postId) {
  if (!inMemoryVotes.has(postId)) inMemoryVotes.set(postId, new Set());
  return inMemoryVotes.get(postId);
}

function isPostUpvotedByUser(postId, userId) {
  return Boolean(userId && getVoteSet(postId).has(Number(userId)));
}

// Approved posts with optional forum / category / search filtering, newest first.
//
// `forumType` keeps the Study and Habit forums completely separate: the split
// happens here in SQL, so a habit question can never reach the Study tab even
// if the frontend asked for it. (Khaing Khant Zaw)
async function findApproved({ category, search, userId, forumType }) {
  let sql = "SELECT p.*, 0 AS upvotedByUser FROM posts p WHERE p.status = 'approved'";
  const params = [];

  if (forumType === "study" || forumType === "habit") {
    sql += ' AND p."forumType" = ?';
    params.push(forumType);
  }
  if (category && category !== "All") {
    sql += " AND p.category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND (LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?)";
    const q = `%${search.toLowerCase()}%`;
    params.push(q, q);
  }
  sql += " ORDER BY p.id DESC";

  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({
    ...row,
    upvotedByUser: isPostUpvotedByUser(row.id, userId),
  }));
}

async function findById(id, userId) {
  const [rows] = await pool.query(
    "SELECT p.*, 0 AS upvotedByUser FROM posts p WHERE p.id = ? LIMIT 1",
    [id]
  );
  const row = rows[0] || null;
  if (!row) return null;
  return { ...row, upvotedByUser: isPostUpvotedByUser(row.id, userId) };
}

async function findByStatus(status) {
  const [rows] = await pool.query(
    "SELECT * FROM posts WHERE status = ? ORDER BY id DESC",
    [status]
  );
  return rows;
}

async function create(data) {
  const [rows] = await pool.query(
    `INSERT INTO posts ("userId", author, "authorYear", title, category, content, "suggestedAction", status, "forumType", upvotes, "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?) RETURNING id`,
    [
      data.userId,
      data.author,
      data.authorYear,
      data.title,
      data.category,
      data.content,
      data.suggestedAction,
      data.status,
      data.forumType,
      data.createdAt,
    ]
  );
  return findById(rows[0].id);
}

// Update only the fields provided (undefined fields are ignored).
async function update(id, fields) {
  const allowed = ["title", "category", "content", "suggestedAction", "status", "forumType", "upvotes"];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`"${key}" = ?`);
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

async function toggleUpvote(id, userId) {
  const post = await findById(id, userId);
  if (!post) return null;

  try {
    const [existing] = await pool.query(
      "SELECT * FROM post_upvotes WHERE postId = ? AND userId = ? LIMIT 1",
      [id, userId]
    );

    if (existing.length) {
      await pool.query("DELETE FROM post_upvotes WHERE postId = ? AND userId = ?", [id, userId]);
      await pool.query("UPDATE posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = ?", [id]);
      getVoteSet(id).delete(Number(userId));
    } else {
      await pool.query("INSERT INTO post_upvotes (postId, userId) VALUES (?, ?)", [id, userId]);
      await pool.query("UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?", [id]);
      getVoteSet(id).add(Number(userId));
    }
  } catch (err) {
    const currentVotes = Number(post.upvotes || 0);
    const hasVote = isPostUpvotedByUser(id, userId);
    const nextVotes = hasVote ? Math.max(currentVotes - 1, 0) : currentVotes + 1;
    const voteSet = getVoteSet(id);
    if (hasVote) voteSet.delete(Number(userId));
    else voteSet.add(Number(userId));
    await pool.query("UPDATE posts SET upvotes = ? WHERE id = ?", [nextVotes, id]);
  }

  return findById(id, userId);
}

// A simple downvote counter for the post (mirrors the reply dislike). — Andrea Ho
async function incrementDownvote(id, userId) {
  await pool.query("UPDATE posts SET downvotes = downvotes + 1 WHERE id = ?", [id]);
  return findById(id, userId);
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*)::int AS n FROM posts");
  return rows[0].n;
}

async function countByStatus(status) {
  const [rows] = await pool.query(
    "SELECT COUNT(*)::int AS n FROM posts WHERE status = ?",
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
  toggleUpvote,
  incrementDownvote,
  count,
  countByStatus,
};
