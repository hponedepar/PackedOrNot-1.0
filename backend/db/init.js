// One-off setup script: creates the database, tables, and seed data by
// running schema.sql. Safe to re-run (it recreates the tables each time).
//
// Usage:  npm run db:init   (from the backend folder)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  // Connect WITHOUT selecting a database — schema.sql creates it itself.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true, // schema.sql contains many statements
  });

  console.log("Running schema.sql ...");
  await conn.query(sql);
  await conn.end();
  console.log("Database ready: tables created and seed data inserted.");
}

main().catch((err) => {
  console.error("db:init failed:", err.message);
  process.exit(1);
});
