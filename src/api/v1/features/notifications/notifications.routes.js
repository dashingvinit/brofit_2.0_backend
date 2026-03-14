const express = require("express");
const notificationsController = require("./controllers/notifications.controller");

const router = express.Router();

// GET /notifications/inbox
router.get("/inbox", notificationsController.getInbox);

// GET /notifications/settings
router.get("/settings", notificationsController.getSettings);

// PATCH /notifications/settings
router.patch("/settings", notificationsController.updateSettings);

module.exports = router;
