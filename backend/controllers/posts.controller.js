// Forum posts CRUD + upvote. Backed by the posts table (Supabase Postgres).
const postsRepo = require("../repositories/posts.repo");

// The Study and Habit forums are separate. Anything that isn't one of these
// two is not a forum we have. (Khaing Khant Zaw)
const FORUM_TYPES = ["study", "habit"];

// Categories each forum is allowed to use. Keeping this on the server means a
// habit category can't be attached to a study question by editing the request.
const CATEGORIES = {
  study: ["Study habits", "Exam preparation", "Programming practice", "Revision techniques", "Note-taking", "Module help"],
  habit: ["Exercise", "Sleep", "Productivity", "Mental wellness", "Healthy eating", "Personal routines"],
};

// GET /api/posts?forumType=&category=&search=
// Returns approved posts for ONE forum, with optional category + search.
async function getPosts(req, res) {
  const { category, search, userId, forumType } = req.query;
  if (forumType && !FORUM_TYPES.includes(forumType)) {
    return res.status(400).json({ error: "forumType must be 'study' or 'habit'." });
  }
  const result = await postsRepo.findApproved({ category, search, userId, forumType });
  res.json(result);
}

// GET /api/posts/:id
async function getPost(req, res) {
  const post = await postsRepo.findById(Number(req.params.id));
  if (!post) return res.status(404).json({ error: "Post not found." });
  res.json(post);
}

// POST /api/posts
// New posts are auto-approved so they appear in the forum right away for
// the demo. In a real system these would start as "pending".
async function createPost(req, res) {
  const { title, category, content, suggestedAction, author, authorYear, userId, forumType } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  // Which forum this question belongs to is saved with the post, so the split
  // survives a page refresh and applies to every future query.
  const forum = FORUM_TYPES.includes(forumType) ? forumType : "study";

  // Reject a category that doesn't belong to the chosen forum, rather than
  // silently storing a study category on a habit post.
  const allowed = CATEGORIES[forum];
  const chosen = category || allowed[0];
  if (!allowed.includes(chosen)) {
    return res.status(400).json({ error: `"${chosen}" is not a category in the ${forum} forum.` });
  }

  const newPost = await postsRepo.create({
    userId: userId || null,
    author: author || "Anonymous",
    authorYear: authorYear || "Year 1",
    title,
    category: chosen,
    content,
    suggestedAction: suggestedAction || "",
    status: "approved",
    forumType: forum,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(newPost);
}

// PUT /api/posts/:id
async function updatePost(req, res) {
  const id = Number(req.params.id);
  const existing = await postsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Post not found." });

  const requesterId = req.body?.userId ?? req.query?.userId;
  const requesterRole = req.body?.role ?? req.query?.role;
  if (requesterRole !== "admin" && existing.userId && requesterId !== undefined && Number(requesterId) !== Number(existing.userId)) {
    return res.status(403).json({ error: "You can only edit your own posts." });
  }

  // A post never changes forum on edit, so validate the category against the
  // forum it already belongs to.
  const { title, category, content, suggestedAction } = req.body;
  const forum = FORUM_TYPES.includes(existing.forumType) ? existing.forumType : "study";
  if (category && !CATEGORIES[forum].includes(category)) {
    return res.status(400).json({ error: `"${category}" is not a category in the ${forum} forum.` });
  }

  const updated = await postsRepo.update(id, { title, category, content, suggestedAction });
  res.json(updated);
}

// DELETE /api/posts/:id
async function deletePost(req, res) {
  const id = Number(req.params.id);
  const existing = await postsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Post not found." });

  const requesterId = req.body?.userId ?? req.query?.userId;
  const requesterRole = req.body?.role ?? req.query?.role;
  if (requesterRole === "admin") {
    const removed = await postsRepo.remove(id);
    return res.json({ message: "Post deleted.", post: removed });
  }

  if (existing.userId && requesterId !== undefined && Number(requesterId) !== Number(existing.userId)) {
    return res.status(403).json({ error: "You can only delete your own posts." });
  }

  const removed = await postsRepo.remove(id);
  res.json({ message: "Post deleted.", post: removed });
}

// POST /api/posts/:id/upvote
async function upvotePost(req, res) {
  const id = Number(req.params.id);
  const existing = await postsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Post not found." });

  const userId = req.body?.userId ?? req.query?.userId;
  if (userId === undefined || userId === null || userId === "") {
    return res.status(400).json({ error: "userId is required." });
  }

  const updated = await postsRepo.toggleUpvote(id, Number(userId));
  if (!updated) return res.status(404).json({ error: "Post not found." });
  res.json(updated);
}

// POST /api/posts/:id/downvote  — 👎 the question (Andrea Ho)
async function downvotePost(req, res) {
  const id = Number(req.params.id);
  const existing = await postsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Post not found." });
  const userId = req.body?.userId ?? req.query?.userId;
  const updated = await postsRepo.incrementDownvote(id, userId ? Number(userId) : undefined);
  res.json(updated);
}

// GET /api/posts/categories  -> { study: [...], habit: [...] }
// The forum page reads its chips from here, so the two lists can never drift
// apart from the ones the server enforces. (Khaing Khant Zaw)
async function getCategories(req, res) {
  res.json(CATEGORIES);
}

module.exports = {
  getPosts,
  getPost,
  getCategories,
  createPost,
  updatePost,
  deletePost,
  upvotePost,
  downvotePost,
};
