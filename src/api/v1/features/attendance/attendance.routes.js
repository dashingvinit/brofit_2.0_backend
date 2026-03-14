const express = require("express");
const attendanceController = require("./controllers/attendance.controller");

const router = express.Router();

/**
 * Attendance Routes
 * Base path: /api/v1/attendance
 */

// Static routes first (before /:id)
router.get("/inside", attendanceController.getCurrentlyInside);
router.get("/stats", attendanceController.getTodayStats);
router.get("/member/:memberId", attendanceController.getMemberHistory);

// Date-filtered list: GET /api/v1/attendance?date=YYYY-MM-DD
router.get("/", attendanceController.getByDate);

// Check in
router.post("/check-in", attendanceController.checkIn);

// Check out by attendance record ID
router.patch("/:id/check-out", attendanceController.checkOut);

module.exports = router;
