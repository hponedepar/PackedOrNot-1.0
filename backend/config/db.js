// MySQL connection pool (mysql2, promise API).
// Every repository imports { pool } from here and runs parameterised queries.
//
// Connection settings come from environment variables (see .env / .env.example)
// so the same code runs locally, in Docker, and in CI without edits.
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nextstep",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DATE columns as "YYYY-MM-DD" strings instead of JS Date objects,
  // so the JSON the API sends stays identical to the old in-memory data.
  dateStrings: true,
});

module.exports = { pool };
