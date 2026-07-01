const express = require("express");
const router = express.Router();
const c = require("../controllers/comments.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getComments));
router.post("/", asyncHandler(c.createComment));

module.exports = router;
