const express = require("express");
const router = express.Router();
const c = require("../controllers/gamification.controller");
const asyncHandler = require("../middleware/asyncHandler");

// GET /api/gamification?userId=1  → level, XP, streak, badges, journey, motivation.
router.get("/", asyncHandler(c.getSummary));

module.exports = router;
