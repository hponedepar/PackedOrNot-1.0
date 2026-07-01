const express = require("express");
const router = express.Router();
const c = require("../controllers/auth.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/register", asyncHandler(c.register));
router.post("/login", asyncHandler(c.login));
router.get("/users", asyncHandler(c.listUsers));

module.exports = router;
