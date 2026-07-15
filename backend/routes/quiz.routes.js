const express = require("express");
const router = express.Router();
const c = require("../controllers/quiz.controller");
const asyncHandler = require("../middleware/asyncHandler");

// GET /api/quiz?userId=1  → Flash Quiz topics derived from the student's plans.
router.get("/", asyncHandler(c.getQuiz));

module.exports = router;
