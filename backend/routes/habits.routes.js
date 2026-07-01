const express = require("express");
const router = express.Router();
const c = require("../controllers/habits.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getHabits));
router.post("/", asyncHandler(c.createHabit));
router.put("/:id", asyncHandler(c.updateHabit));
router.delete("/:id", asyncHandler(c.deleteHabit));

module.exports = router;
