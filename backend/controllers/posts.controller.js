// Forum posts CRUD + upvote. Backed by the MySQL posts table.
const postsRepo = require("../repositories/posts.repo");

// GET /api/posts?category=&search=
// Returns approved posts, with optional category + search filtering.
async function getPosts(req, res) {
  const { category, search } = req.query;
  const result = await postsRepo.findApproved({ category, search });
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
  const { title, category, content, suggestedAction, author, authorYear, userId } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  const newPost = await postsRepo.create({
    userId: userId || null,
    author: author || "Anonymous",
    authorYear: authorYear || "Year 1",
    title,
    category: category || "Study habits",
    content,
    suggestedAction: suggestedAction || "",
    status: "approved",
    createdAt: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(newPost);
}

// PUT /api/posts/:id
async function updatePost(req, res) {
  const id = Number(req.params.id);
  const existing = await postsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Post not found." });

  const { title, category, content, suggestedAction } = req.body;
  const updated = await postsRepo.update(id, { title, category, content, suggestedAction });
  res.json(updated);
}

// DELETE /api/posts/:id
async function deletePost(req, res) {
  const removed = await postsRepo.remove(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: "Post not found." });
  res.json({ message: "Post deleted.", post: removed });
}

// POST /api/posts/:id/upvote
async function upvotePost(req, res) {
  const id = Number(req.params.id);
  const existing = await postsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Post not found." });
  const updated = await postsRepo.incrementUpvotes(id);
  res.json(updated);
}

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  upvotePost,
};
