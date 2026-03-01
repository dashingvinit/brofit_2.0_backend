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

module.exports = router;
