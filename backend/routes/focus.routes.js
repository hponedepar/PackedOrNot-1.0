const express = require("express");
const router = express.Router();

const controller = require("../controllers/focus.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", asyncHandler(controller.getSessions));
router.post("/", asyncHandler(controller.createSession));

module.exports = router;