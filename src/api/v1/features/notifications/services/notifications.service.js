const notificationsRepository = require("../repositories/notifications.repository");
const { sendWhatsApp, sendWhatsAppBulk, getTwilioClient, formatPhone, DEFAULT_WELCOME_MESSAGE } = require("../../../../../shared/services/whatsapp.service");
const { prisma } = require("../../../../../config/prisma.config");
const config = require("../../../../../config/env.config");

const ALLOWED_SETTINGS_FIELDS = [
  "ownerWhatsapp",
  "digestEnabled",
  "memberReminderEnabled",
  "reminderDaysBefore",
  "welcomeEnabled",
  "welcomeMessage",
  "duesReminderEnabled",
  "duesReminderDaysOld",
];

class NotificationsService {
  async getSettings(orgId) {
    const settings = await notificationsRepository.getSettings(orgId);
    return settings ?? {
      orgId,
      ownerWhatsapp: null,
      digestEnabled: false,
      memberReminderEnabled: false,
      reminderDaysBefore: 3,
      welcomeEnabled: false,
      welcomeMessage: null,
      duesReminderEnabled: false,
      duesReminderDaysOld: 7,
    };
  }

  async updateSettings(orgId, data) {
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => ALLOWED_SETTINGS_FIELDS.includes(k))
    );
    return notificationsRepository.upsertSettings(orgId, filtered);
  }

  /**
   * Send a test WhatsApp message to the owner's configured number.
   * Throws with the real Twilio error so the frontend can show it.
   */
  async sendTestMessage(orgId) {
    const settings = await notificationsRepository.getSettings(orgId);
    if (!settings?.ownerWhatsapp) {
      throw Object.assign(new Error("No owner WhatsApp number configured."), { statusCode: 400 });
    }

    const client = getTwilioClient();
    if (!client) {
      throw Object.assign(new Error("Twilio is not configured on the server (missing credentials in .env)."), { statusCode: 502 });
    }

    const body =
      `✅ *Brofit 2.0 — Test Message*\n\n` +
      `WhatsApp notifications are working correctly for your gym.\n\n` +
      `_Powered by Brofit 2.0_`;

    try {
      await client.messages.create({
        from: config.twilio.whatsappFrom,
        to: `whatsapp:${formatPhone(settings.ownerWhatsapp)}`,
        body,
      });
    } catch (err) {
      // Twilio RestException — surface the real reason as a 400 so it reaches the frontend
      const twilioMsg = err.message ?? "Unknown Twilio error";
      throw Object.assign(new Error(`Twilio: ${twilioMsg}`), { statusCode: 400 });
    }

    return { sent: true };
  }

  /**
   * Broadcast a message to a filtered set of members.
   * filter: "all" | "active" | "expiring"
   */
  async broadcastMessage(orgId, { message, filter = "active" }) {
    if (!message?.trim()) {
      throw Object.assign(new Error("Message body is required."), { statusCode: 400 });
    }

    let members = [];

    if (filter === "expiring") {
      // Members whose active membership expires in the next 7 days
      const expiring = await notificationsRepository.getMembersExpiringSoon(orgId, 7);
      members = expiring
        .map((m) => ({ id: m.memberId, phone: m.member.phone, firstName: m.member.firstName, whatsappOptedIn: m.member.whatsappOptedIn }))
        .filter((m) => m.phone);
    } else {
      // "all" or "active" — query members directly
      const whereClause = {
        orgId,
        ...(filter === "active" ? { isActive: true } : {}),
      };
      const rows = await prisma.member.findMany({
        where: whereClause,
        select: { id: true, phone: true, firstName: true, whatsappOptedIn: true },
      });
      members = rows.filter((m) => m.phone);
    }

    // Deduplicate by phone
    const seen = new Set();
    const unique = members.filter((m) => {
      if (seen.has(m.phone)) return false;
      seen.add(m.phone);
      return true;
    });

    const result = await sendWhatsAppBulk(unique, (m) =>
      message.trim().replace(/\{name\}/gi, m.firstName)
    );

    return { ...result, total: unique.length };
  }

  /**
   * Returns the default welcome message template for display in the UI.
   */
  getDefaultWelcomeMessage() {
    return DEFAULT_WELCOME_MESSAGE;
  }
}

module.exports = new NotificationsService();
