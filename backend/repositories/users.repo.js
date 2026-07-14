// Users data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function listAll() {
  const [rows] = await pool.query("SELECT * FROM users ORDER BY id");
  return rows;
}

async function create({ name, email, password, yearLevel, diploma, role, createdAt }) {
  const [rows] = await pool.query(
    `INSERT INTO users (name, email, password, "yearLevel", diploma, role, "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [name, email, password, yearLevel, diploma, role, createdAt]
  );
  return findById(rows[0].id);
}

async function updateRole(id, role) {
  await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  return findById(id);
}

// Ban / unban a user (isBanned column added by schema.sql).
async function setBanned(id, isBanned) {
  await pool.query('UPDATE users SET "isBanned" = ? WHERE id = ?', [isBanned, id]);
  return findById(id);
}

async function remove(id) {
  const user = await findById(id);
  if (!user) return null;
  await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return user;
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  return rows[0].n;
}

module.exports = { findByEmail, findById, listAll, create, updateRole, setBanned, remove, count };
