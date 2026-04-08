const notificationsRepository = require("../repositories/notifications.repository");
const { sendWhatsApp, sendWhatsAppBulk, sendWelcomeTemplate, sendRenewalTemplate, sendDuesTemplate, getTwilioClient, DEFAULT_WELCOME_MESSAGE } = require("../../../../../shared/services/whatsapp.service");
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

    if (!config.twilio.welcomeTemplateSid) {
      throw Object.assign(new Error("TWILIO_WELCOME_TEMPLATE_SID is not configured. Add it to your .env to send template messages."), { statusCode: 502 });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const gymName = org?.name || "Our Gym";

    // Send the welcome template (not free-form) — free-form requires the member to have
    // first replied to a template message, which the owner may not have done yet.
    const sid = await sendWelcomeTemplate(settings.ownerWhatsapp, {
      memberName: "Owner",
      gymName,
    });

    if (!sid) {
      throw Object.assign(new Error("Failed to send. Check your Twilio credentials and template SID."), { statusCode: 502 });
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
   * Send the welcome template to all active members who haven't received it yet.
   * Skips members where welcomeSentAt is already set.
   * Rate limited to 60 messages/sec (safe under Twilio's 80/sec limit).
   * Stamps welcomeSentAt on each successful send.
   * Returns { sent, failed, skipped } counts.
   */
  async sendWelcomeToAll(orgId) {
    const client = getTwilioClient();
    if (!client) {
      throw Object.assign(new Error("Twilio is not configured on the server (missing credentials in .env)."), { statusCode: 502 });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const gymName = org?.name || "Our Gym";

    // Only members who haven't been sent the welcome message yet
    const members = await prisma.member.findMany({
      where: { orgId, isActive: true, welcomeSentAt: null, NOT: { phone: "" } },
      select: { id: true, firstName: true, phone: true },
    });

    let sent = 0;
    let failed = 0;
    const DELAY_MS = Math.ceil(1000 / 60); // 60 messages/sec — safe under 80/sec limit

    // Build the statusCallback URL so Twilio posts delivery confirmations back to us.
    // When set, welcomeSentAt is stamped by the webhook on confirmed delivery, not here.
    // Falls back to stamping here (optimistic) when no PUBLIC_API_URL is configured.
    const statusCallbackUrl = config.server.publicUrl
      ? `${config.server.publicUrl}/api/v1/webhooks/whatsapp/status`
      : null;

    for (const member of members) {
      const sid = await sendWelcomeTemplate(member.phone, {
        memberName: member.firstName,
        gymName,
        statusCallbackUrl,
      });

      if (sid) {
        sent++;
        if (!statusCallbackUrl) {
          // No webhook configured — stamp optimistically (best-effort)
          await prisma.member.update({
            where: { id: member.id },
            data: { welcomeSentAt: new Date() },
          });
        }
        // When statusCallbackUrl is set, the webhook stamps welcomeSentAt on delivery
      } else {
        failed++;
      }
      // Rate limit: wait between each send
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    return { sent, failed, total: members.length };
  }

  /**
   * Send the welcome template to a specific phone number for testing.
   */
  async sendWelcomeTest(orgId, phone) {
    if (!phone) {
      throw Object.assign(new Error("Phone number is required."), { statusCode: 400 });
    }
    const client = getTwilioClient();
    if (!client) {
      throw Object.assign(new Error("Twilio is not configured on the server (missing credentials in .env)."), { statusCode: 502 });
    }
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const gymName = org?.name || "Our Gym";
    const sid = await sendWelcomeTemplate(phone, { memberName: "Test", gymName });
    if (!sid) {
      throw Object.assign(new Error("Failed to send. Check your Twilio credentials and template SID."), { statusCode: 502 });
    }
    return { sent: true, to: phone };
  }

  /**
   * Returns a breakdown of members by WhatsApp welcome status.
   */
  async getWelcomeStatus(orgId) {
    const [notSent, sentNotOptedIn, optedIn] = await Promise.all([
      // Never received the welcome message
      prisma.member.count({ where: { orgId, isActive: true, welcomeSentAt: null } }),
      // Received welcome but haven't replied YES yet
      prisma.member.count({ where: { orgId, isActive: true, welcomeSentAt: { not: null }, whatsappOptedIn: false } }),
      // Replied YES — fully opted in
      prisma.member.count({ where: { orgId, isActive: true, whatsappOptedIn: true } }),
    ]);

    return { notSent, sentNotOptedIn, optedIn, total: notSent + sentNotOptedIn + optedIn };
  }

  /**
   * Manually ping a single member via WhatsApp.
   * - If they have pending dues → sends dues reminder template
   * - If they have no active membership → sends renewal reminder template (with "expired" framing)
   * - If they have an active membership expiring soon → sends renewal reminder template
   * type: "dues" | "no-subscription" — passed from the frontend so we know which card triggered it
   */
  async pingMember(orgId, memberId, type) {
    const client = getTwilioClient();
    if (!client) {
      throw Object.assign(new Error("Twilio is not configured on the server."), { statusCode: 502 });
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, orgId },
      select: {
        id: true, firstName: true, phone: true,
        payments: {
          where: { status: "pending", orgId },
          select: { amount: true },
        },
        memberships: {
          where: { orgId, status: { in: ["active", "expired"] } },
          orderBy: { endDate: "desc" },
          take: 1,
          select: {
            endDate: true, status: true,
            planVariant: { select: { planType: { select: { name: true } } } },
          },
        },
      },
    });

    if (!member) {
      throw Object.assign(new Error("Member not found."), { statusCode: 404 });
    }
    if (!member.phone) {
      throw Object.assign(new Error("Member has no phone number."), { statusCode: 400 });
    }

    if (type === "dues") {
      const totalDue = member.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (totalDue <= 0) {
        throw Object.assign(new Error("Member has no pending dues."), { statusCode: 400 });
      }
      const sid = await sendDuesTemplate(member.phone, {
        memberName: member.firstName,
        amount: `₹${totalDue.toLocaleString("en-IN")}`,
      });
      if (!sid) throw Object.assign(new Error("Failed to send. Check TWILIO_DUES_TEMPLATE_SID."), { statusCode: 502 });
      return { sent: true, type: "dues" };
    }

    // type === "no-subscription" — use renewal template with days=0 to signal lapsed
    const lastMembership = member.memberships[0];
    const planName = lastMembership?.planVariant?.planType?.name ?? "membership";
    const expiryDate = lastMembership
      ? new Date(lastMembership.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—";
    const daysLeft = lastMembership ? Math.ceil((new Date(lastMembership.endDate) - new Date()) / 86400000) : 0;

    const sid = await sendRenewalTemplate(member.phone, {
      memberName: member.firstName,
      planName,
      daysLeft: daysLeft < 0 ? 0 : daysLeft,
      expiryDate,
    });
    if (!sid) throw Object.assign(new Error("Failed to send. Check TWILIO_RENEWAL_TEMPLATE_SID."), { statusCode: 502 });
    return { sent: true, type: "no-subscription" };
  }

  /**
   * Reset welcomeSentAt to null so members can receive the welcome message again.
   * If memberIds is provided, only resets those specific members.
   * If memberIds is omitted, resets ALL members in the org (full retry).
   */
  async resetWelcome(orgId, memberIds = null) {
    const where = memberIds?.length
      ? { orgId, id: { in: memberIds } }
      : { orgId };

    const result = await prisma.member.updateMany({
      where,
      data: { welcomeSentAt: null },
    });

    return { reset: result.count };
  }

  /**
   * Returns the default welcome message template for display in the UI.
   */
  getDefaultWelcomeMessage() {
    return DEFAULT_WELCOME_MESSAGE;
  }
}

module.exports = new NotificationsService();
