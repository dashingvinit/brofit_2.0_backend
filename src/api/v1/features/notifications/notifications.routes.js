const express = require("express");
const notificationsController = require("./controllers/notifications.controller");

const router = express.Router();

// GET /notifications/inbox
router.get("/inbox", notificationsController.getInbox);

// GET /notifications/settings
router.get("/settings", notificationsController.getSettings);

// PATCH /notifications/settings
router.patch("/settings", notificationsController.updateSettings);

// POST /notifications/test — sends a test WhatsApp to the owner's configured number
router.post("/test", notificationsController.sendTestMessage);

// POST /notifications/broadcast — sends a message to a filtered set of members
router.post("/broadcast", notificationsController.broadcast);

// POST /notifications/run-digest — manually trigger the WhatsApp digest job (for testing)
router.post("/run-digest", notificationsController.runDigest);

// GET /notifications/default-welcome — returns the default welcome message template
router.get("/default-welcome", notificationsController.getDefaultWelcomeMessage);

module.exports = router;
