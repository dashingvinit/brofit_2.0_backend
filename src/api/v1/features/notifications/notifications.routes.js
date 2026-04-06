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

// POST /notifications/send-welcome-all — send welcome template to all members who haven't received it yet
router.post("/send-welcome-all", notificationsController.sendWelcomeToAll);

// GET /notifications/welcome-status — breakdown of members by welcome sent / opted in / pending
router.get("/welcome-status", notificationsController.getWelcomeStatus);

// POST /notifications/send-welcome-test — send welcome template to a specific phone number
router.post("/send-welcome-test", notificationsController.sendWelcomeTest);

module.exports = router;
