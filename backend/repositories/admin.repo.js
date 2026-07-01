// Admin-access requests + reported-content data-access layer (MySQL).
const { pool } = require("../config/db");

// ---- Admin access requests ----
async function findRequests() {
  const [rows] = await pool.query("SELECT * FROM admin_requests ORDER BY id");
  return rows;
}

async function findRequestById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM admin_requests WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function updateRequest(id, { status, reviewedBy, reviewedAt }) {
  await pool.query(
    "UPDATE admin_requests SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ?",
    [status, reviewedBy, reviewedAt, id]
  );
  return findRequestById(id);
}

async function countPendingRequests() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM admin_requests WHERE status = 'pending'"
  );
  return rows[0].n;
}

// ---- Reports ----
// LEFT JOIN so a report for a deleted post still comes back (postTitle NULL).
async function findReportsWithPostTitle() {
  const [rows] = await pool.query(
    `SELECT r.*, p.title AS postTitle
       FROM reports r
       LEFT JOIN posts p ON p.id = r.postId
      ORDER BY r.id`
  );
  return rows;
}

async function findReportById(id) {
  const [rows] = await pool.query("SELECT * FROM reports WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function updateReport(id, { status }) {
  await pool.query("UPDATE reports SET status = ? WHERE id = ?", [status, id]);
  return findReportById(id);
}

async function countOpenReports() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"
  );
  return rows[0].n;
}

module.exports = {
  findRequests,
  findRequestById,
  updateRequest,
  countPendingRequests,
  findReportsWithPostTitle,
  findReportById,
  updateReport,
  countOpenReports,
};
