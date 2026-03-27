const twilio = require("twilio");
const config = require("../../config/env.config");

const DEFAULT_WELCOME_MESSAGE = `Welcome to our gym! 🏋️

We're thrilled to have you with us. Here are a few things to keep in mind:

📌 *Gym Rules & Etiquette*
  • Please carry a towel and wipe down equipment after use.
  • Return weights and equipment to their proper place.
  • Avoid using your phone during sets — be mindful of others waiting.
  • Appropriate gym attire is required at all times.
  • Respect fellow members' space and focus.

💡 *Tips to get started*
  • Don't hesitate to ask our trainers for guidance.
  • Stay hydrated — bring a water bottle.
  • Start light and build up — consistency is key!

We're here to help you crush your goals. Let's get to work! 💪

_Brofit 2.0_`;

function getTwilioClient() {
  if (!config.twilio.accountSid || !config.twilio.authToken) return null;
  return twilio(config.twilio.accountSid, config.twilio.authToken);
}

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/**
 * Send a single WhatsApp message. Returns true on success, false on failure.
 * Never throws — failures are logged and swallowed so callers aren't interrupted.
 */
async function sendWhatsApp(toPhone, body) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[WhatsApp] Twilio not configured — message skipped.");
    return false;
  }

  try {
    await client.messages.create({
      from: config.twilio.whatsappFrom,
      to: `whatsapp:${formatPhone(toPhone)}`,
      body,
    });
    return true;
  } catch (err) {
    console.error(`[WhatsApp] Failed to send to ${toPhone}:`, err.message);
    return false;
  }
}

/**
 * Send to multiple recipients. Returns { sent, failed } counts.
 */
async function sendWhatsAppBulk(recipients, buildMessage) {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const body = typeof buildMessage === "function" ? buildMessage(recipient) : buildMessage;
    const ok = await sendWhatsApp(recipient.phone, body);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed };
}

module.exports = {
  getTwilioClient,
  formatPhone,
  sendWhatsApp,
  sendWhatsAppBulk,
  DEFAULT_WELCOME_MESSAGE,
};
