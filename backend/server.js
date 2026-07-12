// NextStep API server (Express).
// Clean, layered structure:
//   routes/        -> define URL endpoints
//   controllers/   -> the logic for each endpoint (async)
//   repositories/  -> data-access layer: SQL queries against MySQL
//   config/db.js   -> the shared MySQL connection pool
//   db/schema.sql  -> table definitions + seed data (run via `npm run db:init`)
//   middleware/    -> shared request logging + async/error handling
//
// Data now lives in a real MySQL database. Connection settings come from
// environment variables (see .env / .env.example).

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { pool } = require("./config/db");
const logger = require("./middleware/logger");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Route modules
const authRoutes = require("./routes/auth.routes");
const postsRoutes = require("./routes/posts.routes");
const commentsRoutes = require("./routes/comments.routes");
const habitsRoutes = require("./routes/habits.routes");
const calendarRoutes = require("./routes/calendar.routes");
const focusRoutes = require("./routes/focus.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const PORT = process.env.PORT || 4000;

// --- Global middleware ---
app.use(cors());            // allow the Next.js frontend (port 3000) to call us
app.use(express.json());    // parse JSON request bodies
app.use(logger);            // log every request to the terminal

// --- Health check (useful for Docker / CI later) ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "nextstep-api" });
});

// --- Feature routes ---
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/focus-sessions", focusRoutes);
app.use("/api/admin", adminRoutes);

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

// Wait for MySQL to accept connections before serving requests. The retry
// loop matters under docker-compose, where the DB may still be starting up.
async function waitForDatabase(retries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("  Connected to MySQL.");
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  Waiting for MySQL... (${attempt}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function start() {
  try {
    await waitForDatabase();
  } catch (err) {
    console.error("  Could not connect to MySQL:", err.message);
    console.error("  Is MySQL running and is backend/.env correct? Did you run `npm run db:init`?");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n  NextStep API running at http://localhost:${PORT}`);
    console.log(`  Health check:            http://localhost:${PORT}/api/health\n`);
  });
}

start();
