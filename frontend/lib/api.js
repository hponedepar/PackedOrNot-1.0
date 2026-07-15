// Tiny fetch wrapper used by every page to talk to the Express backend.
// Base URL comes from an env var so it is easy to change for deployment.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // Try to read JSON either way so we can surface backend error messages.
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body is fine */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status; // so callers can special-case e.g. 503 (not configured)
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body || {}) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body || {}) }),
  del: (path, body) => request(path, { method: "DELETE", body: JSON.stringify(body || {}) }),
  baseUrl: API_URL,
};

// ---- Feature helpers (keep pages clean & readable) ----
export const AuthAPI = {
  login: (email, password) => api.post("/api/auth/login", { email, password }),
  register: (payload) => api.post("/api/auth/register", payload),
};

// Sign-up email verification (OTP). send() returns a signed token; verify()
// checks the code against it. A 503 means email isn't configured -> the
// sign-up page falls back to an on-screen demo code.
export const EmailOtpAPI = {
  send: (email) => api.post("/api/email-otp/send", { email }),
  verify: (email, code, token) => api.post("/api/email-otp/verify", { email, code, token }),
};

export const PostsAPI = {
  list: (category, search, userId) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (search) params.set("search", search);
    if (userId) params.set("userId", String(userId));
    const q = params.toString();
    return api.get(`/api/posts${q ? "?" + q : ""}`);
  },
  create: (payload) => api.post("/api/posts", payload),
  update: (id, payload) => api.put(`/api/posts/${id}`, payload),
  remove: (id, userId, role) => api.del(`/api/posts/${id}`, { userId, role }),
  upvote: (id, userId) => api.post(`/api/posts/${id}/upvote`, { userId }),
  downvote: (id, userId) => api.post(`/api/posts/${id}/downvote`, { userId }), // 👎 the question — Andrea Ho
};

export const CommentsAPI = {
  list: (postId) => api.get(`/api/comments?postId=${postId}`),
  all: () => api.get("/api/comments"),          // every comment (grouped by post on the forum) — Andrea Ho
  create: (payload) => api.post("/api/comments", payload),
  update: (id, payload) => api.put(`/api/comments/${id}`, payload),
  remove: (id, userId) => api.del(`/api/comments/${id}`, { userId }),
  like: (id) => api.post(`/api/comments/${id}/like`, {}),       // 👍 advice — Done by Andrea Ho
  dislike: (id) => api.post(`/api/comments/${id}/dislike`, {}), // 👎 advice — Done by Andrea Ho
};

export const HabitsAPI = {
  list: (userId) => api.get(`/api/habits?userId=${userId}`),
  create: (payload) => api.post("/api/habits", payload),
  update: (id, payload) => api.put(`/api/habits/${id}`, payload),
  remove: (id) => api.del(`/api/habits/${id}`),
};

export const CalendarAPI = {
  list: (userId) => api.get(`/api/calendar?userId=${userId}`),
  create: (payload) => api.post("/api/calendar", payload),
  update: (id, payload) => api.put(`/api/calendar/${id}`, payload),
  remove: (id) => api.del(`/api/calendar/${id}`),
};

// ---- New features (UI is built — backend endpoints to be implemented) ----
// These define the API contract each backend owner implements.
// See TEAM_HANDOFF.md at the repo root for expected behaviour + schema.

// Study Plans: a plan (module) contains lessons; progress = completed/total.
export const PlansAPI = {
  list: (userId) => api.get(`/api/plans?userId=${userId}`),
  create: (payload) => api.post("/api/plans", payload),            // { userId, name, module }
  remove: (id) => api.del(`/api/plans/${id}`),
  addLesson: (planId, payload) => api.post(`/api/plans/${planId}/lessons`, payload), // { title }
  toggleLesson: (planId, lessonId, completed) =>
    api.put(`/api/plans/${planId}/lessons/${lessonId}`, { completed }),
};

// Focus sessions: the timer logs every finished session.
export const FocusAPI = {
  list: (userId) => api.get(`/api/focus-sessions?userId=${userId}`),
  create: (payload) => api.post("/api/focus-sessions", payload),   // { userId, habitId, habitName, minutes, date }
};

// AI study help: backend proxies the n8n webhook (Cisco NetAcad lookup) and caches results.
export const HelpAPI = {
  recommend: (query) => api.post("/api/help/recommend", { query }),
};

// Gamification: level, XP, streak, badges, growth journey + AI motivation.
// Everything is derived server-side from the student's real activity
// (completed tasks/habits, posts, upvotes) — see backend/config/gamification.js.
export const GamificationAPI = {
  summary: (userId) => api.get(`/api/gamification?userId=${userId}`),
};

// Flash Quiz: topics + questions derived from the student's study plans.
// Returns { fromPlans, topics: [{ id, name, emoji, questions:[{q,options,answer}] }] }.
export const QuizAPI = {
  topics: (userId) => api.get(`/api/quiz?userId=${userId}`),
};

// Speed Sorting Challenge: sets of terms to sort into category bins. Built-in
// sets match the student's study plans; uploaded sets are parsed from a revision
// file. Returns { fromPlans, sets: [{ id, title, emoji, source, categories, items }] }.
export const SortingAPI = {
  list: (userId) => api.get(`/api/sorting?userId=${userId}`),
  upload: (payload) => api.post("/api/sorting/upload", payload), // { userId, filename, content }
  remove: (id, userId) => api.del(`/api/sorting/${id}`, { userId }),
};

export const AdminAPI = {
  // `me` is the logged-in admin's id, so the API can flag their own row (isSelf)
  // and refuse self-ban / self-delete / self-demote on the server.
  users: (me) => api.get(`/api/admin/users${me ? `?me=${me}` : ""}`),
  setRole: (id, role, me) => api.patch(`/api/admin/users/${id}/role`, { role, me }),
  toggleBan: (id, me) => api.post(`/api/admin/users/${id}/ban`, { me }),
  deleteUser: (id, me) => api.del(`/api/admin/users/${id}`, { me }),
  pendingPosts: () => api.get("/api/admin/pending-posts"),
  approvePost: (id) => api.put(`/api/admin/posts/${id}/approve`),
  rejectPost: (id) => api.put(`/api/admin/posts/${id}/reject`),
  reports: () => api.get("/api/admin/reports"),
  resolveReport: (id) => api.put(`/api/admin/reports/${id}/resolve`),
  requests: () => api.get("/api/admin/requests"),
  approveRequest: (id) => api.put(`/api/admin/requests/${id}/approve`),
  rejectRequest: (id) => api.put(`/api/admin/requests/${id}/reject`),
  stats: () => api.get("/api/admin/stats"),
};
