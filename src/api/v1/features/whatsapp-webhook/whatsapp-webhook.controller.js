const { prisma } = require("../../../../config/prisma.config");
const { formatPhone } = require("../../../../shared/services/whatsapp.service");
const twilio = require("twilio");
const config = require("../../../../config/env.config");

class WhatsappWebhookController {
  /**
   * Handles inbound WhatsApp messages from Twilio.
   * When a member replies "YES", mark them as opted in for free-form messages.
   * Twilio sends form-encoded POST with Body, From, etc.
   */
  handleInbound = async (req, res) => {
    // Validate the request is genuinely from Twilio
    if (config.isProduction()) {
      const twilioSignature = req.headers["x-twilio-signature"];
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const isValid = twilio.validateRequest(
        config.twilio.authToken,
        twilioSignature,
        url,
        req.body,
      );
      if (!isValid) {
        return res.status(403).send("Forbidden");
      }
    }

    const from = req.body?.From; // e.g. "whatsapp:+919876543210"
    const body = (req.body?.Body || "").trim().toUpperCase();

    if (!from) {
      return res.status(200).send("<Response></Response>");
    }

    // Normalise the phone number to match how it's stored in the DB
    const rawPhone = from.replace(/^whatsapp:/, "");
    const normalised = formatPhone(rawPhone); // e.g. "+919876543210"

    if (body === "YES") {
      try {
        // Match by last 10 digits to handle formatting variations
        const last10 = normalised.replace(/\D/g, "").slice(-10);
        await prisma.member.updateMany({
          where: {
            phone: { endsWith: last10 },
            whatsappOptedIn: false,
          },
          data: { whatsappOptedIn: true },
        });
        console.log(`[WhatsApp] Opted in: ${normalised}`);
      } catch (err) {
        console.error("[WhatsApp] Failed to update opt-in:", err.message);
      }
    }

    // Always respond with empty TwiML so Twilio doesn't retry
    res.set("Content-Type", "text/xml");
    res.status(200).send("<Response></Response>");
  };
}

module.exports = new WhatsappWebhookController();
