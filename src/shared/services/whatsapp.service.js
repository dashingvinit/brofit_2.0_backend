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
 * Send a welcome template message to a new member.
 * Uses Twilio Content Template API so it works in production (not just sandbox).
 * Variables: {{1}} = member first name, {{2}} = gym/org name
 * Returns true on success, false on failure. Never throws.
 */
async function sendWelcomeTemplate(toPhone, { memberName, gymName }) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[WhatsApp] Twilio not configured — welcome template skipped.");
    return false;
  }

  if (!config.twilio.welcomeTemplateSid) {
    console.warn("[WhatsApp] TWILIO_WELCOME_TEMPLATE_SID not set — welcome template skipped.");
    return false;
  }

  try {
    await client.messages.create({
      from: config.twilio.whatsappFrom,
      to: `whatsapp:${formatPhone(toPhone)}`,
      contentSid: config.twilio.welcomeTemplateSid,
      contentVariables: JSON.stringify({ 1: memberName, 2: gymName }),
    });
    return true;
  } catch (err) {
    console.error(`[WhatsApp] Failed to send welcome template to ${toPhone}:`, err.message);
    return false;
  }
}

/**
 * Send a single free-form WhatsApp message. Returns true on success, false on failure.
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
 * Send to multiple recipients. Skips members who have not opted in (whatsappOptedIn = false).
 * Returns { sent, failed, skipped } counts.
 */
async function sendWhatsAppBulk(recipients, buildMessage) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    // Skip members who haven't replied YES to the welcome template
    if (recipient.whatsappOptedIn === false) {
      skipped++;
      continue;
    }

    const body = typeof buildMessage === "function" ? buildMessage(recipient) : buildMessage;
    const ok = await sendWhatsApp(recipient.phone, body);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed, skipped };
}

module.exports = {
  getTwilioClient,
  formatPhone,
  sendWhatsApp,
  sendWelcomeTemplate,
  sendWhatsAppBulk,
  DEFAULT_WELCOME_MESSAGE,
};
