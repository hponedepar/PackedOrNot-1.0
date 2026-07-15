const express = require("express");
const router = express.Router();
const c = require("../controllers/sorting.controller");
const asyncHandler = require("../middleware/asyncHandler");

// Speed Sorting Challenge sets (built-in + the student's uploads).
router.get("/", asyncHandler(c.getSorting));
router.post("/upload", asyncHandler(c.uploadSet));
router.delete("/:id", asyncHandler(c.deleteSet));

module.exports = router;
