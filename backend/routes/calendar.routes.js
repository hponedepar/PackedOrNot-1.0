const express = require("express");
const router = express.Router();
const c = require("../controllers/calendar.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(c.getTasks));
router.post("/", asyncHandler(c.createTask));
router.put("/:id", asyncHandler(c.updateTask));
router.delete("/:id", asyncHandler(c.deleteTask));

module.exports = router;
