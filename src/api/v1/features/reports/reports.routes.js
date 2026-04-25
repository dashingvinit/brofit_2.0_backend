const express = require("express");
const reportsController = require("./controllers/reports.controller");
const requireInternalSecret = require("../../../../shared/middlewares/requireInternalSecret");

const router = express.Router();

// POST /api/v1/reports/expire-subscriptions
// Expires stale memberships/trainings and deactivates members with no active subs.
// Protected: requires x-cron-secret header matching CRON_SECRET env var.
router.post("/expire-subscriptions", requireInternalSecret, reportsController.expireSubscriptions);

// POST /api/v1/reports/sync-expirations
// Manually trigger expiration for the authenticated org (e.g. from admin UI).
// Protected by Clerk auth (requireOrgId in controller).
router.post("/sync-expirations", reportsController.syncExpirations);

// GET /api/v1/reports/inactive-candidates
// Members marked active but with no active memberships or trainings
router.get("/inactive-candidates", reportsController.getInactiveCandidates);

// GET /api/v1/reports/dues
// All members with outstanding dues, with summary totals
router.get("/dues", reportsController.getDuesReport);

// GET /api/v1/reports/activity-trend?days=30
// Daily member activity snapshots for charting (populated by cron)
router.get("/activity-trend", reportsController.getActivityTrend);

// GET /api/v1/reports/duplicates
// Potential duplicate members identified by phone number
router.get("/duplicates", reportsController.getDuplicates);

module.exports = router;
