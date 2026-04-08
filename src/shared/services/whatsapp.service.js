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
 *
 * IMPORTANT: Twilio returns HTTP 201 (accepted) even when a template is not yet approved.
 * The real delivery failure arrives asynchronously via statusCallback webhook.
 * Callers should NOT stamp welcomeSentAt on this return value alone if accuracy matters —
 * instead rely on the statusCallback webhook to stamp on confirmed delivery.
 *
 * Returns the Twilio message SID on success, null on failure. Never throws.
 */
async function sendWelcomeTemplate(toPhone, { memberName, gymName, statusCallbackUrl = null }) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[WhatsApp] Twilio not configured — welcome template skipped.");
    return null;
  }

  if (!config.twilio.welcomeTemplateSid) {
    console.warn("[WhatsApp] TWILIO_WELCOME_TEMPLATE_SID not set — welcome template skipped.");
    return null;
  }

  try {
    const payload = {
      to: `whatsapp:${formatPhone(toPhone)}`,
      contentSid: config.twilio.welcomeTemplateSid,
      contentVariables: JSON.stringify({ 1: memberName, 2: gymName }),
    };

    // contentSid requires a Messaging Service SID — cannot use a bare `from` number
    if (config.twilio.messagingServiceSid) {
      payload.messagingServiceSid = config.twilio.messagingServiceSid;
    } else {
      payload.from = config.twilio.whatsappFrom;
    }

    if (statusCallbackUrl) {
      payload.statusCallback = statusCallbackUrl;
    }

    const message = await client.messages.create(payload);
    return message.sid;
  } catch (err) {
    console.error(`[WhatsApp] Failed to send welcome template to ${toPhone}:`, err.message);
    return null;
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

/**
 * Send a renewal reminder template to a member.
 * Variables: {{1}} = member first name, {{2}} = plan name, {{3}} = days until expiry, {{4}} = expiry date
 * Returns the message SID on success, null on failure. Never throws.
 */
async function sendRenewalTemplate(toPhone, { memberName, planName, daysLeft, expiryDate }) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[WhatsApp] Twilio not configured — renewal template skipped.");
    return null;
  }

  if (!config.twilio.renewalTemplateSid) {
    console.warn("[WhatsApp] TWILIO_RENEWAL_TEMPLATE_SID not set — renewal template skipped.");
    return null;
  }

  try {
    const payload = {
      to: `whatsapp:${formatPhone(toPhone)}`,
      contentSid: config.twilio.renewalTemplateSid,
      contentVariables: JSON.stringify({ 1: memberName, 2: planName, 3: String(daysLeft), 4: expiryDate }),
    };

    if (config.twilio.messagingServiceSid) {
      payload.messagingServiceSid = config.twilio.messagingServiceSid;
    } else {
      payload.from = config.twilio.whatsappFrom;
    }

    const message = await client.messages.create(payload);
    return message.sid;
  } catch (err) {
    console.error(`[WhatsApp] Failed to send renewal template to ${toPhone}:`, err.message);
    return null;
  }
}

/**
 * Send a dues reminder template to a member.
 * Variables: {{1}} = member first name, {{2}} = amount (formatted)
 * Returns the message SID on success, null on failure. Never throws.
 */
async function sendDuesTemplate(toPhone, { memberName, amount }) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[WhatsApp] Twilio not configured — dues template skipped.");
    return null;
  }

  if (!config.twilio.duesTemplateSid) {
    console.warn("[WhatsApp] TWILIO_DUES_TEMPLATE_SID not set — dues template skipped.");
    return null;
  }

  try {
    const payload = {
      to: `whatsapp:${formatPhone(toPhone)}`,
      contentSid: config.twilio.duesTemplateSid,
      contentVariables: JSON.stringify({ 1: memberName, 2: amount }),
    };

    if (config.twilio.messagingServiceSid) {
      payload.messagingServiceSid = config.twilio.messagingServiceSid;
    } else {
      payload.from = config.twilio.whatsappFrom;
    }

    const message = await client.messages.create(payload);
    return message.sid;
  } catch (err) {
    console.error(`[WhatsApp] Failed to send dues template to ${toPhone}:`, err.message);
    return null;
  }
}

module.exports = {
  getTwilioClient,
  formatPhone,
  sendWhatsApp,
  sendWelcomeTemplate,
  sendRenewalTemplate,
  sendDuesTemplate,
  sendWhatsAppBulk,
  DEFAULT_WELCOME_MESSAGE,
};
