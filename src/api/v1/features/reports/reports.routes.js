const express = require("express");
const reportsController = require("./controllers/reports.controller");

const router = express.Router();

// POST /api/v1/reports/expire-subscriptions
// Expires stale memberships/trainings and deactivates members with no active subs
router.post("/expire-subscriptions", reportsController.expireSubscriptions);

// GET /api/v1/reports/inactive-candidates
// Members marked active but with no active memberships or trainings
router.get("/inactive-candidates", reportsController.getInactiveCandidates);

// GET /api/v1/reports/dues
// All members with outstanding dues, with summary totals
router.get("/dues", reportsController.getDuesReport);

// GET /api/v1/reports/activity-trend?days=30
// Daily member activity snapshots for charting (populated by cron)
router.get("/activity-trend", reportsController.getActivityTrend);

module.exports = router;
