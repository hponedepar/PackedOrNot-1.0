// Admin moderation + dashboard statistics. Backed by MySQL.
const postsRepo = require("../repositories/posts.repo");
const habitsRepo = require("../repositories/habits.repo");
const calendarRepo = require("../repositories/calendar.repo");
const commentsRepo = require("../repositories/comments.repo");
const usersRepo = require("../repositories/users.repo");
const adminRepo = require("../repositories/admin.repo");

// GET /api/admin/users?me=<callerId>
// Returns every user (without password) plus the fields the admin page reads:
//   joinedAt (from createdAt), isBanned, and isSelf (the caller's own row).
async function getUsers(req, res) {
  const me = Number(req.query.me);
  const users = await usersRepo.listAll();
  res.json(
    users.map(({ password, createdAt, ...u }) => ({
      ...u,
      joinedAt: createdAt,
      isBanned: Boolean(u.isBanned),
      isSelf: u.id === me,
    }))
  );
}

// PATCH /api/admin/users/:id/role   body { role }
async function setUserRole(req, res) {
  const id = Number(req.params.id);
  const { role, me } = req.body;
  if (role !== "user" && role !== "admin") {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
  }
  // Never let an admin change their own role (would risk locking everyone out).
  if (Number(me) === id) {
    return res.status(403).json({ error: "You cannot change your own role." });
  }
  const user = await usersRepo.findById(id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const { password, ...updated } = await usersRepo.updateRole(id, role);
  res.json(updated);
}

// POST /api/admin/users/:id/ban   body { me }  — toggles the ban flag.
async function banUser(req, res) {
  const id = Number(req.params.id);
  const { me } = req.body;
  if (Number(me) === id) {
    return res.status(403).json({ error: "You cannot ban yourself." });
  }
  const user = await usersRepo.findById(id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const { password, ...updated } = await usersRepo.setBanned(id, !user.isBanned);
  res.json(updated);
}

// DELETE /api/admin/users/:id   body { me }
async function deleteUser(req, res) {
  const id = Number(req.params.id);
  const { me } = req.body;
  if (Number(me) === id) {
    return res.status(403).json({ error: "You cannot delete your own account." });
  }
  const removed = await usersRepo.remove(id);
  if (!removed) return res.status(404).json({ error: "User not found." });
  res.json({ message: "User deleted.", id });
}

// GET /api/admin/pending-posts
async function getPendingPosts(req, res) {
  const pending = await postsRepo.findByStatus("pending");
  res.json(pending);
}

// PUT /api/admin/posts/:id/approve
async function approvePost(req, res) {
  const id = Number(req.params.id);
  const post = await postsRepo.findById(id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  const updated = await postsRepo.update(id, { status: "approved" });
  res.json(updated);
}

// PUT /api/admin/posts/:id/reject
async function rejectPost(req, res) {
  const id = Number(req.params.id);
  const post = await postsRepo.findById(id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  const updated = await postsRepo.update(id, { status: "rejected" });
  res.json(updated);
}

// GET /api/admin/reports
async function getReports(req, res) {
  // Attach a little post context for each report (JOIN handles this).
  const rows = await adminRepo.findReportsWithPostTitle();
  const enriched = rows.map((r) => ({
    ...r,
    postTitle: r.postTitle || "(deleted post)",
  }));
  res.json(enriched);
}

// PUT /api/admin/reports/:id/resolve
async function resolveReport(req, res) {
  const id = Number(req.params.id);
  const report = await adminRepo.findReportById(id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  const updated = await adminRepo.updateReport(id, { status: "resolved" });
  res.json(updated);
}

// GET /api/admin/requests
async function getRequests(req, res) {
  const requests = await adminRepo.findRequests();
  res.json(requests);
}

// PUT /api/admin/requests/:id/approve
async function approveRequest(req, res) {
  const id = Number(req.params.id);
  const request = await adminRepo.findRequestById(id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  const updated = await adminRepo.updateRequest(id, {
    status: "approved",
    reviewedBy: "Admin Officer",
    reviewedAt: new Date().toISOString().slice(0, 10),
  });

  // Promote the user to admin as well.
  if (request.userId) await usersRepo.updateRole(request.userId, "admin");

  res.json(updated);
}

// PUT /api/admin/requests/:id/reject
async function rejectRequest(req, res) {
  const id = Number(req.params.id);
  const request = await adminRepo.findRequestById(id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  const updated = await adminRepo.updateRequest(id, {
    status: "rejected",
    reviewedBy: "Admin Officer",
    reviewedAt: new Date().toISOString().slice(0, 10),
  });
  res.json(updated);
}

// GET /api/admin/stats  — numbers for the admin dashboard widgets.
async function getStats(req, res) {
  const [
    totalUsers,
    totalPosts,
    approvedPosts,
    pendingPosts,
    totalComments,
    totalHabits,
    activeHabits,
    totalCalendarTasks,
    openReports,
    pendingRequests,
  ] = await Promise.all([
    usersRepo.count(),
    postsRepo.count(),
    postsRepo.countByStatus("approved"),
    postsRepo.countByStatus("pending"),
    commentsRepo.count(),
    habitsRepo.count(),
    habitsRepo.countByStatus("active"),
    calendarRepo.count(),
    adminRepo.countOpenReports(),
    adminRepo.countPendingRequests(),
  ]);

  res.json({
    totalUsers,
    totalPosts,
    approvedPosts,
    pendingPosts,
    totalComments,
    totalHabits,
    activeHabits,
    totalCalendarTasks,
    openReports,
    pendingRequests,
  });
}

module.exports = {
  getPendingPosts,
  approvePost,
  rejectPost,
  getReports,
  resolveReport,
  getRequests,
  approveRequest,
  rejectRequest,
  getStats,
  getUsers,
  setUserRole,
  banUser,
  deleteUser,
};
