const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getSubstitutions,
  getFreeTeachersForSubstitution,
  assignSubstituteTeacher,
} = require("../controllers/leaveController");

// Teacher
router.post("/", authMiddleware, requireRole("teacher"), applyLeave);
router.get("/my", authMiddleware, requireRole("teacher"), getMyLeaves);

// Admin
router.get(
  "/pending",
  authMiddleware,
  requireRole("admin"),
  getPendingLeaves
);
router.patch(
  "/:id/approve",
  authMiddleware,
  requireRole("admin"),
  approveLeave
);
router.patch(
  "/:id/reject",
  authMiddleware,
  requireRole("admin"),
  rejectLeave
);

router.get(
  "/substitutions",
  authMiddleware,
  requireRole("admin"),
  getSubstitutions
);

// Admin: free teachers for a specific substitution slot
router.get(
  "/substitutions/:subId/free-teachers",
  authMiddleware,
  requireRole("admin"),
  getFreeTeachersForSubstitution
);

// Admin: assign / unassign substitute teacher for a specific substitution slot
router.patch(
  "/substitutions/:subId/assign",
  authMiddleware,
  requireRole("admin"),
  assignSubstituteTeacher
);

module.exports = router;
