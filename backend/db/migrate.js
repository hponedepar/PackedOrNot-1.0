// Applies migrations.sql to Supabase. Done by Khaing Khant Zaw.
//
// Usage:  npm run db:migrate   (from the repo root or the backend folder)
//
// Unlike db:init this NEVER drops a table or deletes seed data, so it is safe
// to run against the database the whole team shares. Every statement in
// migrations.sql is idempotent, so running this twice changes nothing.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. Copy it from the Supabase dashboard " +
      "(Project Settings → Database → Connection string) into backend/.env"
    );
  }

  const sql = fs.readFileSync(path.join(__dirname, "migrations.sql"), "utf8");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  });

  console.log("Connecting to Supabase ...");
  await client.connect();
  console.log("Applying migrations.sql (additive — no data is dropped) ...");
  await client.query(sql);

  // Show what the database looks like afterwards, so the run is verifiable.
  const { rows: posts } = await client.query(
    'SELECT "forumType", COUNT(*)::int AS n FROM posts GROUP BY "forumType" ORDER BY 1'
  );
  const { rows: courses } = await client.query("SELECT COUNT(*)::int AS n FROM netacad_courses");
  await client.end();

  console.log("Done.");
  console.log("  posts by forum:", posts.map((r) => `${r.forumType}=${r.n}`).join(", ") || "(none)");
  console.log("  netacad_courses:", courses[0].n);
}

main().catch((err) => {
  console.error("db:migrate failed:", err.message);
  process.exit(1);
});
