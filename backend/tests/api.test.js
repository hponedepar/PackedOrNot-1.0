// Simple API/controller tests using only Node's built-in `assert`.
// No extra test framework is needed, so `npm test` works with just the
// project dependencies. These are wired into GitHub Actions (Phase 2):
// they must PASS before the pipeline builds the Docker image.
//
// The controllers now talk to MySQL, so a seeded database must be running.
//   1) start MySQL
//   2) npm run db:init     (creates tables + seed data)
//   3) npm test
// (The CI workflow does all three automatically.)

const assert = require("assert");
const { pool } = require("../config/db");

// Fake Express res object that records what a controller sends back.
function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

// Collect tests, then run them sequentially (controllers are async now).
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const auth = require("../controllers/auth.controller");
const postsCtrl = require("../controllers/posts.controller");
const habitsCtrl = require("../controllers/habits.controller");
const adminCtrl = require("../controllers/admin.controller");

// --- Auth: login rejects a wrong password ---
test("login fails with wrong password", async () => {
  const res = mockRes();
  await auth.login({ body: { email: "alex@rp.edu.sg", password: "WRONG" } }, res);
  assert.strictEqual(res.statusCode, 401);
});

test("login succeeds with correct password", async () => {
  const res = mockRes();
  await auth.login({ body: { email: "alex@rp.edu.sg", password: "password123" } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token, "expected a token");
});

// --- Posts: cannot create a post with an empty title ---
test("post cannot be created with empty title", async () => {
  const res = mockRes();
  await postsCtrl.createPost({ body: { title: "", content: "hello" } }, res);
  assert.strictEqual(res.statusCode, 400);
});

test("post is created when title and content are given", async () => {
  const res = mockRes();
  await postsCtrl.createPost(
    { body: { title: "Test post", content: "some advice", author: "Tester" } },
    res
  );
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.status, "approved");
});

// --- Habits: a forum suggested action can become a habit ---
test("advice can be turned into a habit (add to tracker)", async () => {
  const res = mockRes();
  await habitsCtrl.createHabit(
    { body: { name: "Build one small project weekly", sourcePostId: 1 } },
    res
  );
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.sourcePostId, 1);
});

// --- Admin: approving a pending post changes its status ---
test("admin can approve a pending post", async () => {
  const res = mockRes();
  await adminCtrl.approvePost({ params: { id: "5" } }, res);
  assert.strictEqual(res.body.status, "approved");
});

async function run() {
  console.log("\nNextStep API tests\n");
  let passed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log("  ✓ " + t.name);
    } catch (err) {
      console.error("  ✗ " + t.name);
      console.error("    " + err.message);
      process.exitCode = 1; // non-zero exit fails the CI build
    }
  }
  console.log(`\n${passed}/${tests.length} test(s) passed.\n`);
  await pool.end(); // close DB connections so the process exits cleanly
}

run();
