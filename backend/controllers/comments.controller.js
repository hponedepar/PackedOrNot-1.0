// Comments under forum posts. Backed by the MySQL comments table.
const commentsRepo = require("../repositories/comments.repo");

// GET /api/comments?postId=
async function getComments(req, res) {
  const { postId } = req.query;
  const result = await commentsRepo.find(postId);
  res.json(result);
}

// POST /api/comments
async function createComment(req, res) {
  const { postId, userId, author, authorYear, text } = req.body;
  if (!postId || !text) {
    return res.status(400).json({ error: "postId and text are required." });
  }

  const newComment = await commentsRepo.create({
    postId: Number(postId),
    userId: userId || null,
    author: author || "Anonymous",
    authorYear: authorYear || "Year 1",
    text,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(newComment);
}

module.exports = { getComments, createComment };
