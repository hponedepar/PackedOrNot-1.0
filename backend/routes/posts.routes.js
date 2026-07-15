const express = require("express");
const router = express.Router();
const c = require("../controllers/posts.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getPosts));
// Must stay above "/:id" — otherwise Express reads "categories" as an id.
router.get("/categories", asyncHandler(c.getCategories)); // Khaing Khant Zaw
router.get("/:id", asyncHandler(c.getPost));
router.post("/", asyncHandler(c.createPost));
router.put("/:id", asyncHandler(c.updatePost));
router.delete("/:id", asyncHandler(c.deletePost));
router.post("/:id/upvote", asyncHandler(c.upvotePost));
router.post("/:id/downvote", asyncHandler(c.downvotePost)); // Andrea Ho

module.exports = router;
