// PostgreSQL connection pool (pg) — the database lives on Supabase.
// Every repository imports { pool } from here and runs parameterised queries.
//
// The connection string comes from DATABASE_URL in backend/.env
// (Supabase dashboard → Project Settings → Database → Connection string).
require("dotenv").config();
const { Pool, types } = require("pg");

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Date
// objects, so the JSON the API sends stays simple (1082 = the DATE type).
types.setTypeParser(1082, (value) => value);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires SSL; this keeps it simple for the prototype.
  ssl: { rejectUnauthorized: false },
  // Supabase's pooler hangs up on connections that sit unused. Recycle ours
  // first so we hand back a live connection instead of a dead one.
  idleTimeoutMillis: 10000,
  keepAlive: true,
});

// Supabase drops idle connections, and pg reports that by emitting "error" on
// the pool. With no listener, Node treats it as an unhandled 'error' event and
// kills the whole server — which is exactly what used to happen after the app
// sat idle for a few minutes. Logging it lets pg discard the dead client and
// open a fresh one on the next query. (Khaing Khant Zaw)
pgPool.on("error", (err) => {
  console.warn("  Postgres idle connection dropped (" + err.message + ") — pool will reconnect.");
});

// Small helper so the repositories can keep the same style they used before:
//   const [rows] = await pool.query("SELECT ... WHERE id = ?", [id])
// It converts each "?" into Postgres-style $1, $2, ... automatically.
async function query(sql, params = []) {
  let n = 0;
  const converted = sql.replace(/\?/g, () => "$" + ++n);
  const result = await pgPool.query(converted, params);
  return [result.rows, result];
}

const pool = { query, end: () => pgPool.end() };

module.exports = { pool };
