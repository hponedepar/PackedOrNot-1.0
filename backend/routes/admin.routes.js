const express = require("express");
const router = express.Router();
const c = require("../controllers/admin.controller");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/pending-posts", asyncHandler(c.getPendingPosts));
router.put("/posts/:id/approve", asyncHandler(c.approvePost));
router.put("/posts/:id/reject", asyncHandler(c.rejectPost));

router.get("/reports", asyncHandler(c.getReports));
router.put("/reports/:id/resolve", asyncHandler(c.resolveReport));

router.get("/requests", asyncHandler(c.getRequests));
router.put("/requests/:id/approve", asyncHandler(c.approveRequest));
router.put("/requests/:id/reject", asyncHandler(c.rejectRequest));

router.get("/stats", asyncHandler(c.getStats));

router.get("/users", asyncHandler(c.getUsers));
router.patch("/users/:id/role", asyncHandler(c.setUserRole));
router.post("/users/:id/ban", asyncHandler(c.banUser));
router.delete("/users/:id", asyncHandler(c.deleteUser));

module.exports = router;
