const express = require("express");
const router = express.Router();
const c = require("../controllers/emailOtp.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/send", asyncHandler(c.send));
router.post("/verify", asyncHandler(c.verify));

module.exports = router;
