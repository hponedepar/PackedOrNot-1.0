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
const commentsCtrl = require("../controllers/comments.controller");
const habitsCtrl = require("../controllers/habits.controller");
const adminCtrl = require("../controllers/admin.controller");
const gamificationCtrl = require("../controllers/gamification.controller");
const gamificationCfg = require("../config/gamification");

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

test("owner can edit their own post", async () => {
  const createRes = mockRes();
  await postsCtrl.createPost(
    { body: { title: "Original title", content: "original content", author: "Tester", userId: 2 } },
    createRes
  );

  const res = mockRes();
  await postsCtrl.updatePost(
    { params: { id: String(createRes.body.id) }, body: { title: "Updated title", content: "updated content", userId: 2 } },
    res
  );

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.title, "Updated title");
  assert.strictEqual(res.body.content, "updated content");
});

test("a user can upvote once and then remove that upvote", async () => {
  const createRes = mockRes();
  await postsCtrl.createPost(
    { body: { title: "Vote toggle", content: "toggle me", author: "Tester", userId: 1 } },
    createRes
  );

  const first = mockRes();
  await postsCtrl.upvotePost({ params: { id: String(createRes.body.id) }, body: { userId: 9 } }, first);
  assert.strictEqual(first.statusCode, 200);
  assert.strictEqual(first.body.upvotes, 1);

  const second = mockRes();
  await postsCtrl.upvotePost({ params: { id: String(createRes.body.id) }, body: { userId: 9 } }, second);
  assert.strictEqual(second.statusCode, 200);
  assert.strictEqual(second.body.upvotes, 0);
});

test("owner can delete their own post", async () => {
  const createRes = mockRes();
  await postsCtrl.createPost(
    { body: { title: "Delete me", content: "temporary", author: "Tester", userId: 2 } },
    createRes
  );

  const res = mockRes();
  await postsCtrl.deletePost({ params: { id: String(createRes.body.id) }, body: { userId: 2 } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.post.id, createRes.body.id);
});

test("non-owner cannot delete someone else's post", async () => {
  const createRes = mockRes();
  await postsCtrl.createPost(
    { body: { title: "Protected post", content: "keep me", author: "Tester", userId: 1 } },
    createRes
  );

  const res = mockRes();
  await postsCtrl.deletePost({ params: { id: String(createRes.body.id) }, body: { userId: 2 } }, res);

  assert.strictEqual(res.statusCode, 403);
});

test("admin can delete any post", async () => {
  const createRes = mockRes();
  await postsCtrl.createPost(
    { body: { title: "Admin delete me", content: "can be removed", author: "Tester", userId: 1 } },
    createRes
  );

  const res = mockRes();
  await postsCtrl.deletePost({ params: { id: String(createRes.body.id) }, body: { userId: 2, role: "admin" } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.post.id, createRes.body.id);
});

test("owner can edit their own comment", async () => {
  const createRes = mockRes();
  await commentsCtrl.createComment(
    { body: { postId: 1, userId: 2, author: "Tester", text: "original comment" } },
    createRes
  );

  const res = mockRes();
  await commentsCtrl.updateComment(
    { params: { id: String(createRes.body.id) }, body: { text: "edited comment", userId: 2 } },
    res
  );

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.text, "edited comment");
});

test("owner can delete their own comment", async () => {
  const createRes = mockRes();
  await commentsCtrl.createComment(
    { body: { postId: 1, userId: 2, author: "Tester", text: "temporary comment" } },
    createRes
  );

  const res = mockRes();
  await commentsCtrl.deleteComment({ params: { id: String(createRes.body.id) }, body: { userId: 2 } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.comment.id, createRes.body.id);
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

// --- Admin: approving a post sets its status to "approved" ---
// Create a fresh post first so this doesn't depend on a specific seed id.
test("admin can approve a post", async () => {
  const created = mockRes();
  await postsCtrl.createPost({ body: { title: "Approve me", content: "please", author: "Tester" } }, created);
  const res = mockRes();
  await adminCtrl.approvePost({ params: { id: String(created.body.id) } }, res);
  assert.strictEqual(res.body.status, "approved");
});

// --- Gamification: level curve maps total XP to the right level (pure) ---
test("level curve maps XP to the expected level", () => {
  assert.strictEqual(gamificationCfg.resolveLevel(0).level, 1);
  assert.strictEqual(gamificationCfg.resolveLevel(250).level, 2);
  const lv = gamificationCfg.resolveLevel(1293);
  assert.strictEqual(lv.level, 4);
  assert.strictEqual(lv.title, "Consistent Learner");
});

// --- Gamification: the summary endpoint needs a userId ---
test("gamification summary requires a userId", async () => {
  const res = mockRes();
  await gamificationCtrl.getSummary({ query: {} }, res);
  assert.strictEqual(res.statusCode, 400);
});

// --- Gamification: a student's summary is derived from real seed data ---
test("gamification summary is derived from the student's activity", async () => {
  const res = mockRes();
  await gamificationCtrl.getSummary({ query: { userId: "1" } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.xp.total > 0, "expected some XP");
  assert.strictEqual(typeof res.body.level.level, "number");
  assert.strictEqual(res.body.badges.length, gamificationCfg.BADGES.length);
  assert.ok(res.body.badges.find((b) => b.id === "first-step").earned, "First Step should be earned");
  // `best` (longest run ever) is independent of today's date, so this stays
  // green in CI regardless of when it runs; the 18-day seed run gives >= 7.
  assert.ok(res.body.streak.best >= 7, "seed data gives a multi-day streak");
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
