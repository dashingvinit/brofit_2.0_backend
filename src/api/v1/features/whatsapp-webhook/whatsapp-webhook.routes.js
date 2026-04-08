const express = require("express");
const router = express.Router();
const whatsappWebhookController = require("./whatsapp-webhook.controller");

// POST /api/v1/webhooks/whatsapp
// Called by Twilio when a member replies to a WhatsApp message
router.post("/", whatsappWebhookController.handleInbound);

// POST /api/v1/webhooks/whatsapp/status
// Called by Twilio with message delivery status (delivered/failed/undelivered)
router.post("/status", whatsappWebhookController.handleStatusCallback);

module.exports = router;
